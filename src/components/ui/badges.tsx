import { Flag } from 'lucide-react'
import type { Hue, Priority } from '@/data/types'
import { PRIORITY_LABEL } from '@/data/types'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export function HueChip({ hue, children, className }: { hue: Hue; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        `hue-${hue}`,
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-[3px] text-[12px] font-medium text-ink',
        'bg-[color-mix(in_srgb,var(--hue)_18%,transparent)]',
        className,
      )}
    >
      <i className="size-1.5 shrink-0 rounded-full bg-[var(--hue)]" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function ProjectChip({ id, className }: { id: string; className?: string }) {
  const project = useWorkspace((s) => s.projects.find((p) => p.id === id))
  if (!project) return null
  return (
    <HueChip hue={project.hue} className={className}>
      {project.name}
    </HueChip>
  )
}

const PRIORITY_TONE: Record<Priority, string> = {
  urgent: 'text-[var(--prio-urgent)] bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]',
  high: 'text-[var(--prio-high)] bg-[color-mix(in_srgb,var(--orange)_14%,transparent)]',
  medium: 'text-[var(--prio-medium)] bg-[color-mix(in_srgb,var(--blue)_14%,transparent)]',
  low: 'text-ink-3 bg-fill',
}

/** Shows only urgent and high unless `always` is set. */
export function PriorityBadge({ priority, always = false }: { priority: Priority; always?: boolean }) {
  if (!always && (priority === 'low' || priority === 'medium')) return null
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold', PRIORITY_TONE[priority])}>
      {priority === 'urgent' && <Flag className="size-3" strokeWidth={2.4} />}
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
