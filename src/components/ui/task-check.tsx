import { Check } from 'lucide-react'
import { useRef } from 'react'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'

interface TaskCheckProps {
  checked: boolean
  onToggle: () => void
  label: string
  size?: number
  className?: string
}

/** Round checkbox that springs when ticked. */
export function TaskCheck({ checked, onToggle, label, size = 22, className }: TaskCheckProps) {
  const box = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={box}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      data-no-drag
      onClick={(e) => {
        e.stopPropagation()
        if (box.current) gsap.fromTo(box.current, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.45)' })
        onToggle()
      }}
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
        checked ? 'border-transparent bg-accent text-white' : 'border-[var(--text-3)] hover:border-accent-ink',
        className,
      )}
    >
      {checked && <Check style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={3} />}
    </button>
  )
}
