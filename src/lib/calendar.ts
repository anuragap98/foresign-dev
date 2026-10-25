import { CalendarCheck, Flag, MessageCircle, Moon, Sparkles, Users, type LucideIcon } from 'lucide-react'
import type { CalEvent, EventKind, Hue, Milestone, Project } from '@/data/types'
import { eventEnd } from './derive'
import { addDays, dayKey, MIN, parseDay, startOfDay, startOfWeek } from './time'

export const KIND_HUE: Record<EventKind, Hue> = {
  meeting: 'blue',
  review: 'purple',
  team: 'pink',
  focus: 'indigo',
  deadline: 'orange',
}

export const KIND_ICON: Record<EventKind, LucideIcon> = {
  meeting: Users,
  review: Sparkles,
  team: MessageCircle,
  focus: Moon,
  deadline: Flag,
}

export const MilestoneIcon = CalendarCheck

/** Project colour when the event belongs to one, otherwise its kind's colour. */
export const eventHue = (e: CalEvent, projects: Project[]) => projects.find((p) => p.id === e.projectId)?.hue ?? KIND_HUE[e.kind]

export const isVideo = (e: CalEvent) => !!e.place?.toLowerCase().includes('video')

/** Monday-first weeks covering the month that contains `cursor`. */
export function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

export const weekDays = (cursor: Date) => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))

export function groupEventsByDay(events: CalEvent[]) {
  const map = new Map<string, CalEvent[]>()
  for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const k = dayKey(new Date(e.start))
    map.set(k, [...(map.get(k) ?? []), e])
  }
  return map
}

export interface DatedMilestone extends Milestone {
  project: Project
}

export function milestonesByDay(projects: Project[]) {
  const map = new Map<string, DatedMilestone[]>()
  for (const project of projects)
    for (const m of project.milestones) map.set(m.date, [...(map.get(m.date) ?? []), { ...m, project }])
  return map
}

export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()

export interface Placed {
  event: CalEvent
  top: number // minutes from the start of the day
  height: number // minutes
  col: number
  cols: number
}

/**
 * Lays out one day's events for the week grid: overlapping events share the
 * column width side by side, like most calendar apps.
 */
export function layoutDay(events: CalEvent[]): Placed[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start) || b.lenMin - a.lenMin)
  const placed: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((p) => p.col + 1))
    for (const p of cluster) p.cols = cols
    cluster = []
  }

  for (const event of sorted) {
    const top = minutesOfDay(new Date(event.start))
    const height = Math.max(event.lenMin, 15)
    if (top >= clusterEnd) flush()
    const taken = new Set(cluster.filter((p) => p.top + p.height > top).map((p) => p.col))
    let col = 0
    while (taken.has(col)) col++
    const p: Placed = { event, top, height, col, cols: 1 }
    cluster.push(p)
    placed.push(p)
    clusterEnd = Math.max(clusterEnd, top + height)
  }
  flush()
  return placed
}

export function rangeLabel(days: Date[]) {
  const a = days[0]
  const b = days[days.length - 1]
  const sameMonth = a.getMonth() === b.getMonth()
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o)
  return sameMonth
    ? `${fmt(a, { month: 'short' })} ${a.getDate()} – ${b.getDate()}`
    : `${fmt(a, { month: 'short', day: 'numeric' })} – ${fmt(b, { month: 'short', day: 'numeric' })}`
}

export const eventsBetween = (events: CalEvent[], from: Date, toExclusive: Date) =>
  events.filter((e) => {
    const s = new Date(e.start)
    return s >= from && s < toExclusive
  })

export const durationLabel = (min: number) => (min < 60 ? `${min} min` : `${(min / 60).toFixed(1).replace(/\.0$/, '')} h`)

export const isPast = (e: CalEvent, now: Date) => eventEnd(e) <= now

export const startOfDayKey = (k: string) => startOfDay(parseDay(k))

export const snapMinutes = (m: number, step = 30) => Math.floor(m / step) * step

export const atMinutes = (day: Date, minutes: number) => new Date(startOfDay(day).getTime() + minutes * MIN)
