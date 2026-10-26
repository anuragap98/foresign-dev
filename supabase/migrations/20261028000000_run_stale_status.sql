-- Phase 4: a run whose agent stops reporting without ending it "goes quiet".
-- Its own migration: a new enum value can't be used in the transaction that adds it.
alter type run_status add value if not exists 'stale';
