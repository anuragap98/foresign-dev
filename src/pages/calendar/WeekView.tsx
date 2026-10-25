import { Plus } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import type { CalEvent } from '@/data/types'
import {
  atMinutes,
  eventHue,
  groupEventsByDay,
  isPast,
  layoutDay,
  MilestoneIcon,
  milestonesByDay,
  minutesOfDay,
  rangeLabel,
  snapMinutes,
  weekDays,
} from '@/lib/calendar'
import { dayKey, fmtDate, fmtTime, parseDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useCalendarView } from '@/store/calendarView'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

const START_H = 7
const END_H = 20
const HOUR_PX = 54
const HEIGHT = (END_H - START_H) * HOUR_PX
const toPx = (minutes: number) => ((minutes - START_H * 60) / 60) * HOUR_PX

const hourLabel = (h: number) => (h === 12 ? 'Noon' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`)

export function WeekView({ events, now }: { events: CalEvent[]; now: Date }) {
  const cursor = useCalendarView((s) => s.cursor)
  const select = useCalendarView((s) => s.select)
  const projects = useWorkspace((s) => s.projects)
  const newEvent = useUi((s) => s.newEvent)
  const [hover, setHover] = useState<{ day: string; min: number } | null>(null)

  const days = useMemo(() => weekDays(parseDay(cursor)), [cursor])
  const byDay = useMemo(() => groupEventsByDay(events), [events])
  const milestones = useMemo(() => milestonesByDay(projects), [projects])
  const today = dayKey(now)
  const nowMin = minutesOfDay(now)
  const showNow = nowMin >= START_H * 60 && nowMin <= END_H * 60
  const weekCount = days.reduce((n, d) => n + (byDay.get(dayKey(d))?.length ?? 0), 0)
  const hasMilestones = days.some((d) => milestones.has(dayKey(d)))

  /** Minute of the day under the pointer, snapped to half hours. */
  const slotAt = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = Math.max(0, Math.min(HEIGHT - 1, e.clientY - rect.top))
    return Math.min(END_H * 60 - 30, snapMinutes(START_H * 60 + (y / HOUR_PX) * 60))
  }

  return (
    <Glass as="section" aria-label="Week" className="rounded-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <div>
          <h2 className="text-[17px] font-semibold">{rangeLabel(days)}</h2>
          <p className="text-[13px] text-ink-2">
            {weekCount} event{weekCount === 1 ? '' : 's'}
          </p>
        </div>
        <p className="text-[12px] text-ink-3 max-sm:hidden">Click an empty slot to add</p>
      </div>

      <div className="scroll-thin -mx-4 overflow-x-auto px-4">
        <div className="min-w-[720px]">
          {/* Day headers */}
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <span />
            {days.map((d) => {
              const key = dayKey(d)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(key)}
                  className="flex items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-semibold tracking-[0.06em] text-ink-2 uppercase hover:bg-fill-hover"
                >
                  {fmtDate(d, { weekday: 'short' })}
                  <span
                    className={cn(
                      'tabular flex size-7 items-center justify-center rounded-full text-[16px] tracking-normal',
                      key === today ? 'gel' : 'text-ink',
                    )}
                  >
                    {d.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Milestones sit in an all-day strip */}
          {hasMilestones && (
            <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-t border-sep py-1.5">
              <span className="pt-1 text-[10px] font-semibold text-ink-3 uppercase">All day</span>
              {days.map((d) => (
                <div key={dayKey(d)} className="flex min-w-0 flex-col gap-1 px-0.5">
                  {(milestones.get(dayKey(d)) ?? []).map((m) => (
                    <span
                      key={m.id}
                      title={`${m.project.name} milestone`}
                      className={cn(
                        `hue-${m.project.hue}`,
                        'flex min-w-0 items-center gap-1 rounded-[8px] bg-[color-mix(in_srgb,var(--hue)_24%,transparent)] px-1.5 py-1 text-[11px] font-semibold',
                      )}
                    >
                      <MilestoneIcon className="size-3 shrink-0 text-[var(--hue)]" />
                      <span className="truncate">{m.title}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Time grid */}
          <div className="relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-t border-sep" style={{ height: HEIGHT }}>
            <div className="relative">
              {Array.from({ length: END_H - START_H }, (_, i) => (
                <span key={i} className="tabular absolute right-2 -translate-y-1/2 text-[11px] text-ink-3" style={{ top: i * HOUR_PX }}>
                  {i === 0 ? '' : hourLabel(START_H + i)}
                </span>
              ))}
              {showNow && days.some((d) => dayKey(d) === today) && (
                <span
                  className="tabular absolute right-1 z-10 -translate-y-1/2 rounded-full bg-danger px-1.5 py-px text-[10px] font-bold text-white"
                  style={{ top: toPx(nowMin) }}
                >
                  {fmtTime(now).replace(' ', '')}
                </span>
              )}
            </div>

            {days.map((d) => {
              const key = dayKey(d)
              const weekend = d.getDay() === 0 || d.getDay() === 6
              const placed = layoutDay(byDay.get(key) ?? [])
              const ghost = hover?.day === key ? hover.min : null
              return (
                <div
                  key={key}
                  data-day={key}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}: add an event`}
                  onMouseMove={(e) => {
                    if ((e.target as HTMLElement).closest('[data-event]')) return setHover(null)
                    const min = slotAt(e)
                    if (hover?.day !== key || hover.min !== min) setHover({ day: key, min })
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-event]')) return
                    newEvent({ start: atMinutes(d, slotAt(e)).toISOString(), lenMin: 30 })
                  }}
                  className={cn('relative cursor-copy border-l border-sep', weekend && 'bg-fill-hover')}
                  style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, var(--sep) 0 1px, transparent 1px ${HOUR_PX}px)`,
                  }}
                >
                  {ghost !== null && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-1 flex items-center gap-1 rounded-[8px] border border-dashed border-[color-mix(in_srgb,var(--accent-ink)_60%,transparent)] bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-ink"
                      style={{ top: toPx(ghost), height: HOUR_PX / 2 }}
                    >
                      <Plus className="size-3" /> {fmtTime(atMinutes(d, ghost))}
                    </span>
                  )}

                  {placed.map(({ event: ev, top, height, col, cols }) => {
                    const startPx = Math.max(0, toPx(top))
                    const endPx = Math.min(HEIGHT, toPx(top + height))
                    if (endPx <= 0 || startPx >= HEIGHT) return null
                    const slim = ev.lenMin <= 20
                    return (
                      <Link
                        key={ev.id}
                        data-event
                        to={`/calendar/${ev.id}`}
                        title={`${ev.title} · ${fmtTime(ev.start)}`}
                        className={cn(
                          `hue-${eventHue(ev, projects)}`,
                          'absolute z-[1] flex min-w-0 flex-col overflow-hidden border-l-[3px] border-[var(--hue)] px-1.5 text-left transition-[filter,transform] hover:z-[2] hover:brightness-110',
                          'bg-[color-mix(in_srgb,var(--hue)_28%,var(--glass-solid))]',
                          slim ? 'justify-center rounded-full' : 'rounded-[10px] py-1',
                          isPast(ev, now) && 'opacity-60',
                        )}
                        style={{
                          top: startPx + 1,
                          height: Math.max(slim ? 20 : 26, endPx - startPx - 2),
                          left: `calc(${(col / cols) * 100}% + 3px)`,
                          width: `calc(${100 / cols}% - 6px)`,
                        }}
                      >
                        <span className="truncate text-[12px] leading-tight font-semibold">{ev.title}</span>
                        {!slim && endPx - startPx >= 40 && (
                          <span className="truncate text-[11px] text-ink-2">
                            {fmtTime(ev.start)}
                            {ev.place && ` · ${ev.place}`}
                          </span>
                        )}
                      </Link>
                    )
                  })}

                  {key === today && showNow && (
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 z-[3]" style={{ top: toPx(nowMin) }}>
                      <span className="absolute -top-[4px] -left-[5px] size-2.5 rounded-full bg-danger" />
                      <span className="block h-[2px] bg-danger" />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Glass>
  )
}
