import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { niceMax, tickIndices, useWidth } from './useWidth'

interface DayBarsProps {
  labels: string[]
  values: number[]
  color?: string
  unit?: string
  /** Overrides `unit` for axis and tooltip values, e.g. currency. */
  format?: (v: number) => string
  height?: number
  tooltipLabel?: (i: number) => string
}

const PAD = { l: 34, r: 6, t: 10, b: 26 }

/** One rounded bar per day; grows from the floor with a stagger. */
export function DayBars({ labels, values, color = 'var(--accent-ink)', unit = '', format = (v) => `${v}${unit}`, height = 200, tooltipLabel = (i) => labels[i] }: DayBarsProps) {
  const [wrap, w] = useWidth<HTMLDivElement>()
  const svg = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = values.length
  const maxY = niceMax(Math.max(1, ...values))
  const innerW = Math.max(1, w - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const slot = innerW / Math.max(1, n)
  const barW = Math.max(2, Math.min(28, slot * 0.68))
  const y = (v: number) => PAD.t + (1 - v / maxY) * innerH

  const signature = values.join()

  useLayoutEffect(() => {
    if (!svg.current || !w || prefersReducedMotion()) return
    gsap.from(svg.current.querySelectorAll('[data-bar]'), {
      scaleY: 0,
      transformOrigin: '50% 100%',
      duration: 0.8,
      ease: 'power3.out',
      stagger: { amount: 0.5 },
    })
  }, [signature, w])

  return (
    <div ref={wrap} className="relative w-full select-none">
      {w > 0 && (
        <svg
          ref={svg}
          width={w}
          height={height}
          aria-hidden
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setHover(Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left - PAD.l) / slot))))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, maxY / 2, maxY].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--sep)" />
              <text x={PAD.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-[var(--text-3)] text-[11px]">
                {format(v)}
              </text>
            </g>
          ))}
          {values.map((v, i) => {
            const h = Math.max(v > 0 ? 3 : 1.5, y(0) - y(v))
            return (
              <rect
                key={labels[i]}
                data-bar
                x={PAD.l + i * slot + (slot - barW) / 2}
                y={y(0) - h}
                width={barW}
                height={h}
                rx={Math.min(6, barW / 2)}
                fill={color}
                opacity={hover === null || hover === i ? (v ? 0.9 : 0.3) : 0.35}
                className="transition-opacity duration-150"
              />
            )
          })}
          {tickIndices(n).map((i) => (
            <text key={i} x={PAD.l + i * slot + slot / 2} y={height - 7} textAnchor="middle" className="fill-[var(--text-3)] text-[11px]">
              {labels[i]}
            </text>
          ))}
        </svg>
      )}
      {hover !== null && (
        <div
          className="glass glass--thick pointer-events-none absolute -top-2 z-10 rounded-[12px] px-2.5 py-1.5 text-[12px] whitespace-nowrap"
          style={{ left: Math.min(Math.max(PAD.l + hover * slot + slot / 2 - 60, 0), w - 120), width: 120 }}
        >
          <p className="font-semibold">{tooltipLabel(hover)}</p>
          <p className="tabular text-ink-2">
            {format(values[hover])}
          </p>
        </div>
      )}
    </div>
  )
}
