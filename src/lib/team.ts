import { ME } from '@/lib/session'
import { actorById } from '@/store/people'
import type { Hue, Person, Presence, Task, Team } from '@/data/types'

export const TEAMS: Team[] = ['Product', 'Design', 'Engineering', 'Marketing']

export const PRESENCE_TONE: Record<Presence, string> = {
  online: 'var(--green)',
  focus: 'var(--purple)',
  meeting: 'var(--orange)',
  away: 'var(--text-3)',
}

export const TEAM_HUE: Record<Team, Hue> = {
  Product: 'blue',
  Design: 'pink',
  Engineering: 'indigo',
  Marketing: 'orange',
}

/** Minutes the zone is ahead of UTC at `at`. */
function tzOffset(tz: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - Math.floor(at.getTime() / 60_000) * 60_000) / 60_000)
}

export function localClock(p: Person, now: Date) {
  const time = now.toLocaleTimeString('en-US', { timeZone: p.tz, hour: 'numeric', minute: '2-digit' })
  const hour = Number(now.toLocaleString('en-US', { timeZone: p.tz, hour: 'numeric', hourCycle: 'h23' }))
  const diffMin = tzOffset(p.tz, now) - tzOffset(actorById(ME)?.tz ?? 'UTC', now)
  const h = Math.abs(diffMin) / 60
  const amount = `${Number.isInteger(h) ? h : h.toFixed(1)}h`
  const relative =
    p.id === ME ? 'Your time' : diffMin === 0 ? 'Same time as you' : diffMin > 0 ? `${amount} ahead` : `${amount} behind`
  return { time, relative, daytime: hour >= 7 && hour < 19 }
}

export function workload(p: Person, tasks: Task[]) {
  const open = tasks.filter((t) => t.assignee === p.id && t.status !== 'done')
  const hours = open.reduce((sum, t) => sum + t.estH, 0)
  const ratio = hours / p.capacityH
  return {
    open,
    hours,
    ratio,
    pct: Math.round(ratio * 100),
    tone: ratio > 1 ? 'var(--danger)' : ratio > 0.8 ? 'var(--orange)' : 'var(--green)',
  }
}
