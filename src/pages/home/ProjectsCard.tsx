import { Link } from 'react-router'
import { AvatarStack } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProjectIcon } from '@/components/ui/project-icon'
import { PROJECT_STATUS_LABEL } from '@/data/types'
import { projectProgress } from '@/lib/derive'
import { fmtDate, parseDay } from '@/lib/time'
import { useWorkspace } from '@/store/workspace'

export function ProjectsCard({ className }: { className?: string }) {
  const projects = useWorkspace((s) => s.projects)
  const tasks = useWorkspace((s) => s.tasks)
  const active = projects.filter((p) => p.status !== 'shipped')

  return (
    <Card
      title="Projects"
      className={className}
      action={
        <Button asChild variant="link" size="none" className="text-[14px]">
          <Link to="/projects">See all</Link>
        </Button>
      }
    >
      <ul className="-mx-2">
        {active.map((p) => {
          const { pct } = projectProgress(p, tasks)
          return (
            <li key={p.id}>
              <Link
                to={`/projects/${p.id}`}
                className={`hue-${p.hue} grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] px-2 py-2 transition-colors hover:bg-fill-hover sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto_auto]`}
              >
                <ProjectIcon icon={p.icon} hue={p.hue} size={38} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                  <span className="block truncate text-[12px] text-ink-2">
                    {PROJECT_STATUS_LABEL[p.status]} · due {fmtDate(parseDay(p.due))}
                  </span>
                </span>
                <span className="hidden items-center gap-3 sm:flex">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill-2">
                    <span className="block h-full rounded-full bg-[var(--hue)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="tabular w-9 text-right text-[13px] font-semibold">{pct}%</span>
                </span>
                <span className="hidden sm:block">
                  <AvatarStack ids={p.members} max={3} size={24} />
                </span>
                <span className="tabular text-[13px] font-semibold sm:hidden">{pct}%</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
