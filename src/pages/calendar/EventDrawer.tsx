import { Clock, MapPin, PhoneOff, Trash2, Video } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Avatar, PRESENCE_LABEL } from '@/components/ui/avatar'
import { ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/dialog'
import { EVENT_KIND_LABEL, type CalEvent } from '@/data/types'
import { eventHue, isPast, isVideo, KIND_ICON } from '@/lib/calendar'
import { eventEnd, useNow } from '@/lib/derive'
import { fmtDate, fmtTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { usePeopleById } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'

function Tile({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-tile bg-fill px-3.5 py-2.5', className)}>
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold">{children}</div>
    </div>
  )
}

export function EventDrawer({ eventId }: { eventId?: string }) {
  const event = useWorkspace((s) => s.events.find((e) => e.id === eventId))
  const projects = useWorkspace((s) => s.projects)
  const removeEvent = useWorkspace((s) => s.removeEvent)
  const peopleById = usePeopleById()
  const navigate = useNavigate()
  const now = useNow(30_000)
  const [inCall, setInCall] = useState<string | null>(null)

  // Keep showing the last event while the drawer slides out.
  const [shown, setShown] = useState<CalEvent | undefined>(event)
  if (event && event !== shown) setShown(event)
  if (!shown) return null

  const close = () => navigate('/calendar')
  const KindIcon = KIND_ICON[shown.kind]
  const hue = eventHue(shown, projects)
  const live = new Date(shown.start) <= now && !isPast(shown, now)
  const joined = inCall === shown.id

  return (
    <Drawer
      open={!!event}
      onOpenChange={(o) => !o && close()}
      title={shown.title}
      eyebrow={
        <>
          <span
            className={cn(
              `hue-${hue}`,
              'inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--hue)_22%,transparent)] px-2 py-[3px] text-[12px] font-semibold',
            )}
          >
            <KindIcon className="size-3.5 text-[var(--hue)]" /> {EVENT_KIND_LABEL[shown.kind]}
          </span>
          {live && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] px-2 py-[3px] text-[12px] font-semibold text-danger">
              <i className="size-1.5 animate-pulse rounded-full bg-danger" /> Happening now
            </span>
          )}
        </>
      }
      footer={
        <>
          {isVideo(shown) && !isPast(shown, now) && (
            <Button variant={joined ? 'soft' : 'gel'} onClick={() => setInCall(joined ? null : shown.id)}>
              {joined ? <PhoneOff /> : <Video />}
              {joined ? 'Leave call' : 'Join call'}
            </Button>
          )}
          <Button
            variant="danger"
            className="ml-auto"
            onClick={() => {
              removeEvent(shown.id)
              close()
            }}
          >
            <Trash2 /> Remove
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="When" className="col-span-2">
          <Clock className="size-4 shrink-0 text-ink-2" />
          {fmtDate(shown.start, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtTime(shown.start)} – {fmtTime(eventEnd(shown))}
        </Tile>
        <Tile label="Where">
          {isVideo(shown) ? <Video className="size-4 shrink-0 text-ink-2" /> : <MapPin className="size-4 shrink-0 text-ink-2" />}
          <span className="truncate">{shown.place ?? 'Not set'}</span>
        </Tile>
        <Tile label="Project">{shown.projectId ? <ProjectChip id={shown.projectId} /> : <span className="text-ink-3">None</span>}</Tile>
      </div>

      {joined && (
        <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-[color-mix(in_srgb,var(--green)_16%,transparent)] px-3.5 py-2.5 text-[13px] font-medium">
          <i className="size-2 animate-pulse rounded-full bg-[var(--green)]" /> You’re in the call. This demo has no real call link.
        </p>
      )}

      <div className="mt-6 mb-2 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">People</h3>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{shown.people.length}</span>
      </div>
      <ul>
        {shown.people.map((id) => {
          const p = peopleById[id]
          if (!p) return null
          return (
            <li key={id} className="flex items-center gap-3 border-b border-sep py-2 last:border-b-0">
              <Avatar id={id} size={32} presence />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                <span className="block truncate text-[12px] text-ink-2">
                  {p.role} · {PRESENCE_LABEL[p.presence]}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Drawer>
  )
}
