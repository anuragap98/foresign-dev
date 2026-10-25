import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { niceMax, tickIndices, useWidth } from './useWidth'

export interface Series {
  label: string
  values: number[]
  color: string
  dashed?: boolean
  fill?: boolean
}

interface LineChartProps {
  labels: string[]
  series: Series[]
  height?: number
  unit?: string
  /** Long label for the tooltip, e.g. a full date. */
  tooltipLabel?: (i: number) => string
}

const PAD = { l: 34, r: 10, t: 12, b: 26 }

/** Line chart with optional area fill, a hover crosshair and a draw-in animation. */
export function LineChart({ labels, series, height = 220, unit = '', tooltipLabel = (i) => labels[i] }: LineChartProps) {
  const [wrap, w] = useWidth<HTMLDivElement>()
  const svg = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = labels.length
  const maxY = niceMax(Math.max(1, ...series.flatMap((s) => s.values)))
  const innerW = Math.max(1, w - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const y = (v: number) => PAD.t + (1 - v / maxY) * innerH
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const signature = `${w}:${series.map((s) => s.values.join()).join('|')}`

  useLayoutEffect(() => {
    const root = svg.current
    if (!root || !w || prefersReducedMotion()) return
    root.querySelectorAll<SVGPathElement>('[data-line]').forEach((p) => {
      if (p.dataset.dashed) {
        gsap.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 })
        return
      }
      const len = p.getTotalLength()
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' })
    })
    gsap.fromTo(root.querySelectorAll('[data-area]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 0.4 })
  }, [signature, w])

  return (
    <div ref={wrap} className="relative w-full select-none">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-[12px] text-ink-2">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <i className="w-4 rounded-full" style={s.dashed ? { borderTop: `2px dashed ${s.color}` } : { height: 3, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {w > 0 && (
        <svg
          ref={svg}
          width={w}
          height={height}
          aria-hidden
          className="overflow-visible"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - PAD.l) / innerW) * (n - 1)))))
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.label} id={`lc-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: s.color, stopOpacity: 0.3 }} />
                <stop offset="1" style={{ stopColor: s.color, stopOpacity: 0 }} />
              </linearGradient>
            ))}
          </defs>
          {[0, maxY / 2, maxY].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--sep)" />
              <text x={PAD.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-[var(--text-3)] text-[11px]">
                {v}
              </text>
            </g>
          ))}
          {tickIndices(n).map((i) => (
            <text key={i} x={x(i)} y={height - 7} textAnchor="middle" className="fill-[var(--text-3)] text-[11px]">
              {labels[i]}
            </text>
          ))}
          {series.map((s, i) =>
            s.fill ? <path key={`a-${s.label}`} data-area d={`${path(s.values)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={`url(#lc-fill-${i})`} /> : null,
          )}
          {series.map((s) => (
            <path
              key={s.label}
              data-line
              data-dashed={s.dashed ? '1' : undefined}
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 2 : 2.75}
              strokeDasharray={s.dashed ? '5 5' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH} stroke="var(--text-3)" strokeDasharray="2 3" />
              {series.map((s) => (
                <circle key={s.label} cx={x(hover)} cy={y(s.values[hover])} r={s.dashed ? 3.5 : 5} fill={s.dashed ? 'var(--glass-solid)' : s.color} stroke={s.dashed ? s.color : 'var(--glass-solid)'} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <div
          className="glass glass--thick pointer-events-none absolute top-8 z-10 rounded-[14px] px-3 py-2 text-[12px]"
          style={{ left: Math.min(Math.max(x(hover) - 80, 0), w - 160), width: 160 }}
        >
          <p className="font-semibold">{tooltipLabel(hover)}</p>
          {series.map((s) => (
            <p key={s.label} className="mt-0.5 flex justify-between gap-2 text-ink-2">
              <span className="truncate">{s.label}</span>
              <span className="tabular font-semibold" style={{ color: s.dashed ? 'var(--text)' : s.color }}>
                {s.values[hover]}
                {unit}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
