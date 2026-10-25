import { Mail, Moon, SquareCheck, Sun } from 'lucide-react'
import { Link } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import { Avatar, PRESENCE_LABEL } from '@/components/ui/avatar'
import { HueChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { ME } from '@/lib/session'
import type { Person, Task } from '@/data/types'
import { localClock, PRESENCE_TONE, TEAM_HUE, workload } from '@/lib/team'
import { cn } from '@/lib/utils'

export function PersonCard({ person: p, tasks, now }: { person: Person; tasks: Task[]; now: Date }) {
  const clock = localClock(p, now)
  const load = workload(p, tasks)
  const isMe = p.id === ME

  return (
    <div data-enter className="min-w-0">
      <Glass
        as="article"
        className={cn('relative flex h-full flex-col rounded-card p-5 transition-transform duration-300 ease-glass hover:-translate-y-1', isMe && 'shadow-[var(--depth),0_0_0_1.5px_color-mix(in_srgb,var(--accent-ink)_45%,transparent),var(--shadow)]')}
      >
        <div className="flex items-start gap-3.5">
          <Avatar id={p.id} size={52} presence />
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold">
              <Link
                to={`/team/${p.id}`}
                className="truncate outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:shadow-[0_0_0_2px_var(--accent-ink)]"
              >
                {p.name}
              </Link>
              {isMe && <span className="rounded-full bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-accent-ink">You</span>}
            </h2>
            <p className="truncate text-[13px] text-ink-2">{p.role}</p>
            <HueChip hue={TEAM_HUE[p.team]} className="mt-1.5">
              {p.team}
            </HueChip>
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3 text-[13px]">
          <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
            <i className="size-2 shrink-0 rounded-full" style={{ background: PRESENCE_TONE[p.presence] }} />
            <span className="truncate">
              {PRESENCE_LABEL[p.presence]}
              {p.presenceNote && p.presence !== 'online' && <span className="text-ink-3"> · {p.presenceNote}</span>}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="flex items-center justify-end gap-1.5 font-semibold">
              {clock.daytime ? <Sun className="size-3.5 text-[var(--yellow)]" /> : <Moon className="size-3.5 text-[var(--indigo)]" />}
              <span className="tabular">{clock.time}</span>
              <span className="font-normal text-ink-2">{p.city}</span>
            </span>
            <span className="block text-[12px] text-ink-3">{clock.relative}</span>
          </span>
        </div>

        <div className="mt-4 rounded-[18px] bg-fill px-3.5 py-3">
          <div className="flex items-baseline justify-between text-[13px]">
            <span className="text-ink-2">Workload</span>
            <span className="tabular font-semibold">
              {load.hours}h <span className="font-normal text-ink-3">/ {p.capacityH}h</span>
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-2"
            role="meter"
            aria-label={`${p.name} workload`}
            aria-valuemin={0}
            aria-valuemax={p.capacityH}
            aria-valuenow={load.hours}
          >
            <div className="h-full rounded-full transition-[width] duration-700 ease-glass" style={{ width: `${Math.min(100, load.ratio * 100)}%`, background: load.tone }} />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
            <SquareCheck className="size-4" />
            <span className="tabular font-semibold text-ink">{load.open.length}</span> open task{load.open.length === 1 ? '' : 's'}
          </span>
          <Button asChild variant="soft" size="sm" className="relative z-10 ml-auto">
            <Link to={`/team/${p.id}`}>Profile</Link>
          </Button>
          {!isMe && (
            <Button asChild variant="soft" size="icon" className="relative z-10 size-8">
              <a href={`mailto:${p.email}`} aria-label={`Email ${p.name.split(' ')[0]}`}>
                <Mail />
              </a>
            </Button>
          )}
        </div>
      </Glass>
    </div>
  )
}
