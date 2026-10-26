import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { RunEvent } from '@/data/types'
import { supabase } from '@/lib/supabase'

/** Steps shown per trace; a longer run shows its latest ones. */
export const EVENT_LIMIT = 1000

const key = (runIds: string[]) => ['run-events', ...runIds]

/**
 * The steps of a set of runs (a run and its sub-agents), oldest first.
 * While `live`, new and finished steps stream in as the agent works.
 */
export function useRunEvents(runIds: string[], live: boolean) {
  const qc = useQueryClient()
  const ids = runIds.join(',')

  useEffect(() => {
    if (!live || !ids) return
    let timer = 0
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => qc.invalidateQueries({ queryKey: key(ids.split(',')) }), 300)
    }
    const channel = supabase
      .channel(`run-events:${ids}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'run_events', filter: `run_id=in.(${ids})` }, refresh)
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [ids, live, qc])

  return useQuery({
    queryKey: key(runIds),
    enabled: runIds.length > 0,
    queryFn: async (): Promise<RunEvent[]> => {
      const { data, error } = await supabase
        .from('run_events')
        .select('id, run_id, ts, type, name, duration_ms, tokens, payload')
        .in('run_id', runIds)
        .order('ts', { ascending: false })
        .order('id', { ascending: false })
        .limit(EVENT_LIMIT)
      if (error) throw new Error(`Loading the trace failed: ${error.message}`)
      return data
        .map((r) => ({
          id: r.id,
          runId: r.run_id,
          ts: r.ts,
          type: r.type,
          name: r.name,
          durationMs: r.duration_ms ?? undefined,
          tokens: r.tokens ?? undefined,
          detail: typeof r.payload?.detail === 'string' ? r.payload.detail : undefined,
        }))
        .reverse()
    },
  })
}
