import { useEffect, useState } from 'react'
import { ME } from '@/lib/session'
import type { CalEvent, FocusEntry, Project, Task } from '@/data/types'
import { addDays, dayKey, MIN, startOfDay, startOfWeek } from './time'

/** Re-renders on an interval so clocks and countdowns stay live. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

export const isToday = (iso: string | undefined, now: Date) => !!iso && dayKey(new Date(iso)) === dayKey(now)

export const eventEnd = (e: CalEvent) => new Date(new Date(e.start).getTime() + e.lenMin * MIN)

export function eventsOn(events: CalEvent[], day: Date) {
  const key = dayKey(day)
  return events
    .filter((e) => dayKey(new Date(e.start)) === key)
    .sort((a, b) => a.start.localeCompare(b.start))
}

/** My tasks due today or earlier that are still open, plus those I closed today. */
export function myTasksToday(tasks: Task[], now: Date) {
  const today = dayKey(now)
  return tasks
    .filter((t) => t.assignee === ME && t.due <= today && (t.status !== 'done' || isToday(t.doneAt, now)))
    .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.due.localeCompare(b.due))
}

export function todayStats(tasks: Task[], events: CalEvent[], focusLog: FocusEntry[], now: Date) {
  const today = dayKey(now)
  const mine = tasks.filter((t) => t.assignee === ME)
  const dueToday = mine.filter((t) => t.due === today)
  const meetings = eventsOn(events, now).filter((e) => e.kind !== 'focus' && e.people.includes(ME))
  return {
    tasksTotal: dueToday.length,
    tasksDone: dueToday.filter((t) => t.status === 'done').length,
    tasksLeft: dueToday.filter((t) => t.status !== 'done').length,
    overdue: mine.filter((t) => t.status !== 'done' && t.due < today).length,
    focusMin: focusLog.filter((f) => isToday(f.start, now)).reduce((sum, f) => sum + f.minutes, 0),
    focusSessions: focusLog.filter((f) => isToday(f.start, now)).length,
    meetingsTotal: meetings.length,
    meetingsDone: meetings.filter((e) => eventEnd(e) <= now).length,
    meetingsLeft: meetings.filter((e) => eventEnd(e) > now).length,
  }
}

export const FOCUS_GOAL_MIN = 120

/** Team tasks finished on each day of this week (Mon–Sun) and the change vs last week so far. */
export function weekThroughput(tasks: Task[], now: Date) {
  const monday = startOfWeek(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const doneOn = (d: Date) => tasks.filter((t) => t.doneAt && dayKey(new Date(t.doneAt)) === dayKey(d)).length
  const counts = days.map(doneOn)
  const elapsed = Math.floor((startOfDay(now).getTime() - monday.getTime()) / 86_400_000) + 1
  const total = counts.reduce((a, b) => a + b, 0)
  const prev = days.slice(0, elapsed).reduce((sum, d) => sum + doneOn(addDays(d, -7)), 0)
  return {
    days,
    counts,
    total,
    todayIndex: elapsed - 1,
    delta: prev ? Math.round(((total - prev) / prev) * 100) : 0,
  }
}

export function projectProgress(project: Project, tasks: Task[]) {
  const mine = tasks.filter((t) => t.projectId === project.id)
  const done = mine.filter((t) => t.status === 'done').length
  return { done, total: mine.length, pct: mine.length ? Math.round((done / mine.length) * 100) : 0 }
}
