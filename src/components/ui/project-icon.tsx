import { ChartNoAxesColumn, Flame, Folder, LayoutGrid, Leaf, Rocket, Smartphone, Sparkles, type LucideIcon } from 'lucide-react'
import type { Hue, ProjectIcon as IconName } from '@/data/types'
import { cn } from '@/lib/utils'

export const PROJECT_ICONS: Record<IconName, LucideIcon> = {
  folder: Folder,
  rocket: Rocket,
  leaf: Leaf,
  flame: Flame,
  phone: Smartphone,
  grid: LayoutGrid,
  chart: ChartNoAxesColumn,
  sparkle: Sparkles,
}

/** Rounded gradient tile with the project's glyph. */
export function ProjectIcon({ icon, hue, size = 36, className }: { icon: IconName; hue: Hue; size?: number; className?: string }) {
  const Icon = PROJECT_ICONS[icon]
  return (
    <span
      className={cn(`hue-${hue}`, 'inline-flex shrink-0 items-center justify-center text-white', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(160deg, color-mix(in srgb, var(--hue) 62%, #fff 38%), var(--hue) 70%)',
        boxShadow: 'inset 0 1px 1px #ffffff80, inset 0 -2px 5px #00000026, 0 6px 14px -8px var(--hue)',
      }}
      aria-hidden
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </span>
  )
}
