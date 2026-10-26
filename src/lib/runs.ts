import type { Run, RunEventType, RunStatus } from '@/data/types'

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  waiting: 'Waiting for approval',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
  stale: 'Went quiet',
}

export const RUN_STATUS_TONE: Record<RunStatus, string> = {
  running: 'var(--blue)',
  waiting: 'var(--yellow)',
  succeeded: 'var(--green)',
  failed: 'var(--danger)',
  cancelled: 'var(--text-3)',
  stale: 'var(--orange)',
}

export const EVENT_LABEL: Record<RunEventType, string> = {
  tool_call: 'Tool call',
  command: 'Command',
  file_edit: 'File edit',
  message: 'Message',
  error: 'Error',
  note: 'Note',
}

export const EVENT_TONE: Record<RunEventType, string> = {
  tool_call: 'var(--blue)',
  command: 'var(--purple)',
  file_edit: 'var(--green)',
  message: 'var(--teal)',
  error: 'var(--danger)',
  note: 'var(--text-3)',
}

export const isLive = (r: Run) => r.status === 'running' || r.status === 'waiting'

/** Children of each run, oldest first. */
export function childrenOf(runs: Run[]) {
  const m = new Map<string, Run[]>()
  for (const r of runs) if (r.parentRunId) m.set(r.parentRunId, [...(m.get(r.parentRunId) ?? []), r])
  for (const list of m.values()) list.sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  return m
}

/** A run and everything under it, depth first. */
export function subtree(run: Run, children: Map<string, Run[]>): Run[] {
  return [run, ...(children.get(run.id) ?? []).flatMap((c) => subtree(c, children))]
}

/** The run at the top of a run's tree. */
export function rootOf(run: Run, byId: Map<string, Run>) {
  let r = run
  while (r.parentRunId && byId.has(r.parentRunId)) r = byId.get(r.parentRunId)!
  return r
}

export function totals(runs: Run[]) {
  return runs.reduce(
    (s, r) => ({ cost: s.cost + r.costUsd, tokensIn: s.tokensIn + r.tokensIn, tokensOut: s.tokensOut + r.tokensOut }),
    { cost: 0, tokensIn: 0, tokensOut: 0 },
  )
}

export const runEnd = (r: Run, now: number) => (r.endedAt ? new Date(r.endedAt).getTime() : now)
export const runMs = (r: Run, now: number) => Math.max(0, runEnd(r, now) - new Date(r.startedAt).getTime())

export function fmtDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`
}

export function fmtTokens(n: number) {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export const fmtCost = (usd: number) => (usd > 0 && usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`)
