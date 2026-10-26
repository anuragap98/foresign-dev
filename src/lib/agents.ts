import type { Person, Run, Task } from '@/data/types'
import { isLive } from './runs'

export type AgentState = 'working' | 'waiting' | 'idle'

export const AGENT_STATE_LABEL: Record<AgentState, string> = {
  working: 'Working',
  waiting: 'Waiting on you',
  idle: 'Idle',
}

export const AGENT_STATE_TONE: Record<AgentState, string> = {
  working: 'var(--blue)',
  waiting: 'var(--yellow)',
  idle: 'var(--text-3)',
}

/** What an agent is doing now and how it has done, from its runs and tasks. */
export function agentSummary(agent: Person, runs: Run[], tasks: Task[]) {
  const mine = runs.filter((r) => r.agentId === agent.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const live = mine.filter(isLive)
  const state: AgentState = live.some((r) => r.status === 'running') ? 'working' : live.length ? 'waiting' : 'idle'
  const assigned = tasks.filter((t) => t.assignee === agent.id)
  // What it's on now: the task its live run names, else a task it has in progress.
  const active = (t: Task) => t.status === 'doing' || t.status === 'review' || t.status === 'awaiting_approval'
  const current =
    live.map((r) => tasks.find((t) => t.id === r.taskId && active(t))).find(Boolean) ?? assigned.find((t) => t.status === 'doing')
  const ended = mine.filter((r) => r.status === 'succeeded' || r.status === 'failed')
  return {
    state,
    runs: mine,
    liveRun: live[0],
    current,
    open: assigned.filter((t) => t.status !== 'done'),
    finished: assigned.filter((t) => t.status === 'done').length,
    success: ended.length ? Math.round((ended.filter((r) => r.status === 'succeeded').length / ended.length) * 100) : null,
    spend: mine.reduce((s, r) => s + r.costUsd, 0),
    tokens: mine.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0),
    lastRun: mine[0],
    projects: new Set(mine.map((r) => r.projectId)),
  }
}

export type AgentSummary = ReturnType<typeof agentSummary>
