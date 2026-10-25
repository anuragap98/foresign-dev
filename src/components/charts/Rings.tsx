import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { clamp } from '@/lib/utils'

interface Ring {
  label: string
  value: number // 0..1
  color: string
}

/** Concentric activity rings; arcs sweep in from twelve o'clock. */
export function Rings({ rings, size = 168, stroke = 15 }: { rings: Ring[]; size?: number; stroke?: number }) {
  const root = useRef<SVGSVGElement>(null)
  const gap = 3
  const c = size / 2

  useGSAP(
    () => {
      root.current?.querySelectorAll<SVGCircleElement>('[data-arc]').forEach((arc) => {
        const target = Number(arc.dataset.offset)
        const full = Number(arc.dataset.length)
        if (prefersReducedMotion()) gsap.set(arc, { strokeDashoffset: target })
        else gsap.fromTo(arc, { strokeDashoffset: full }, { strokeDashoffset: target, duration: 1.4, ease: 'power3.out', delay: 0.25 })
      })
    },
    { scope: root, dependencies: [rings.map((r) => r.value).join()] },
  )

  return (
    <svg ref={root} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={rings.map((r) => `${r.label} ${Math.round(r.value * 100)}%`).join(', ')}>
      {rings.map((ring, i) => {
        const r = c - stroke / 2 - i * (stroke + gap)
        const len = 2 * Math.PI * r
        const offset = len * (1 - clamp(ring.value))
        return (
          <g key={ring.label} transform={`rotate(-90 ${c} ${c})`}>
            <circle cx={c} cy={c} r={r} fill="none" stroke={ring.color} strokeOpacity="0.2" strokeWidth={stroke} />
            <circle
              data-arc
              data-length={len}
              data-offset={offset}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len}
              style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${ring.color} 45%, transparent))` }}
            />
          </g>
        )
      })}
    </svg>
  )
}

/** Single progress ring with optional centre content. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--accent-ink)',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
}) {
  const r = size / 2 - stroke / 2
  const len = 2 * Math.PI * r
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - clamp(value))}
          className="transition-[stroke-dashoffset] duration-700 ease-glass"
        />
      </svg>
      {children}
    </span>
  )
}
