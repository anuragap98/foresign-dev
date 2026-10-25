import { MapPin, Video } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { AvatarStack } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ME } from '@/lib/session'
import type { CalEvent } from '@/data/types'
import { eventHue } from '@/lib/calendar'
import { eventEnd, eventsOn, useNow } from '@/lib/derive'
import { addDays, fmtDate, fmtTime, untilLabel } from '@/lib/time'
import { useWorkspace } from '@/store/workspace'

export function UpNextCard({ className }: { className?: string }) {
  const events = useWorkspace((s) => s.events)
  const projects = useWorkspace((s) => s.projects)
  const now = useNow(15_000)

  const { upcoming, tomorrow } = useMemo(() => {
    const mine = (e: CalEvent) => e.people.includes(ME)
    return {
      upcoming: eventsOn(events, now).filter((e) => mine(e) && eventEnd(e) > now),
      tomorrow: eventsOn(events, addDays(now, 1)).find(mine),
    }
  }, [events, now])

  const [first, ...rest] = upcoming
  const started = first && new Date(first.start) <= now

  return (
    <Card
      title="Up next"
      className={className}
      action={
        <Button asChild variant="link" size="none" className="text-[14px]">
          <Link to="/calendar">Calendar</Link>
        </Button>
      }
    >
      {first ? (
        <>
          <div
            className="rounded-[22px] p-4"
            style={{
              background: 'linear-gradient(140deg, color-mix(in srgb, var(--accent) 42%, transparent), color-mix(in srgb, var(--accent) 12%, transparent))',
              boxShadow: 'inset 0 1px 1px #ffffff40, inset 0 0 0 0.5px #ffffff26',
            }}
          >
            <p className="text-[13px] text-ink-2">
              {started ? 'Happening now' : <><span className="font-semibold text-ink">{untilLabel(new Date(first.start), now)}</span></>}
            </p>
            <Link to={`/calendar/${first.id}`} className="mt-1 block text-[18px] font-semibold hover:underline">
              {first.title}
            </Link>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {fmtTime(first.start)} – {fmtTime(eventEnd(first))}
              {first.place && ` · ${first.place}`}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <AvatarStack ids={first.people} max={4} size={26} />
              {first.place?.toLowerCase().includes('video') ? (
                <Button variant="gel" size="sm">
                  <Video /> Join
                </Button>
              ) : (
                first.place && (
                  <span className="inline-flex items-center gap-1 text-[13px] text-ink-2">
                    <MapPin className="size-3.5" /> {first.place}
                  </span>
                )
              )}
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {rest.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/calendar/${e.id}`}
                  className={`hue-${eventHue(e, projects)} flex items-center gap-3 rounded-[12px] px-1 py-1.5 text-[14px] transition-colors hover:bg-fill-hover`}
                >
                  <span className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--hue)]" />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="tabular shrink-0 text-[13px] text-ink-2">{fmtTime(e.start)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex h-full flex-col justify-center rounded-[22px] bg-fill p-5">
          <p className="text-[17px] font-semibold">You’re clear for today</p>
          <p className="mt-1 text-[14px] text-ink-2">
            {tomorrow ? `Tomorrow starts with ${tomorrow.title} at ${fmtTime(tomorrow.start)}.` : `Nothing on the calendar for ${fmtDate(addDays(now, 1), { weekday: 'long' })}.`}
          </p>
        </div>
      )}
    </Card>
  )
}
