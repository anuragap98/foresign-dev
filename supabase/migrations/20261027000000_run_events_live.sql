-- Phase 3: the Runs page follows a run's steps live. Only the open run's
-- steps are subscribed to, so the workspace-wide refresh never sees them.
alter publication supabase_realtime add table run_events;
