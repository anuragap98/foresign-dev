import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { eventsBetween, rangeLabel, weekDays } from '@/lib/calendar'
import { useNow } from '@/lib/derive'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { addDays, dayKey, parseDay, startOfDay } from '@/lib/time'
import { useCalendarView } from '@/store/calendarView'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { DayPanel } from './DayPanel'
import { EventDrawer } from './EventDrawer'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'

export function CalendarPage() {
  const { eventId } = useParams()
  const { layout, setLayout, cursor, setCursor, today } = useCalendarView()
  const events = useWorkspace((s) => s.events)
  const newEvent = useUi((s) => s.newEvent)
  const now = useNow(30_000)
  const view = useRef<HTMLDivElement>(null)
  const direction = useRef(0)
  const first = useRef(true)

  const cur = parseDay(cursor)
  const week = weekDays(cur)
  // Changes only when a different month / week comes on screen.
  const periodKey = layout === 'month' ? `${cur.getFullYear()}-${cur.getMonth()}` : dayKey(week[0])

  const { title, subtitle } = useMemo(() => {
    const at = parseDay(cursor)
    if (layout === 'month') {
      const from = new Date(at.getFullYear(), at.getMonth(), 1)
      const to = new Date(at.getFullYear(), at.getMonth() + 1, 1)
      const n = eventsBetween(events, from, to).length
      return {
        title: at.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        subtitle: `${n} event${n === 1 ? '' : 's'} in ${at.toLocaleDateString('en-US', { month: 'long' })}`,
      }
    }
    const days = weekDays(at)
    const n = eventsBetween(events, days[0], addDays(days[6], 1)).length
    const thisWeek = days.some((d) => dayKey(d) === dayKey(now))
    return {
      title: `${rangeLabel(days)}, ${days[6].getFullYear()}`,
      subtitle: `${n} event${n === 1 ? '' : 's'}${thisWeek ? ' this week' : ''}`,
    }
  }, [layout, cursor, events, now])

  const step = (dir: 1 | -1) => {
    direction.current = dir
    setCursor(dayKey(layout === 'month' ? new Date(cur.getFullYear(), cur.getMonth() + dir, 1) : addDays(cur, 7 * dir)))
  }

  // Slide the grid in from the side we're heading to; cross-fade on layout switch.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = view.current
    if (!el || prefersReducedMotion()) return
    const dir = direction.current
    direction.current = 0
    gsap.fromTo(
      el,
      { autoAlpha: 0, x: dir * 36, scale: dir ? 1 : 0.98, filter: 'blur(6px)' },
      { autoAlpha: 1, x: 0, scale: 1, filter: 'blur(0px)', duration: 0.45, ease: 'power3.out', clearProps: 'transform,filter' },
    )
  }, [layout, periodKey])

  const onToday = () => {
    const target = startOfDay(now)
    direction.current = target > cur ? 1 : target < cur ? -1 : 0
    today()
  }

  return (
    <Page>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <div className="flex items-center rounded-full bg-fill p-[3px]">
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Previous ${layout}`} onClick={() => step(-1)}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="sm" className="h-8" onClick={onToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Next ${layout}`} onClick={() => step(1)}>
                <ChevronRight />
              </Button>
            </div>
            <Segmented
              label="Calendar layout"
              size="md"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' },
              ]}
            />
            <Button variant="gel" onClick={() => newEvent()}>
              <CalendarPlus /> New event
            </Button>
          </>
        }
      />

      <div ref={view} data-enter>
        {layout === 'month' ? (
          <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <MonthView events={events} now={now} />
            <DayPanel events={events} now={now} />
          </div>
        ) : (
          <WeekView events={events} now={now} />
        )}
      </div>

      <EventDrawer eventId={eventId} />
    </Page>
  )
}
