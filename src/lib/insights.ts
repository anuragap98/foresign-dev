import { ME } from '@/lib/session'
import type { FocusEntry, Gate, Person, Project, Run, Task } from '@/data/types'
import { workload } from './team'
import { addDays, DAY, dayKey, startOfDay } from './time'

export type RangeDays = 7 | 30 | 90

/** The last `n` days, oldest first, ending today. */
export const lastDays = (n: number, now: Date) => Array.from({ length: n }, (_, i) => addDays(startOfDay(now), i - n + 1))

/** Stable 0..1 number for a string, so sample figures don't jump between renders. */
function hash01(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

/**
 * Team focus hours for a day. Your own hours come from your logged
 * sessions; teammates' are sample figures derived from their usual weekly
 * focus, quiet at weekends.
 */
function focusHoursOn(day: Date, people: Person[], focusLog: FocusEntry[]) {
  const key = dayKey(day)
  const mine = focusLog.filter((f) => dayKey(new Date(f.start)) === key).reduce((s, f) => s + f.minutes, 0) / 60
  const weekend = day.getDay() === 0 || day.getDay() === 6
  const others = weekend
    ? 0
    : people
        .filter((p) => p.id !== ME)
        .reduce((s, p) => s + (p.focusWeekH / 5) * (0.4 + hash01(`${p.id}:${key}`) * 1.2), 0)
  return Math.round((mine + others) * 10) / 10
}

const doneDay = (t: Task) => (t.doneAt ? dayKey(new Date(t.doneAt)) : '')
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0)
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export interface PeriodStats {
  completed: number
  onTime: number
  late: number
  rate: number // 0..100
  focusH: number
  cycleDays: number
}

function periodStats(days: Date[], tasks: Task[], people: Person[], focusLog: FocusEntry[]): PeriodStats & { done: Task[]; perDay: number[]; focusPerDay: number[] } {
  const keys = new Set(days.map((d) => dayKey(d)))
  const done = tasks.filter((t) => t.status === 'done' && keys.has(doneDay(t)))
  const onTime = done.filter((t) => doneDay(t) <= t.due).length
  const focusPerDay = days.map((d) => focusHoursOn(d, people, focusLog))
  return {
    done,
    completed: done.length,
    onTime,
    late: done.length - onTime,
    rate: done.length ? Math.round((onTime / done.length) * 100) : 0,
    perDay: days.map((d) => done.filter((t) => doneDay(t) === dayKey(d)).length),
    focusPerDay,
    focusH: Math.round(focusPerDay.reduce((a, b) => a + b, 0)),
    cycleDays: Math.round(avg(done.map((t) => (new Date(t.doneAt!).getTime() - new Date(t.createdAt).getTime()) / DAY)) * 10) / 10,
  }
}

export function insights(range: RangeDays, tasks: Task[], projects: Project[], people: Person[], focusLog: FocusEntry[], now: Date) {
  const days = lastDays(range, now)
  const prevDays = days.map((d) => addDays(d, -range))
  const cur = periodStats(days, tasks, people, focusLog)
  const prev = periodStats(prevDays, tasks, people, focusLog)

  const byProject = projects
    .map((p) => ({ project: p, count: cur.done.filter((t) => t.projectId === p.id).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, share: Math.round((r.count / (cur.completed || 1)) * 100) }))

  const load = people
    .map((p) => ({ person: p, ...workload(p, tasks) }))
    .sort((a, b) => b.ratio - a.ratio || b.hours - a.hours)

  const slowest = tasks
    .filter((t) => t.status !== 'done')
    .map((t) => ({ task: t, ageDays: Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / DAY) }))
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, 5)

  return {
    days,
    cur,
    prev,
    deltas: {
      completed: pct(cur.completed, prev.completed),
      rate: cur.rate - prev.rate,
      focus: pct(cur.focusH, prev.focusH),
      cycle: Math.round((cur.cycleDays - prev.cycleDays) * 10) / 10,
    },
    byProject,
    load,
    over: load.filter((l) => l.ratio > 1).length,
    slowest,
  }
}

export type Insights = ReturnType<typeof insights>

const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * How the agents worked over the range: what they finished, how often runs
 * succeed, what it cost, and how often people had to step in at a gate.
 */
export function agentInsights(range: RangeDays, runs: Run[], tasks: Task[], gates: Gate[], actors: Person[], now: Date) {
  const days = lastDays(range, now)
  const from = days[0].getTime()
  const prevFrom = from - range * DAY
  const t = (iso?: string) => (iso ? new Date(iso).getTime() : NaN)
  const inCur = (iso?: string) => t(iso) >= from
  const inPrev = (iso?: string) => t(iso) >= prevFrom && t(iso) < from

  const agents = actors.filter((a) => a.kind === 'agent')
  const isAgent = new Set(agents.map((a) => a.id))
  const finished = (inRange: (iso?: string) => boolean) =>
    tasks.filter((x) => x.status === 'done' && isAgent.has(x.assignee) && inRange(x.doneAt))
  const done = finished(inCur)
  const cur = runs.filter((r) => inCur(r.startedAt))
  const prev = runs.filter((r) => inPrev(r.startedAt))
  const spend = (rs: Run[]) => rs.reduce((s, r) => s + r.costUsd, 0)
  const successRate = (rs: Run[]) => {
    const ended = rs.filter((r) => r.status === 'succeeded' || r.status === 'failed')
    return ended.length ? Math.round((ended.filter((r) => r.status === 'succeeded').length / ended.length) * 100) : 0
  }

  const decided = gates.filter((g) => g.decidedAt && inCur(g.decidedAt))
  const steppedIn = decided.filter((g) => g.status === 'changes_requested' || g.status === 'rejected').length
  const spendPerDay = days.map((d) => spend(cur.filter((r) => dayKey(new Date(r.startedAt)) === dayKey(d))))

  const byAgent = agents
    .map((a) => {
      const rs = cur.filter((r) => r.agentId === a.id)
      const fin = done.filter((x) => x.assignee === a.id)
      const claimed = tasks.filter((x) => x.assignee === a.id && x.attempts > 0 && (inCur(x.doneAt) || x.status !== 'done'))
      const cost = spend(rs)
      return {
        agent: a,
        runs: rs.length,
        finished: fin.length,
        success: successRate(rs),
        ended: rs.some((r) => r.status === 'succeeded' || r.status === 'failed'),
        retries: claimed.filter((x) => x.attempts > 1).length,
        cost,
        perTask: fin.length ? cost / fin.length : null,
        tokens: rs.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0),
      }
    })
    .filter((r) => r.runs || r.finished)
    .sort((a, b) => b.finished - a.finished || b.cost - a.cost)

  return {
    any: runs.length > 0,
    hadPrev: prev.length > 0,
    finished: done.length,
    finishedDelta: pct(done.length, finished(inPrev).length),
    success: successRate(cur),
    successDelta: successRate(cur) - successRate(prev),
    spend: spend(cur),
    spendDelta: pct(Math.round(spend(cur) * 100), Math.round(spend(prev) * 100)),
    perTask: done.length ? spend(cur) / done.length : 0,
    spendPerDay,
    runs: cur.length,
    gates: {
      pending: gates.filter((g) => g.status === 'pending').length,
      decided: decided.length,
      approved: decided.filter((g) => g.status === 'approved').length,
      changes: decided.filter((g) => g.status === 'changes_requested').length,
      rejected: decided.filter((g) => g.status === 'rejected').length,
      waitMs: median(decided.map((g) => t(g.decidedAt) - t(g.requestedAt))),
      steppedInRate: decided.length ? Math.round((steppedIn / decided.length) * 100) : 0,
    },
    leadDays: Math.round(median(done.filter((x) => x.source === 'agent').map((x) => (t(x.doneAt) - t(x.createdAt)) / DAY)) * 10) / 10,
    byAgent,
  }
}

export type AgentInsights = ReturnType<typeof agentInsights>
