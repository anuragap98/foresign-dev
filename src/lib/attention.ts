import type { Gate, GateKind, Person, Project, Run, Task } from '@/data/types'
import { DAY } from './time'

export type AttentionKind = 'gate' | 'budget' | 'failed_task' | 'blocked_task' | 'failed_run'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  title: string
  detail: string
  /** Where to act on it. */
  to: string
  at: string
  actorId?: string
  projectId: string
}

const GATE_TITLE: Record<GateKind, string> = {
  plan: 'Approve a plan',
  merge: 'Approve a merge',
  deploy: 'Approve a deploy',
  custom: 'Approve',
}

/** Most urgent first: agents are paused on these until a person acts. */
const RANK: Record<AttentionKind, number> = { gate: 0, budget: 1, failed_task: 2, blocked_task: 3, failed_run: 4 }

/** Budgets at this share of their limit get a heads-up before agents are stopped. */
const BUDGET_WARN = 0.8
/** Failed runs stay on the list this long; the run itself stays on the Runs page. */
const FAILED_RUN_WINDOW = 2 * DAY

/** Everything across the workspace that is waiting on a person. */
export function attentionItems(gates: Gate[], runs: Run[], tasks: Task[], projects: Project[], actors: Record<string, Person>, now: number): AttentionItem[] {
  const project = (id: string) => projects.find((p) => p.id === id)?.name ?? 'A project'
  const runById = new Map(runs.map((r) => [r.id, r]))
  const items: AttentionItem[] = []

  for (const g of gates.filter((g) => g.status === 'pending')) {
    const agent = g.requestedByRun ? runById.get(g.requestedByRun)?.agentId : undefined
    items.push({
      id: `gate:${g.id}`,
      kind: 'gate',
      title: `${GATE_TITLE[g.kind]}: ${g.title}`,
      detail: `${project(g.projectId)}${agent && actors[agent] ? ` · ${actors[agent].name} is waiting` : ''}`,
      to: `/projects/${g.projectId}`,
      at: g.requestedAt,
      actorId: agent,
      projectId: g.projectId,
    })
  }

  for (const p of projects.filter((p) => p.budgetUsd !== undefined && p.budgetUsd > 0)) {
    const spent = runs.filter((r) => r.projectId === p.id).reduce((s, r) => s + r.costUsd, 0)
    const share = spent / p.budgetUsd!
    if (share < BUDGET_WARN) continue
    items.push({
      id: `budget:${p.id}`,
      kind: 'budget',
      title: share >= 1 ? `Budget used up on ${p.name}` : `${p.name} has used ${Math.round(share * 100)}% of its budget`,
      detail: `$${spent.toFixed(2)} of $${p.budgetUsd!.toFixed(2)}${share >= 1 ? ' · agents can’t start new work' : ''}`,
      to: `/projects/${p.id}`,
      at: new Date(now).toISOString(),
      projectId: p.id,
    })
  }

  for (const t of tasks.filter((t) => t.status === 'failed' || t.status === 'blocked')) {
    const note = [...t.comments].reverse().find((c) => c.by === t.assignee)
    items.push({
      id: `task:${t.id}`,
      kind: t.status === 'failed' ? 'failed_task' : 'blocked_task',
      title: `${t.status === 'failed' ? 'Failed' : 'Blocked'}: ${t.title}`,
      detail: note ? note.text : `${project(t.projectId)}${actors[t.assignee] ? ` · ${actors[t.assignee].name}` : ''}`,
      to: `/tasks/${t.id}`,
      at: note?.at ?? t.createdAt,
      actorId: t.assignee,
      projectId: t.projectId,
    })
  }

  for (const r of runs.filter((r) => r.status === 'failed' && now - new Date(r.endedAt ?? r.startedAt).getTime() < FAILED_RUN_WINDOW)) {
    items.push({
      id: `run:${r.id}`,
      kind: 'failed_run',
      title: `${actors[r.agentId]?.name ?? 'An agent'}’s run failed`,
      detail: r.summary || project(r.projectId),
      to: `/runs/${r.id}`,
      at: r.endedAt ?? r.startedAt,
      actorId: r.agentId,
      projectId: r.projectId,
    })
  }

  return items.sort((a, b) => RANK[a.kind] - RANK[b.kind] || b.at.localeCompare(a.at))
}
