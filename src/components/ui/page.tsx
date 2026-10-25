import { useRef, type ReactNode, type RefObject } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { Glass } from '@/components/glass/Glass'
import { CountUp } from './count-up'

/**
 * Page entrance: the title slides up out of a mask, then every
 * `[data-enter]` block settles in from a soft, blurred, slightly small state.
 */
export function usePageEnter(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-title] > span', { yPercent: 110, duration: 0.8, ease: 'expo.out' })
        .from('[data-subtitle]', { autoAlpha: 0, y: 8, duration: 0.5 }, '-=0.55')
        .from(
          '[data-enter]',
          {
            autoAlpha: 0,
            y: 26,
            scale: 0.96,
            filter: 'blur(10px)',
            duration: 0.8,
            stagger: { each: 0.06, from: 'start' },
            clearProps: 'transform,filter,opacity,visibility',
          },
          '-=0.6',
        )
    },
    { scope },
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  usePageEnter(ref)
  return (
    <div ref={ref} className={cn('flex flex-col gap-[var(--gap)]', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-1">
      <div className="min-w-0">
        <h1 data-title className="display overflow-hidden pb-1 text-[length:var(--fs-title)] leading-[1.05] font-bold">
          <span className="block">{title}</span>
        </h1>
        {subtitle && (
          <p data-subtitle className="mt-1 text-[15px] text-ink-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div data-enter className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}

interface Stat {
  label: string
  value: number
  format?: (n: number) => string
  suffix?: ReactNode
}

/** Row of small glass stat tiles whose numbers count up. */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {stats.map((s) => (
        <Glass key={s.label} data-enter className="min-w-[104px] rounded-tile px-4 py-2.5">
          <p className="text-[12px] font-medium text-ink-2">{s.label}</p>
          <p className="display tabular mt-0.5 text-[22px] leading-tight font-bold">
            <CountUp value={s.value} format={s.format} />
            {s.suffix && <span className="ml-1 text-[14px] font-medium text-ink-3">{s.suffix}</span>}
          </p>
        </Glass>
      ))}
    </div>
  )
}
