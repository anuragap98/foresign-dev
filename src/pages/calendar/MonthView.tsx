import { useMemo } from 'react'
import { Glass } from '@/components/glass/Glass'
import type { CalEvent } from '@/data/types'
import { eventHue, groupEventsByDay, MilestoneIcon, milestonesByDay, monthGrid } from '@/lib/calendar'
import { dayKey, fmtDate, parseDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useCalendarView } from '@/store/calendarView'
import { useWorkspace } from '@/store/workspace'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_PILLS = 3

export function MonthView({ events, now }: { events: CalEvent[]; now: Date }) {
  const cursor = useCalendarView((s) => s.cursor)
  const selected = useCalendarView((s) => s.selected)
  const select = useCalendarView((s) => s.select)
  const setCursor = useCalendarView((s) => s.setCursor)
  const projects = useWorkspace((s) => s.projects)

  const month = parseDay(cursor).getMonth()
  const days = useMemo(() => monthGrid(parseDay(cursor)), [cursor])
  const byDay = useMemo(() => groupEventsByDay(events), [events])
  const milestones = useMemo(() => milestonesByDay(projects), [projects])
  const today = dayKey(now)

  return (
    <Glass as="section" aria-label="Month" className="rounded-card p-2.5 sm:p-3">
      <div className="grid grid-cols-7 gap-1.5 pb-1.5" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="px-2 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((d) => {
          const key = dayKey(d)
          const list = byDay.get(key) ?? []
          const ms = milestones.get(key) ?? []
          const inMonth = d.getMonth() === month
          const isToday = key === today
          const isSelected = key === selected
          const extra = list.length - MAX_PILLS
          const label = [
            fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' }),
            list.length ? `${list.length} event${list.length > 1 ? 's' : ''}` : '',
            ...ms.map((m) => `milestone: ${m.title}`),
          ]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => {
                select(key)
                if (!inMonth) setCursor(key)
              }}
              className={cn(
                'group flex min-h-[64px] flex-col gap-1 rounded-[14px] p-1.5 text-left outline-none transition-[background-color,box-shadow] duration-200 sm:min-h-[96px] sm:rounded-[16px] sm:p-2',
                inMonth ? 'bg-fill hover:bg-fill-2' : 'bg-transparent opacity-45 hover:bg-fill-hover',
                isSelected && 'shadow-[0_0_0_2px_var(--accent-ink)]',
                'focus-visible:shadow-[0_0_0_2px_var(--accent-ink)]',
              )}
            >
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'tabular flex size-6 items-center justify-center rounded-full text-[13px] font-semibold',
                    isToday ? 'gel' : inMonth ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {d.getDate()}
                </span>
                {extra > 0 && <span className="text-[11px] font-semibold text-ink-2 max-sm:hidden">+{extra}</span>}
                <span className="ml-auto flex gap-0.5 max-sm:hidden">
                  {ms.map((m) => (
                    <span
                      key={m.id}
                      title={`${m.title} · ${m.project.name}`}
                      className={cn(
                        `hue-${m.project.hue}`,
                        'flex size-[18px] items-center justify-center rounded-[6px] bg-[color-mix(in_srgb,var(--hue)_30%,transparent)] text-[var(--hue)]',
                      )}
                    >
                      <MilestoneIcon className="size-3" strokeWidth={2.4} />
                    </span>
                  ))}
                </span>
              </span>

              {/* Pills on wider screens, dots on phones */}
              <span className="flex min-w-0 flex-col gap-0.5 max-sm:hidden">
                {list.slice(0, MAX_PILLS).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      `hue-${eventHue(e, projects)}`,
                      'flex min-w-0 items-center gap-1 rounded-[6px] bg-[color-mix(in_srgb,var(--hue)_20%,transparent)] py-0.5 pr-1.5 pl-1 text-[11px] font-medium',
                    )}
                  >
                    <i className="h-3 w-[2px] shrink-0 rounded-full bg-[var(--hue)]" />
                    <span className="truncate">{e.title}</span>
                  </span>
                ))}
              </span>
              {list.length + ms.length > 0 && (
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {ms.map((m) => (
                    <i key={m.id} className={cn(`hue-${m.project.hue}`, 'size-1.5 rounded-[2px] bg-[var(--hue)]')} />
                  ))}
                  {list.slice(0, 4).map((e) => (
                    <i key={e.id} className={cn(`hue-${eventHue(e, projects)}`, 'size-1.5 rounded-full bg-[var(--hue)]')} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Glass>
  )
}
