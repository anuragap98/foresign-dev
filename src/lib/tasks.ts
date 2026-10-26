import { ME } from '@/lib/session'
import { actorById } from '@/store/people'
import type { Priority, Project, Status, Task } from '@/data/types'
import type { TaskFilters, TasksSort } from '@/store/tasksView'
import { addDays, dayKey, startOfWeek } from './time'

export const STATUSES: Status[] = ['todo', 'doing', 'review', 'done']

/**
 * The board column a status sits in. Agents can also park a task as awaiting
 * approval (not started yet), blocked or failed (stuck mid-work); those show in
 * their column with a flag rather than in columns of their own.
 */
export const COLUMN_OF: Record<Status, Status> = {
  todo: 'todo',
  awaiting_approval: 'todo',
  doing: 'doing',
  blocked: 'doing',
  failed: 'doing',
  review: 'review',
  done: 'done',
}

/** Statuses that need someone to look: shown as a flag on the card. */
export const FLAGGED = new Set<Status>(['awaiting_approval', 'blocked', 'failed'])

/** Column dot colours. */
export const STATUS_TONE: Record<Status, string> = {
  todo: 'var(--text-3)',
  doing: 'var(--blue)',
  review: 'var(--purple)',
  done: 'var(--green)',
  blocked: 'var(--orange)',
  failed: 'var(--danger)',
  awaiting_approval: 'var(--yellow)',
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

export function matchesFilters(t: Task, f: TaskFilters, projects: Project[]) {
  if (f.project !== 'all' && t.projectId !== f.project) return false
  if (f.mine && t.assignee !== ME) return false
  if (f.priority !== 'any' && t.priority !== f.priority) return false
  const q = f.q.trim().toLowerCase()
  if (!q) return true
  const project = projects.find((p) => p.id === t.projectId)?.name ?? ''
  const person = actorById(t.assignee)?.name ?? ''
  return [t.title, project, person].some((s) => s.toLowerCase().includes(q))
}

export const filtersActive = (f: TaskFilters) => f.project !== 'all' || f.mine || f.priority !== 'any' || f.q.trim() !== ''

export function sortTasks(tasks: Task[], sort: TasksSort) {
  const byDue = (a: Task, b: Task) => a.due.localeCompare(b.due)
  const byPrio = (a: Task, b: Task) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  return [...tasks].sort((a, b) => (sort === 'due' ? byDue(a, b) || byPrio(a, b) : byPrio(a, b) || byDue(a, b)))
}

/** Board order; ties (which shouldn't happen) fall back to age so the order is stable. */
export const byPosition = (a: Task, b: Task) => a.position - b.position || a.createdAt.localeCompare(b.createdAt)

/** Done tasks read newest first; other columns keep their hand-sorted order. */
export function columnTasks(tasks: Task[], status: Status) {
  const col = tasks.filter((t) => COLUMN_OF[t.status] === status)
  return status === 'done'
    ? col.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
    : col.sort(byPosition)
}

export function taskStats(tasks: Task[], now: Date) {
  const today = dayKey(now)
  const monday = startOfWeek(now)
  const weekStart = dayKey(monday)
  const weekEnd = dayKey(addDays(monday, 6))
  const open = tasks.filter((t) => t.status !== 'done')
  return {
    open: open.length,
    projects: new Set(open.map((t) => t.projectId)).size,
    dueThisWeek: open.filter((t) => t.due >= weekStart && t.due <= weekEnd).length,
    overdue: open.filter((t) => t.due < today).length,
    doneThisWeek: tasks.filter((t) => t.doneAt && new Date(t.doneAt) >= monday).length,
  }
}
