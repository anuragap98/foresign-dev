import { MapPin, Plus, Video } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Link } from 'react-router'
import { AvatarStack, Avatar } from '@/components/ui/avatar'
import { PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EVENT_KIND_LABEL, type CalEvent, type Priority } from '@/data/types'
import { durationLabel, eventHue, groupEventsByDay, isPast, isVideo, KIND_ICON, MilestoneIcon, milestonesByDay } from '@/lib/calendar'
import { at, dayKey, fmtDate, fmtTime, parseDay } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useCalendarView } from '@/store/calendarView'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

const SHOW_TASKS = 5
const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function NowLine({ now }: { now: Date }) {
  return (
    <li aria-label={`Now, ${fmtTime(now)}`} className="flex items-center gap-2 py-1 text-[12px] font-semibold text-danger">
      <span className="tabular w-[64px] shrink-0">{fmtTime(now)}</span>
      <span className="size-2 shrink-0 rounded-full bg-danger shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_25%,transparent)]" />
      <span className="h-[2px] flex-1 rounded-full bg-danger" />
    </li>
  )
}

function EventRow({ e, now }: { e: CalEvent; now: Date }) {
  const projects = useWorkspace((s) => s.projects)
  const KindIcon = KIND_ICON[e.kind]
  return (
    <li>
      <Link
        to={`/calendar/${e.id}`}
        className={cn(
          `hue-${eventHue(e, projects)}`,
          'grid grid-cols-[64px_3px_minmax(0,1fr)] gap-3 rounded-[16px] px-1 py-2.5 transition-[background-color,opacity] hover:bg-fill-hover',
          isPast(e, now) && 'opacity-55',
        )}
      >
        <span>
          <span className="tabular block text-[13px] font-semibold">{fmtTime(e.start)}</span>
          <span className="block text-[12px] text-ink-3">{durationLabel(e.lenMin)}</span>
        </span>
        <span className="rounded-full bg-[var(--hue)]" />
        <span className="min-w-0">
          <span className="block text-[15px] leading-snug font-semibold">{e.title}</span>
          {e.place && (
            <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-2">
              {isVideo(e) ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
              {e.place}
            </span>
          )}
          <span className="mt-2 flex items-center gap-2">
            {e.people.length > 1 && <AvatarStack ids={e.people} max={3} size={22} />}
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--hue)_18%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-ink">
              <KindIcon className="size-3" /> {EVENT_KIND_LABEL[e.kind]}
            </span>
          </span>
        </span>
      </Link>
    </li>
  )
}

export function DayPanel({ events, now }: { events: CalEvent[]; now: Date }) {
  const selected = useCalendarView((s) => s.selected)
  const projects = useWorkspace((s) => s.projects)
  const tasks = useWorkspace((s) => s.tasks)
  const newEvent = useUi((s) => s.newEvent)

  const day = parseDay(selected)
  const isToday = selected === dayKey(now)
  const list = useMemo(() => groupEventsByDay(events).get(selected) ?? [], [events, selected])
  const milestones = useMemo(() => milestonesByDay(projects).get(selected) ?? [], [projects, selected])
  const due = useMemo(
    () => tasks.filter((t) => t.due === selected && t.status !== 'done').sort((a, b) => RANK[a.priority] - RANK[b.priority]),
    [tasks, selected],
  )
  const nowAt = isToday ? list.findIndex((e) => new Date(e.start) > now) : -2

  const addHour = isToday ? Math.min(20, now.getHours() + 1) : 9

  return (
    <Card
      title={isToday ? 'Today' : fmtDate(day, { weekday: 'long' })}
      subtitle={`${fmtDate(day, { month: 'long', day: 'numeric' })} · ${list.length} event${list.length === 1 ? '' : 's'}`}
      action={
        <Button variant="soft" size="sm" onClick={() => newEvent({ start: at(day, addHour).toISOString() })}>
          <Plus /> Add event
        </Button>
      }
    >
      {milestones.map((m) => (
        <div
          key={m.id}
          className={cn(`hue-${m.project.hue}`, 'mb-2 flex items-center gap-3 rounded-[16px] bg-[color-mix(in_srgb,var(--hue)_18%,transparent)] px-3 py-2.5')}
        >
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--hue)] text-white">
            <MilestoneIcon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold">{m.title}</span>
            <span className="block text-[12px] text-ink-2">
              {m.project.name} milestone{m.done && ' · reached'}
            </span>
          </span>
        </div>
      ))}

      {list.length ? (
        <ol>
          {list.map((e, i) => (
            <Fragment key={e.id}>
              {i === nowAt && <NowLine now={now} />}
              <EventRow e={e} now={now} />
            </Fragment>
          ))}
          {nowAt === -1 && <NowLine now={now} />}
        </ol>
      ) : (
        <div className="rounded-[18px] bg-fill px-4 py-6 text-center">
          <p className="text-[15px] font-semibold">Nothing scheduled</p>
          <p className="mt-1 text-[13px] text-ink-2">A clear day. Add an event or keep it for deep work.</p>
        </div>
      )}

      <div className="mt-4 border-t border-sep pt-3">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{isToday ? 'Due today' : 'Due this day'}</h3>
          <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{due.length}</span>
        </div>
        {due.length ? (
          <ul>
            {due.slice(0, SHOW_TASKS).map((t) => (
              <li key={t.id}>
                <Link to={`/tasks/${t.id}`} className="flex items-center gap-2.5 rounded-[12px] px-1 py-2 transition-colors hover:bg-fill-hover">
                  <Avatar id={t.assignee} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{t.title}</span>
                    <ProjectChip id={t.projectId} className="mt-0.5" />
                  </span>
                  <PriorityBadge priority={t.priority} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-[13px] text-ink-3">Nothing due.</p>
        )}
        {due.length > SHOW_TASKS && (
          <Button asChild variant="link" size="none" className="mt-1 text-[13px]">
            <Link to="/tasks">{due.length - SHOW_TASKS} more in Tasks</Link>
          </Button>
        )}
      </div>
    </Card>
  )
}
