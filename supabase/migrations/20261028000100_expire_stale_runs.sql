-- Phase 4: runs that stop reporting are marked stale instead of staying
-- "running" forever (a crashed agent, a closed laptop, a killed terminal).
--
-- A run was last seen at the latest of: its start, its last trace step, and the
-- last call made with its token (hooks, MCP and telemetry all use the token).
-- Runs waiting on a pending gate are left alone: they are waiting on a person.
-- If the agent comes back, the agent API sets the run running again.

create function expire_stale_runs(p_idle interval default interval '30 minutes')
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  with seen as (
    select r.id,
      greatest(r.started_at, t.last_used_at, (select max(e.ts) from run_events e where e.run_id = r.id)) as at
    from runs r
    left join agent_tokens t on t.id = r.token_id
    where r.status in ('running', 'waiting')
  )
  update runs r set status = 'stale', ended_at = s.at
  from seen s
  where r.id = s.id
    and s.at < now() - p_idle
    and not exists (select 1 from gates g where g.requested_by_run = r.id and g.status = 'pending');
  get diagnostics n = row_count;

  -- Agents with nothing live left are idle.
  update actors a set agent_status = 'idle', presence = 'online'
  where a.kind = 'agent' and a.agent_status = 'running'
    and not exists (select 1 from runs r where r.agent_id = a.id and r.status in ('running', 'waiting'));

  return n;
end $$;

revoke execute on function expire_stale_runs(interval) from public, anon, authenticated;

-- Every five minutes. pg_cron runs as the database owner.
create extension if not exists pg_cron;
select cron.schedule('expire-stale-runs', '*/5 * * * *', 'select public.expire_stale_runs()');
