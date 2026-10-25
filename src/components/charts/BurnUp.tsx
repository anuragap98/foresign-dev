import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import type { BurnPoint } from '@/lib/projects'
import { fmtDate, parseDay } from '@/lib/time'
import { niceMax, tickIndices } from './useWidth'

const PAD = { l: 58, r: 14, t: 14, b: 30 }

/**
 * Burn-up chart: work done (solid, filled) climbing towards the total in
 * scope (dashed). The gap between the lines is what is left.
 */
export function BurnUp({ points, height = 240 }: { points: BurnPoint[]; height?: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const donePath = useRef<SVGPathElement>(null)
  const area = useRef<SVGPathElement>(null)
  const [w, setW] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = points.length
  const maxY = niceMax(Math.max(1, ...points.map((p) => p.total)))
  const innerW = Math.max(1, w - PAD.l - PAD.r)
  const innerH = height - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const y = (v: number) => PAD.t + (1 - v / maxY) * innerH
  const line = (key: 'done' | 'total') => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
  const doneD = line('done')
  const areaD = n ? `${doneD}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z` : ''
  const ticks = tickIndices(n)

  // Draw the done line in from the left whenever the data or size changes.
  useLayoutEffect(() => {
    const path = donePath.current
    if (!path || !w || prefersReducedMotion()) return
    const len = path.getTotalLength()
    gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' })
    gsap.fromTo(area.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 0.5 })
  }, [doneD, w])

  if (n < 2) {
    return (
      <div ref={wrap}>
        <p className="py-10 text-center text-[14px] text-ink-3">Not enough history yet. Check back in a day or two.</p>
      </div>
    )
  }

  const last = points[n - 1]
  const h = hover !== null ? points[hover] : null

  return (
    <div ref={wrap} className="relative w-full select-none">
      <div className="mb-2 flex items-center gap-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-[3px] w-4 rounded-full bg-accent-ink" /> Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="w-4 border-t-2 border-dashed border-[var(--text-3)]" /> Total
        </span>
      </div>

      {w > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={`Burn-up: ${last.done} of ${last.total} tasks done as of ${fmtDate(parseDay(last.day))}`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left - PAD.l) / innerW) * (n - 1))
            setHover(Math.max(0, Math.min(n - 1, i)))
          }}
          onPointerLeave={() => setHover(null)}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="burn-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--accent-ink)', stopOpacity: 0.32 }} />
              <stop offset="1" style={{ stopColor: 'var(--accent-ink)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {[0, maxY / 2, maxY].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--sep)" />
              <text x={PAD.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-[var(--text-3)] text-[11px]">
                {v} tasks
              </text>
            </g>
          ))}
          {ticks.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--text-3)] text-[11px]">
              {fmtDate(parseDay(points[i].day))}
            </text>
          ))}

          <path ref={area} d={areaD} fill="url(#burn-fill)" />
          <path d={line('total')} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />
          <path ref={donePath} d={doneD} fill="none" stroke="var(--accent-ink)" strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />

          {h && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH} stroke="var(--text-3)" strokeDasharray="2 3" />
              <circle cx={x(hover)} cy={y(h.total)} r={4} fill="var(--glass-solid)" stroke="var(--text-2)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(h.done)} r={5} fill="var(--accent-ink)" stroke="var(--glass-solid)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {h && hover !== null && (
        <div
          className="glass glass--thick pointer-events-none absolute top-8 z-10 rounded-[14px] px-3 py-2 text-[12px]"
          style={{ left: Math.min(Math.max(x(hover) - 70, 0), w - 140), width: 140 }}
        >
          <p className="font-semibold">{fmtDate(parseDay(h.day), { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          <p className="mt-0.5 flex justify-between text-ink-2">
            Done <span className="tabular font-semibold text-accent-ink">{h.done}</span>
          </p>
          <p className="flex justify-between text-ink-2">
            Total <span className="tabular font-semibold text-ink">{h.total}</span>
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>Tasks done and total by day</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th>{fmtDate(parseDay(p.day))}</th>
              <td>{p.done} done</td>
              <td>{p.total} total</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
