import { cn } from '@/lib/utils'

/** A status dot; `live` adds a soft ring pulsing out of it. */
export function LiveDot({ color, live, className }: { color: string; live?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-flex size-2.5 shrink-0', className)}>
      {live && <span className="absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping" style={{ background: color }} />}
      <span className="relative size-full rounded-full" style={{ background: color }} />
    </span>
  )
}
