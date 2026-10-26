import { useLayoutEffect, useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Pill-shaped segmented control; the glass thumb springs to the chosen option. */
export function Segmented<T extends string>({ value, options, onChange, label, size = 'sm', className }: SegmentedProps<T>) {
  const root = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLSpanElement>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const btn = root.current?.querySelector<HTMLElement>(`[data-value="${value}"]`)
    if (!thumb.current) return
    // A value with no option (e.g. a task parked as blocked) selects nothing.
    if (!btn) {
      gsap.set(thumb.current, { autoAlpha: 0 })
      placed.current = false
      return
    }
    if (!placed.current) gsap.set(thumb.current, { autoAlpha: 1 })
    const to = { x: btn.offsetLeft, width: btn.offsetWidth }
    if (!placed.current) {
      gsap.set(thumb.current, to)
      placed.current = true
    } else {
      gsap.to(thumb.current, { ...to, duration: 0.5, ease: 'elastic.out(1, 0.8)' })
    }
  }, [value, options.length])

  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={label}
      className={cn('relative inline-flex shrink-0 rounded-full bg-fill p-[3px]', className)}
    >
      <span ref={thumb} aria-hidden className="lens absolute inset-y-[3px] left-0 rounded-full" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          data-value={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-200',
            size === 'sm' ? 'h-7 px-3 text-[13px]' : 'h-8 px-4 text-[14px]',
            o.value === value ? 'text-ink' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
