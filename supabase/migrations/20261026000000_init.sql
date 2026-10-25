-- Pane: agent-ready workspace schema.
--
-- People and agents are both "actors", so anything with a "who" (assignee,
-- creator, comment author, activity, gate decision) points at actors.
-- Every table carries workspace_id so row level security is one rule:
-- you can touch a row if you are a member of its workspace.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ enums

create type actor_kind as enum ('person', 'agent');
create type member_role as enum ('owner', 'admin', 'member');
create type task_status as enum ('todo', 'doing', 'review', 'done', 'blocked', 'failed', 'awaiting_approval');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_source as enum ('human', 'agent');
create type project_status as enum ('planning', 'progress', 'review', 'shipped');
create type event_kind as enum ('meeting', 'focus', 'review', 'deadline', 'team');
create type run_status as enum ('running', 'waiting', 'succeeded', 'failed', 'cancelled');
create type run_event_type as enum ('tool_call', 'command', 'file_edit', 'message', 'error', 'note');
create type artifact_kind as enum ('branch', 'commit', 'pull_request', 'test_report', 'deploy', 'doc');
create type gate_kind as enum ('plan', 'merge', 'deploy', 'custom');
create type gate_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type notice_kind as enum ('mention', 'review', 'update', 'reminder', 'gate', 'failure');

-- ------------------------------------------------------------ workspaces

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table actors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  kind actor_kind not null,
  -- Set for people who can sign in; null for teammates who haven't yet and for agents.
  user_id uuid references auth.users on delete set null,
  name text not null,
  email text,
  role text not null default '',
  team text,
  hue text not null default 'blue',
  presence text not null default 'online',
  presence_note text,
  city text,
  tz text not null default 'UTC',
  capacity_h numeric not null default 32,
  focus_week_h numeric not null default 0,
  -- Agents only
  runtime text,
  model text,
  agent_status text,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on actors (workspace_id);

create table memberships (
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  actor_id uuid not null references actors on delete cascade,
  role member_role not null default 'member',
  primary key (workspace_id, user_id)
);
create index on memberships (user_id);

-- -------------------------------------------------------------- projects

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  summary text not null default '',
  goal text not null default '',
  repo_url text,
  lead_id uuid references actors on delete set null,
  hue text not null default 'blue',
  icon text not null default 'folder',
  status project_status not null default 'planning',
  started date not null default current_date,
  due date not null,
  gates jsonb not null default '{"plan": true, "merge": true, "deploy": false}',
  budget_tokens bigint,
  budget_usd numeric(12, 2),
  created_at timestamptz not null default now()
);
create index on projects (workspace_id);

create table project_members (
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  actor_id uuid not null references actors on delete cascade,
  primary key (project_id, actor_id)
);

-- Pins are personal: each person chooses what shows in their sidebar.
create table project_pins (
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (project_id, user_id)
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  title text not null,
  date date not null,
  done boolean not null default false
);
create index on milestones (project_id);

-- ----------------------------------------------------------------- tasks

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  parent_task_id uuid references tasks on delete set null,
  title text not null,
  description text not null default '',
  acceptance_criteria text not null default '',
  assignee_id uuid references actors on delete set null,
  created_by uuid references actors on delete set null,
  source task_source not null default 'human',
  priority task_priority not null default 'medium',
  status task_status not null default 'todo',
  due date not null,
  est_h numeric not null default 2,
  -- Board order within a column; new positions go halfway between neighbours.
  position double precision not null default 0,
  attempts int not null default 0,
  -- Lets an agent retry a call without creating the task twice.
  external_ref text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  unique (project_id, external_ref)
);
create index on tasks (workspace_id);
create index on tasks (project_id, status, position);
create index on tasks (assignee_id) where status <> 'done';

create table task_dependencies (
  workspace_id uuid not null references workspaces on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  depends_on_id uuid not null references tasks on delete cascade,
  primary key (task_id, depends_on_id),
  check (task_id <> depends_on_id)
);

create table subtasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0
);
create index on subtasks (task_id);

create table comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  author_id uuid references actors on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index on comments (task_id);

-- ------------------------------------------------------- calendar, focus

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid references projects on delete set null,
  title text not null,
  starts_at timestamptz not null,
  len_min int not null check (len_min > 0),
  kind event_kind not null default 'meeting',
  place text
);
create index on events (workspace_id, starts_at);

create table event_attendees (
  workspace_id uuid not null references workspaces on delete cascade,
  event_id uuid not null references events on delete cascade,
  actor_id uuid not null references actors on delete cascade,
  primary key (event_id, actor_id)
);

create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  actor_id uuid not null references actors on delete cascade,
  task_id uuid references tasks on delete set null,
  started_at timestamptz not null,
  minutes int not null check (minutes > 0)
);
create index on focus_sessions (workspace_id, started_at);

-- -------------------------------------------------- feeds and invitations

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  recipient_id uuid not null references actors on delete cascade,
  -- Null means Pane itself (reminders, gate requests).
  from_actor_id uuid references actors on delete set null,
  kind notice_kind not null default 'update',
  text text not null,
  read boolean not null default false,
  -- Reminders send once per key (e.g. "due:2026-10-26").
  dedupe_key text,
  created_at timestamptz not null default now(),
  unique (recipient_id, dedupe_key)
);
create index on notifications (recipient_id, created_at desc);

create table activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid references projects on delete cascade,
  actor_id uuid references actors on delete set null,
  text text not null,
  created_at timestamptz not null default now()
);
create index on activity (workspace_id, created_at desc);

create table invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  email text not null,
  role text not null default '',
  team text not null default 'Product',
  invited_by uuid references actors on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (workspace_id, email)
);

-- ------------------------------------------------------ agent observability

create table runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  task_id uuid references tasks on delete set null,
  agent_id uuid not null references actors on delete cascade,
  parent_run_id uuid references runs on delete cascade,
  status run_status not null default 'running',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  tokens_in bigint not null default 0,
  tokens_out bigint not null default 0,
  cost_usd numeric(12, 4) not null default 0,
  model text,
  summary text not null default '',
  -- The agent tool's own session id, so MCP calls and telemetry meet on one run.
  external_session_id text,
  unique (workspace_id, external_session_id)
);
create index on runs (project_id, started_at desc);
create index on runs (parent_run_id);

-- High volume and append-only: partition by time and expire old rows once traffic grows.
create table run_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces on delete cascade,
  run_id uuid not null references runs on delete cascade,
  ts timestamptz not null default now(),
  type run_event_type not null,
  name text not null,
  duration_ms int,
  tokens int,
  payload jsonb not null default '{}'
);
create index on run_events (run_id, ts);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  task_id uuid references tasks on delete set null,
  run_id uuid references runs on delete set null,
  kind artifact_kind not null,
  url text,
  title text not null,
  status text,
  created_at timestamptz not null default now()
);
create index on artifacts (project_id);

create table gates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  kind gate_kind not null,
  task_id uuid references tasks on delete set null,
  title text not null,
  summary text not null default '',
  status gate_status not null default 'pending',
  requested_by_run uuid references runs on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references actors on delete set null,
  decided_at timestamptz,
  note text
);
create index on gates (project_id, status);

-- Agents authenticate with one token per project (phase 2). Only a hash is stored.
create table agent_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  agent_id uuid references actors on delete set null,
  label text not null,
  token_hash text not null unique,
  created_by uuid references actors on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- -------------------------------------------------------- row level security

create function is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.workspace_id = ws and m.user_id = auth.uid())
$$;

-- The actor that is "me" in a workspace.
create function my_actor(ws uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select actor_id from memberships m where m.workspace_id = ws and m.user_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'actors', 'projects', 'project_members', 'milestones', 'tasks', 'task_dependencies',
    'subtasks', 'comments', 'events', 'event_attendees', 'focus_sessions', 'activity',
    'invites', 'runs', 'run_events', 'artifacts'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "members can do everything" on %I for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id))',
      t
    );
  end loop;
end $$;

alter table workspaces enable row level security;
create policy "members can read" on workspaces for select to authenticated using (is_member(id));

alter table memberships enable row level security;
create policy "members can read memberships" on memberships for select to authenticated using (is_member(workspace_id));

-- Pins and notifications are personal.
alter table project_pins enable row level security;
create policy "own pins" on project_pins for all to authenticated
  using (user_id = auth.uid() and is_member(workspace_id))
  with check (user_id = auth.uid() and is_member(workspace_id));

alter table notifications enable row level security;
create policy "read own notifications" on notifications for select to authenticated
  using (recipient_id = my_actor(workspace_id));
create policy "mark own notifications" on notifications for update to authenticated
  using (recipient_id = my_actor(workspace_id)) with check (recipient_id = my_actor(workspace_id));
create policy "send notifications in workspace" on notifications for insert to authenticated
  with check (is_member(workspace_id));

-- Gates: members can see and raise them, but a decision must be recorded as yourself.
alter table gates enable row level security;
create policy "members read gates" on gates for select to authenticated using (is_member(workspace_id));
create policy "members raise gates" on gates for insert to authenticated with check (is_member(workspace_id));
create policy "decide gates as yourself" on gates for update to authenticated
  using (is_member(workspace_id))
  with check (is_member(workspace_id) and (decided_by is null or decided_by = my_actor(workspace_id)));

-- Token hashes never leave the server: members may read every column except token_hash,
-- and tokens are created and checked only by server functions (phase 2).
alter table agent_tokens enable row level security;
create policy "members read tokens" on agent_tokens for select to authenticated using (is_member(workspace_id));
revoke all on agent_tokens from authenticated, anon;
grant select (id, workspace_id, project_id, agent_id, label, created_by, created_at, last_used_at, revoked_at)
  on agent_tokens to authenticated;

-- ------------------------------------------------------------------ realtime

alter publication supabase_realtime add table
  tasks, subtasks, comments, projects, milestones, project_pins, events, event_attendees,
  notifications, activity, invites, runs, artifacts, gates, actors, focus_sessions;
