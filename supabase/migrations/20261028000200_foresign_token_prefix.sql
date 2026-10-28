-- The product is now Foresign: new agent tokens start with "foresign_".
-- Tokens are matched by their hash, so existing "pane_" tokens keep working.

create or replace function create_agent_token(
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
  secret := 'foresign_' || encode(gen_random_bytes(24), 'hex');
  insert into agent_tokens (workspace_id, project_id, agent_id, label, token_hash, created_by)
  values (ws, p_project, agent, trim(p_label), encode(digest(secret, 'sha256'), 'hex'), my_actor(ws))
  returning id into tid;

  return json_build_object('id', tid, 'token', secret, 'agent_id', agent);
end $$;
