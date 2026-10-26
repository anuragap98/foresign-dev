-- Phase 2: agents connect to Pane.
--
-- Agents never sign in. They send a per-project token to the `agent` Edge
-- Function, which checks it here (agent_auth) and then works with the service
-- role, limited to the token's project. People create and revoke tokens and
-- decide gates through the functions below; token hashes never reach the browser.

-- ------------------------------------------------------------- tokens

-- A one-minute window per token for rate limiting.
alter table agent_tokens
  add column window_start timestamptz not null default now(),
  add column window_count int not null default 0;

-- Runs remember the token that opened them, so later calls without a run id
-- land on the agent's current run (hooks, telemetry and MCP calls meet there).
alter table runs
  add column token_id uuid references agent_tokens on delete set null,
  -- Set once telemetry reports usage, so an agent's own report_usage doesn't count it twice.
  add column usage_from_telemetry boolean not null default false;
create index on runs (token_id, started_at desc);

-- Pre/PostToolUse pairs share a span id, so the second one can close the first.
alter table run_events add column span_id text;
create index on run_events (run_id, span_id) where span_id is not null;

-- The gate a task is waiting on (its plan gate, or a merge gate for its PR).
alter table tasks add column gate_id uuid references gates on delete set null;

-- Replayed agent calls return the first response.
create table agent_requests (
  token_id uuid not null references agent_tokens on delete cascade,
  key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (token_id, key)
);
-- Server only: no policies, so nobody signed in can read or write it.
alter table agent_requests enable row level security;

-- Agent names are unique per workspace, so hooks firing in parallel find one actor.
create unique index actors_agent_name on actors (workspace_id, lower(name)) where kind = 'agent';

-- Finds an agent by name in a workspace, or creates it, and adds it to the project.
create function ensure_agent(p_workspace uuid, p_project uuid, p_name text, p_runtime text, p_role text default 'Agent')
returns uuid
language plpgsql security definer set search_path = public as $$
declare agent uuid;
begin
  insert into actors (workspace_id, kind, name, role, hue, runtime, agent_status, presence)
  values (p_workspace, 'agent', trim(p_name), p_role, 'orange', p_runtime, 'offline', 'away')
  on conflict (workspace_id, lower(name)) where kind = 'agent' do nothing;
  select id into agent from actors
  where workspace_id = p_workspace and kind = 'agent' and lower(name) = lower(trim(p_name));
  insert into project_members (workspace_id, project_id, actor_id)
  values (p_workspace, p_project, agent) on conflict do nothing;
  return agent;
end $$;

-- Creates a token for a project and returns it once, in plain text.
create function create_agent_token(
  p_project uuid,
  p_label text,
  p_agent_name text default 'Claude Code',
  p_runtime text default 'claude-code'
) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  ws uuid;
  agent uuid;
  secret text;
  tid uuid;
begin
  select workspace_id into ws from projects where id = p_project;
  if ws is null or not is_member(ws) then
    raise exception 'Project not found' using errcode = '42501';
  end if;
  if coalesce(trim(p_label), '') = '' or coalesce(trim(p_agent_name), '') = '' then
    raise exception 'Give the token a label and an agent name' using errcode = '22023';
  end if;

  agent := ensure_agent(ws, p_project, p_agent_name, p_runtime);
  secret := 'pane_' || encode(gen_random_bytes(24), 'hex');
  insert into agent_tokens (workspace_id, project_id, agent_id, label, token_hash, created_by)
  values (ws, p_project, agent, trim(p_label), encode(digest(secret, 'sha256'), 'hex'), my_actor(ws))
  returning id into tid;

  return json_build_object('id', tid, 'token', secret, 'agent_id', agent);
end $$;

create function revoke_agent_token(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update agent_tokens set revoked_at = now()
  where id = p_token and revoked_at is null and is_member(workspace_id);
  if not found then
    raise exception 'Token not found' using errcode = '42501';
  end if;
end $$;

-- Checks a token hash and counts the call against its one-minute window.
-- Called by the Edge Function with the service role only.
create function agent_auth(p_hash text, p_limit int default 1200)
returns table (token_id uuid, workspace_id uuid, project_id uuid, agent_id uuid, allowed boolean)
language sql security definer set search_path = public as $$
  update agent_tokens t set
    last_used_at = now(),
    window_start = case when t.window_start < now() - interval '1 minute' then now() else t.window_start end,
    window_count = case when t.window_start < now() - interval '1 minute' then 1 else t.window_count + 1 end
  where t.token_hash = p_hash and t.revoked_at is null
  returning t.id, t.workspace_id, t.project_id, t.agent_id, t.window_count <= p_limit
$$;

-- Adds usage to a run in one statement, so concurrent reports don't overwrite each other.
create function add_run_usage(
  p_run uuid, p_in bigint, p_out bigint, p_cost numeric, p_model text default null, p_telemetry boolean default false
) returns void
language sql security definer set search_path = public as $$
  update runs set
    tokens_in = tokens_in + greatest(p_in, 0),
    tokens_out = tokens_out + greatest(p_out, 0),
    cost_usd = cost_usd + greatest(p_cost, 0),
    model = coalesce(p_model, model),
    usage_from_telemetry = usage_from_telemetry or p_telemetry
  where id = p_run
$$;

revoke execute on function agent_auth(text, int) from public, anon, authenticated;
revoke execute on function ensure_agent(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke execute on function add_run_usage(uuid, bigint, bigint, numeric, text, boolean) from public, anon, authenticated;
revoke execute on function create_agent_token(uuid, text, text, text) from public, anon;
revoke execute on function revoke_agent_token(uuid) from public, anon;
grant execute on function create_agent_token(uuid, text, text, text) to authenticated;
grant execute on function revoke_agent_token(uuid) to authenticated;

-- -------------------------------------------------------------- gates

-- People decide gates here, never by editing the row: the decision is recorded
-- as the signed-in person, and the tasks and runs waiting on it move on.
create function decide_gate(p_gate uuid, p_status gate_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  g gates;
  me uuid;
  verb text;
begin
  select * into g from gates where id = p_gate for update;
  if g.id is null or not is_member(g.workspace_id) then
    raise exception 'Gate not found' using errcode = '42501';
  end if;
  me := my_actor(g.workspace_id);
  if me is null or (select kind from actors where id = me) <> 'person' then
    raise exception 'Only people can decide gates' using errcode = '42501';
  end if;
  if g.status <> 'pending' then
    raise exception 'This gate was already decided' using errcode = '22023';
  end if;
  if p_status = 'pending' then
    raise exception 'Choose approve, request changes or reject' using errcode = '22023';
  end if;

  update gates set status = p_status, decided_by = me, decided_at = now(), note = nullif(trim(p_note), '')
  where id = p_gate;

  if g.kind = 'plan' then
    -- An approved plan opens its tasks for work. Otherwise they wait for the agent's revision.
    if p_status = 'approved' then
      update tasks set status = 'todo', gate_id = null where gate_id = p_gate and status = 'awaiting_approval';
    end if;
  else
    update tasks set
      status = case p_status when 'approved' then 'review' when 'changes_requested' then 'doing' else 'blocked' end::task_status,
      gate_id = null
    where gate_id = p_gate and status = 'awaiting_approval';
  end if;

  update runs set status = 'running' where id = g.requested_by_run and status = 'waiting';

  verb := case p_status when 'approved' then 'approved' when 'changes_requested' then 'asked for changes to' else 'rejected' end;
  insert into activity (workspace_id, project_id, actor_id, text)
  values (g.workspace_id, g.project_id, me, verb || ' “' || g.title || '”');
end $$;

revoke execute on function decide_gate(uuid, gate_status, text) from public, anon;
grant execute on function decide_gate(uuid, gate_status, text) to authenticated;

-- Gate rows change only through decide_gate and the Edge Function now.
drop policy "decide gates as yourself" on gates;
drop policy "members raise gates" on gates;
