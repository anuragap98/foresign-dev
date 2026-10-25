import type { Hue, Milestone, Project, ProjectStatus, Task } from '@/data/types'
import { projectProgress } from './derive'
import { addDays, dayKey, daysBetween, parseDay, startOfDay } from './time'
import { clamp } from './utils'

export const PROJECT_STATUS_HUE: Record<ProjectStatus, Hue> = {
  planning: 'yellow',
  progress: 'green',
  review: 'orange',
  shipped: 'teal',
}

export type ProjectFilter = 'all' | 'active' | 'planning' | 'shipped'

export function matchesProjectFilter(p: Project, f: ProjectFilter) {
  if (f === 'all') return true
  if (f === 'active') return p.status === 'progress' || p.status === 'review'
  return p.status === f
}

export const sortedMilestones = (p: Project) => [...p.milestones].sort((a, b) => a.date.localeCompare(b.date))

export const nextMilestone = (p: Project): Milestone | undefined => sortedMilestones(p).find((m) => !m.done)

/** "today", "tomorrow", "in 6 days", "3 days ago" */
export function relDays(key: string, now = new Date()) {
  const n = daysBetween(now, parseDay(key))
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

/** Share of the project's calendar that has passed, 0..1. */
export function elapsed(p: Project, now = new Date()) {
  const start = parseDay(p.started).getTime()
  const end = parseDay(p.due).getTime()
  if (end <= start) return 1
  return clamp((startOfDay(now).getTime() - start) / (end - start))
}

/** On track when finished work keeps up with elapsed time (with some slack). */
export function projectHealth(p: Project, tasks: Task[], now = new Date()) {
  const progress = projectProgress(p, tasks)
  const expected = elapsed(p, now)
  return {
    ...progress,
    expected,
    onTrack: p.status === 'shipped' || progress.pct / 100 >= expected - 0.15,
    daysLeft: Math.max(0, daysBetween(now, parseDay(p.due))),
  }
}

export interface BurnPoint {
  day: string
  done: number
  total: number
}

/** Tasks done against tasks in scope, day by day from the start to today (or the due date). */
export function burnup(p: Project, tasks: Task[], now = new Date()): BurnPoint[] {
  const mine = tasks.filter((t) => t.projectId === p.id)
  const start = parseDay(p.started)
  const end = new Date(Math.min(startOfDay(now).getTime(), parseDay(p.due).getTime()))
  const points: BurnPoint[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const k = dayKey(d)
    const close = addDays(d, 1).getTime()
    points.push({
      day: k,
      total: mine.filter((t) => new Date(t.createdAt).getTime() < close).length,
      done: mine.filter((t) => t.doneAt && new Date(t.doneAt).getTime() < close).length,
    })
  }
  return points
}
