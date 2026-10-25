import { Star } from 'lucide-react'
import { useRef } from 'react'
import type { Project } from '@/data/types'
import { PROJECT_STATUS_LABEL } from '@/data/types'
import { gsap } from '@/lib/gsap'
import { PROJECT_STATUS_HUE } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export function StatusPill({ status }: { status: Project['status'] }) {
  return (
    <span
      className={cn(
        `hue-${PROJECT_STATUS_HUE[status]}`,
        'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--hue)_18%,transparent)] px-2 py-0.5 text-[12px] font-semibold',
      )}
    >
      <i className="size-1.5 rounded-full bg-[var(--hue)]" />
      {PROJECT_STATUS_LABEL[status]}
    </span>
  )
}

/** Star toggle that pins a project to the sidebar; it spins and pops when switched on. */
export function PinButton({ project, className, withLabel }: { project: Project; className?: string; withLabel?: boolean }) {
  const togglePin = useWorkspace((s) => s.togglePin)
  const star = useRef<SVGSVGElement>(null)
  const label = `${project.pinned ? 'Unpin' : 'Pin'} ${project.name} ${project.pinned ? 'from' : 'to'} the sidebar`

  return (
    <button
      type="button"
      aria-pressed={project.pinned}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!project.pinned && star.current)
          gsap.fromTo(star.current, { scale: 0.4, rotate: -72 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'elastic.out(1.2, 0.5)' })
        togglePin(project.id)
      }}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full transition-colors',
        withLabel ? 'glass glass--chrome h-10 px-4 text-[15px] font-medium hover:bg-fill-hover' : 'size-8 justify-center hover:bg-fill-2',
        className,
      )}
    >
      <Star
        ref={star}
        className={cn('size-[18px]', project.pinned ? 'fill-[var(--yellow)] text-[var(--yellow)]' : 'text-ink-2')}
      />
      {withLabel && (project.pinned ? 'Pinned' : 'Pin')}
    </button>
  )
}
