import { ME } from '@/data/seed'
import type { FocusEntry, Person, Project, Task } from '@/data/types'
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
