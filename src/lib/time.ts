export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfDay(d: Date = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function shiftDay(key: string, n: number) {
  return dayKey(addDays(parseDay(key), n))
}

/** Whole calendar days from a to b (b - a), DST-safe. */
export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY)
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date = new Date()) {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7
  return addDays(x, -dow)
}

export function at(day: Date, hours: number, minutes = 0) {
  const x = startOfDay(day)
  x.setHours(hours, minutes, 0, 0)
  return x
}

export function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Date(d).toLocaleDateString('en-US', opts)
}

/** "Today", "Tomorrow", a weekday within the next 6 days, else "Oct 23". */
export function fmtDue(key: string, now = new Date()) {
  const diff = daysBetween(now, parseDay(key))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return fmtDate(parseDay(key), { weekday: 'short' })
  return fmtDate(parseDay(key))
}

export function relTime(iso: string, now = Date.now()) {
  const ms = now - new Date(iso).getTime()
  if (ms < MIN) return 'just now'
  if (ms < HOUR) return `${Math.round(ms / MIN)} min ago`
  if (ms < DAY) return `${Math.round(ms / HOUR)} h ago`
  return `${Math.round(ms / DAY)} d ago`
}

/** "in 20 min", "in 1 h 5 min", "now". */
export function untilLabel(target: Date, now = new Date()) {
  const mins = Math.round((target.getTime() - now.getTime()) / MIN)
  if (mins <= 0) return 'now'
  if (mins < 60) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `in ${h} h ${m} min` : `in ${h} h`
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good evening'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** 66 → "1.1h", 38 → "38m". */
export function fmtHours(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, '')}h`
}

export function fmtClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}
