import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

interface WeekBarsProps {
  labels: string[]
  values: number[]
  highlight: number
  className?: string
}

/** Tall glass columns; the fill grows from the floor, today's is lit. */
export function WeekBars({ labels, values, highlight, className }: WeekBarsProps) {
  const root = useRef<HTMLDivElement>(null)
  const max = Math.max(4, ...values)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('[data-bar]', { scaleY: 0, duration: 1, ease: 'elastic.out(1, 0.75)', stagger: 0.06, delay: 0.3 })
    },
    { scope: root, dependencies: [values.join()] },
  )

  return (
    <div ref={root} className={cn('flex h-full min-h-[170px] items-stretch gap-[6px]', className)} role="list">
      {values.map((v, i) => (
        <div
          key={labels[i]}
          role="listitem"
          aria-label={`${labels[i]}: ${v} done`}
          title={`${labels[i]}: ${v} done`}
          className="group flex flex-1 flex-col items-center gap-2"
        >
          <div className="relative w-full flex-1 overflow-hidden rounded-[14px] bg-well">
            <div
              data-bar
              className={cn('absolute inset-x-0 bottom-0 origin-bottom rounded-[14px] transition-[filter] group-hover:brightness-110')}
              style={{
                height: `${Math.max(v ? 6 : 2, (v / max) * 100)}%`,
                background:
                  i === highlight
                    ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent-ink) 85%, #fff), var(--accent-ink))'
                    : 'linear-gradient(180deg, color-mix(in srgb, var(--accent-ink) 78%, transparent), color-mix(in srgb, var(--accent-ink) 42%, transparent))',
                boxShadow: 'inset 0 1px 1px #ffffff59',
              }}
            >
              <span className="absolute inset-x-0 top-1.5 text-center text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {v}
              </span>
            </div>
          </div>
          <span className={cn('text-[12px]', i === highlight ? 'font-semibold text-ink' : 'text-ink-2')}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}
