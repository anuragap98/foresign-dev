import { Check } from 'lucide-react'
import type { Wall } from '@/store/look'
import { cn } from '@/lib/utils'

interface ThumbProps {
  wall: Wall
  label: string
  theme: 'light' | 'dark'
  selected: boolean
  onSelect: () => void
}

/**
 * A tiny copy of the app rendered on a wallpaper. The wrapper carries its own
 * data-theme/data-wall, so the same CSS variables as the real app resolve
 * inside it and each thumbnail is an honest preview.
 */
export function WallpaperThumb({ wall, label, theme, selected, onSelect }: ThumbProps) {
  const id = `thumb-${wall}`
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${label} wallpaper`}
      onClick={onSelect}
      className="group flex flex-col items-center gap-1.5 outline-none"
    >
      <span
        data-theme={theme}
        data-wall={wall}
        className={cn(
          'relative block aspect-[4/3] w-full overflow-hidden rounded-[14px] transition-[box-shadow,transform] duration-300 ease-glass group-hover:-translate-y-0.5',
          selected ? 'shadow-[0_0_0_2.5px_var(--accent-ink)]' : 'shadow-[0_0_0_1px_var(--sep)] group-focus-visible:shadow-[0_0_0_2px_var(--accent-ink)]',
        )}
      >
        <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--wbg1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--wbg2)' }} />
            </linearGradient>
            <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--wa1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--wa2)' }} />
            </linearGradient>
            <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0.6">
              <stop offset="0" style={{ stopColor: 'var(--wb1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--wb2)' }} />
            </linearGradient>
          </defs>
          <rect width="120" height="90" fill={`url(#${id}-bg)`} />
          <g style={{ opacity: 'var(--bands)' }}>
            <path d="M120 0V52C108 48 100 38 88 31C72 22 62 26 52 16C46 10 46 4 47 0Z" fill={`url(#${id}-a)`} />
            <path d="M-4 48C16 40 34 50 54 52C76 55 90 44 124 60V90H-4Z" fill={`url(#${id}-b)`} opacity="0.9" />
          </g>
          <g style={{ opacity: 'var(--bubbles)' }}>
            <circle cx="96" cy="70" r="7" fill="none" stroke="#fff" strokeOpacity="0.45" />
            <circle cx="24" cy="18" r="4" fill="none" stroke="#fff" strokeOpacity="0.45" />
          </g>
        </svg>
        {/* Mini app: sidebar and two cards in the theme's glass */}
        <span className="absolute top-[9%] bottom-[9%] left-[6%] w-[20%] rounded-[5px]" style={{ background: 'var(--glass-chrome)', boxShadow: 'var(--depth)' }} />
        <span className="absolute top-[9%] right-[6%] left-[31%] h-[38%] rounded-[5px]" style={{ background: 'var(--glass)', boxShadow: 'var(--depth)' }}>
          <span className="absolute top-[22%] left-[10%] h-[12%] w-[40%] rounded-full" style={{ background: 'var(--text-3)' }} />
        </span>
        <span className="absolute right-[6%] bottom-[9%] left-[31%] h-[38%] rounded-[5px]" style={{ background: 'var(--glass)', boxShadow: 'var(--depth)' }}>
          <span className="absolute top-[22%] left-[10%] h-[12%] w-[28%] rounded-full" style={{ background: 'var(--text-3)' }} />
        </span>
        {selected && (
          <span className="gel absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={cn('text-[12px]', selected ? 'font-semibold text-ink' : 'text-ink-2')}>{label}</span>
    </button>
  )
}
