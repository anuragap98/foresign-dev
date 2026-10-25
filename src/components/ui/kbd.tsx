import { cn } from '@/lib/utils'

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-md bg-fill-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-2',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
