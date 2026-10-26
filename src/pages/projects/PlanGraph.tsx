import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { LiveDot } from '@/components/ui/live-dot'
import { STATUS_LABEL, type Project, type Task } from '@/data/types'
import { planLayout } from '@/lib/plan'
import { STATUS_TONE } from '@/lib/tasks'
import { useTaskAgent } from '@/lib/useTaskAgent'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

const W = 208
const H = 72
const GX = 56
const GY = 12

function Node({ task, x, y, dim, onHover }: { task: Task; x: number; y: number; dim: boolean; onHover: (id: string | null) => void }) {
  const { liveRun } = useTaskAgent(task)
  const done = task.status === 'done'
  const tone = STATUS_TONE[task.status]
  return (
    <Link
      to={`/tasks/${task.id}`}
      onMouseEnter={() => onHover(task.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(task.id)}
      onBlur={() => onHover(null)}
      aria-label={`${task.title}, ${STATUS_LABEL[task.status]}`}
      className={cn(
        'tile absolute flex flex-col justify-between rounded-[16px] border-l-[3px] px-3 py-2 transition-[opacity,transform] duration-200 hover:-translate-y-px',
        dim && 'opacity-40',
        done && 'opacity-70',
      )}
      style={{ left: x, top: y, width: W, height: H, borderLeftColor: tone }}
    >
      <span className={cn('line-clamp-2 text-[13px] leading-snug font-semibold', done && 'text-ink-2 line-through')}>{task.title}</span>
      <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
        {liveRun ? <LiveDot color="var(--blue)" live className="size-2" /> : <i className="size-2 shrink-0 rounded-full" style={{ background: tone }} />}
        <span className="truncate">{liveRun && task.status === 'doing' ? 'Working' : STATUS_LABEL[task.status]}</span>
        <span className="ml-auto">
          <Avatar id={task.assignee} size={18} />
        </span>
      </span>
    </Link>
  )
}

/** The project's tasks as a dependency graph: what has to happen before what. */
export function PlanGraph({ project }: { project: Project }) {
  const allTasks = useWorkspace((s) => s.tasks)
  const tasks = useMemo(() => allTasks.filter((t) => t.projectId === project.id), [allTasks, project.id])
  const layout = useMemo(() => planLayout(tasks), [tasks])
  const [hover, setHover] = useState<string | null>(null)
  const expanded = useUi((s) => s.expanded === `plan-${project.id}`)
  if (!layout.edges.length) return null

  const byId = new Map(tasks.map((t) => [t.id, t]))
  const pos = new Map<string, { x: number; y: number }>()
  layout.layers.forEach((layer, c) => layer.forEach((id, r) => pos.set(id, { x: c * (W + GX), y: r * (H + GY) })))
  const width = layout.layers.length * (W + GX) - GX
  const height = Math.max(...layout.layers.map((l) => l.length)) * (H + GY) - GY

  // Hovering a task lights up what it waits on and what waits on it.
  const linked = new Set<string>()
  if (hover) {
    linked.add(hover)
    for (const e of layout.edges) {
      if (e.to === hover) linked.add(e.from)
      if (e.from === hover) linked.add(e.to)
    }
  }
  const done = tasks.filter((t) => t.status === 'done').length

  return (
    <Card
      id={`plan-${project.id}`}
      expandable
      title="Plan"
      subtitle={`${tasks.length} tasks in ${layout.layers.length} steps · ${done} done`}
    >
      <div className={cn('scroll-thin -mx-1 overflow-auto px-1 pb-1', expanded ? 'h-[calc(100%-28px)]' : 'max-h-[420px]')}>
        <div className="relative" style={{ width, height }}>
          <svg aria-hidden className="absolute inset-0 overflow-visible" width={width} height={height}>
            {layout.edges.map((e) => {
              const a = pos.get(e.from)!
              const b = pos.get(e.to)!
              const x1 = a.x + W
              const y1 = a.y + H / 2
              const x2 = b.x
              const y2 = b.y + H / 2
              const lit = hover && (e.from === hover || e.to === hover)
              const met = byId.get(e.from)?.status === 'done'
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M${x1},${y1} C${x1 + GX * 0.6},${y1} ${x2 - GX * 0.6},${y2} ${x2},${y2}`}
                  fill="none"
                  strokeWidth={lit ? 2.5 : 1.5}
                  stroke={lit ? 'var(--accent-ink)' : met ? 'color-mix(in srgb, var(--green) 55%, transparent)' : 'var(--text-3)'}
                  strokeDasharray={met ? undefined : '4 4'}
                  opacity={hover && !lit ? 0.25 : 1}
                  className="transition-[opacity,stroke] duration-200"
                />
              )
            })}
          </svg>
          {[...pos].map(([id, p]) => (
            <Node key={id} task={byId.get(id)!} x={p.x} y={p.y} dim={!!hover && !linked.has(id)} onHover={setHover} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">Solid lines are met dependencies, dashed ones still wait. Hover a task to see its links.</p>
    </Card>
  )
}
