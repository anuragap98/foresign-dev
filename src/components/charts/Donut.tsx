import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'

export interface Slice {
  key: string
  value: number
  color: string
  label: string
}

/** Donut with a small gap between slices; slices sweep in clockwise. Hovering one dims the rest. */
export function Donut({ slices, size = 172, stroke = 20, center }: { slices: Slice[]; size?: number; stroke?: number; center?: ReactNode }) {
  const root = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<string | null>(null)
  const r = size / 2 - stroke / 2
  const c = 2 * Math.PI * r
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const gap = slices.length > 1 ? 3 : 0
  // Where each slice starts along the ring.
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((sum, s) => sum + (s.value / total) * c, 0))
  const signature = slices.map((s) => `${s.key}${s.value}`).join()

  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return
    gsap.from(root.current.querySelectorAll('[data-slice]'), { strokeDasharray: `0 ${c}`, duration: 0.9, ease: 'power3.out', stagger: 0.08 })
  }, [signature, c])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg ref={root} width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
        {slices.map((s, i) => {
          const len = Math.max(0, (s.value / total) * c - gap)
          return (
            <circle
              key={s.key}
              data-slice
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.key ? stroke + 4 : stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-starts[i]}
              strokeLinecap="butt"
              opacity={active && active !== s.key ? 0.35 : 1}
              className="transition-[opacity,stroke-width] duration-200"
              onPointerEnter={() => setActive(s.key)}
              onPointerLeave={() => setActive(null)}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          )
        })}
      </svg>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}
