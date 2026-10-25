import { CalendarDays, CheckCircle2, SquareCheck } from 'lucide-react'
import { Link } from 'react-router'
import { ProgressRing } from '@/components/charts/Rings'
import { Glass } from '@/components/glass/Glass'
import { AvatarStack } from '@/components/ui/avatar'
import { PinButton, StatusPill } from '@/components/ui/project-bits'
import { ProjectIcon } from '@/components/ui/project-icon'
import type { Project, Task } from '@/data/types'
import { nextMilestone, projectHealth, relDays } from '@/lib/projects'
import { fmtDate, parseDay } from '@/lib/time'
import { cn } from '@/lib/utils'

export function ProjectCard({ project: p, tasks, now }: { project: Project; tasks: Task[]; now: Date }) {
  const health = projectHealth(p, tasks, now)
  const next = nextMilestone(p)
  const shipped = p.status === 'shipped'

  return (
    <div data-enter className="min-w-0">
      <Glass
        as="article"
        className={cn(
          `hue-${p.hue}`,
          'group relative flex h-full flex-col rounded-card p-5 transition-transform duration-300 ease-glass hover:-translate-y-1',
        )}
      >
        <div className="flex items-start gap-3.5">
          <ProjectIcon icon={p.icon} hue={p.hue} size={48} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[18px] font-semibold">
              {/* The title link stretches over the whole card. */}
              <Link to={`/projects/${p.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:shadow-[0_0_0_2px_var(--accent-ink)]">
                {p.name}
              </Link>
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusPill status={p.status} />
              {!shipped && !health.onTrack && (
                <span className="text-[12px] font-semibold text-[var(--prio-high)]">Behind</span>
              )}
            </div>
          </div>
          <PinButton project={p} className="relative z-10 -mt-1 -mr-1" />
        </div>

        <p className="mt-3.5 line-clamp-2 min-h-[2lh] text-[14px] leading-snug text-ink-2">{p.summary || 'No summary yet.'}</p>

        <div className="mt-4 flex items-center gap-4 rounded-[20px] bg-fill p-3.5">
          <ProgressRing value={health.pct / 100} size={58} stroke={6} color="var(--hue)">
            <span className="tabular text-[13px] font-bold">{health.pct}%</span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[12px] text-ink-2">{shipped ? 'Shipped' : 'Next milestone'}</p>
            {shipped ? (
              <>
                <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                  <CheckCircle2 className="size-4 text-[var(--green)]" /> Every milestone met
                </p>
                <p className="text-[12px] text-ink-3">{fmtDate(parseDay(p.due))}</p>
              </>
            ) : next ? (
              <>
                <p className="truncate text-[15px] font-semibold">{next.title}</p>
                <p className="text-[12px] text-ink-3">
                  {fmtDate(parseDay(next.date))} · {relDays(next.date, now)}
                </p>
              </>
            ) : (
              <p className="text-[15px] font-semibold text-ink-2">No milestones yet</p>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-4 text-[13px] text-ink-2">
          <AvatarStack ids={p.members} max={4} size={26} />
          <span className="inline-flex items-center gap-1">
            <SquareCheck className="size-3.5" />
            <span className="tabular">
              {health.done}/{health.total} tasks
            </span>
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {fmtDate(parseDay(p.due))}
          </span>
        </div>
      </Glass>
    </div>
  )
}
