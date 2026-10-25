import { ArrowUpRight, Minimize2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Glass } from '@/components/glass/Glass'
import { Flip, prefersReducedMotion } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui'
import { Button } from './button'

interface CardProps {
  /** Needed for `expandable` cards. */
  id?: string
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  expandable?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/**
 * Glass card with a title row. Expandable cards morph (GSAP Flip) into a
 * large overlay above a dimmed, blurred page; Esc or the scrim folds them back.
 */
export function Card({ id, title, subtitle, action, expandable, className, bodyClassName, children }: CardProps) {
  const expanded = useUi((s) => !!id && s.expanded === id)
  const setExpanded = useUi((s) => s.setExpanded)
  const holder = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLElement>(null)
  const flip = useRef<Flip.FlipState | null>(null)
  const [moving, setMoving] = useState(false)

  const toggle = (next: boolean) => {
    if (!card.current || !holder.current || !id) return
    // Hold the grid cell open while the card is lifted out of it.
    holder.current.style.height = `${holder.current.offsetHeight}px`
    flip.current = Flip.getState(card.current)
    setMoving(true)
    setExpanded(next ? id : null)
  }

  useLayoutEffect(() => {
    const state = flip.current
    if (!state) return
    flip.current = null
    Flip.from(state, {
      duration: prefersReducedMotion() ? 0 : 0.7,
      ease: 'power3.inOut',
      onComplete: () => {
        setMoving(false)
        if (!expanded && holder.current) holder.current.style.height = ''
      },
    })
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && toggle(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div ref={holder} data-enter className={cn('min-w-0', className)}>
      {expanded && <div data-state="open" className="anim-fade fixed inset-0 z-40 bg-scrim backdrop-blur-md" onClick={() => toggle(false)} />}
      <Glass
        ref={card}
        as="section"
        liquid={!moving && !expanded}
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'flex flex-col rounded-card p-5',
          expanded ? 'glass--thick fixed inset-x-[max(16px,6vw)] inset-y-[max(16px,7vh)] z-50 p-7' : 'h-full',
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] leading-tight font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {action}
            {expandable && (
              <Button variant="ghost" size="icon" className="size-8" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => toggle(!expanded)}>
                {expanded ? <Minimize2 /> : <ArrowUpRight />}
              </Button>
            )}
          </div>
        </div>
        <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
      </Glass>
    </div>
  )
}
