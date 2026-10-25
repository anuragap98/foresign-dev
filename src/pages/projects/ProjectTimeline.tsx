import { useRef } from 'react'
import type { Project } from '@/data/types'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { elapsed, sortedMilestones } from '@/lib/projects'
import { fmtDate, parseDay } from '@/lib/time'
import { clamp, cn } from '@/lib/utils'

/** Start → due bar with today's marker and a dot per milestone. */
export function ProjectTimeline({ project: p, now }: { project: Project; now: Date }) {
  const root = useRef<HTMLDivElement>(null)
  const start = parseDay(p.started).getTime()
  const end = parseDay(p.due).getTime()
  const at = (key: string) => (end > start ? clamp((parseDay(key).getTime() - start) / (end - start)) : 1)
  const today = elapsed(p, now)
  const ms = sortedMilestones(p)
  const nextId = ms.find((m) => !m.done)?.id

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('[data-fill]', { scaleX: 0, duration: 1.1, ease: 'power3.out', delay: 0.3 })
      gsap.from('[data-dot]', { scale: 0, duration: 0.5, ease: 'back.out(2.5)', stagger: 0.08, delay: 0.6 })
      gsap.from('[data-today]', { autoAlpha: 0, y: 6, duration: 0.4, delay: 1.1 })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="pt-8">
      <div className="relative h-2">
        <div className="absolute inset-0 rounded-full bg-fill-2" />
        <div data-fill className="absolute inset-y-0 left-0 origin-left rounded-full bg-accent-ink" style={{ width: `${today * 100}%` }} />

        {ms.map((m) => (
          <span
            key={m.id}
            data-dot
            title={`${m.title} · ${fmtDate(parseDay(m.date))}${m.done ? ' · reached' : ''}`}
            className={cn(
              'absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
              m.done ? 'border-accent-ink bg-accent-ink' : 'border-accent-ink bg-[var(--glass-solid)]',
              m.id === nextId && 'shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-ink)_30%,transparent)]',
            )}
            style={{ left: `${at(m.date) * 100}%` }}
          />
        ))}

        {today > 0 && today < 1 && (
          <span data-today className="absolute bottom-full mb-2 -translate-x-1/2" style={{ left: `${today * 100}%` }}>
            <span className="lens block rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">Today</span>
            <span className="mx-auto mt-0.5 block h-3 w-[2px] rounded-full bg-ink" />
          </span>
        )}
      </div>
      <div className="mt-3 flex justify-between text-[12px]">
        <span>
          <span className="block text-ink-3">Started</span>
          <span className="font-semibold">{fmtDate(parseDay(p.started))}</span>
        </span>
        <span className="text-right">
          <span className="block text-ink-3">Due</span>
          <span className="font-semibold">{fmtDate(parseDay(p.due))}</span>
        </span>
      </div>
    </div>
  )
}
