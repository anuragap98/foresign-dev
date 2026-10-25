import { usePerson } from '@/store/settings'
import type { Presence } from '@/data/types'
import { cn, initials } from '@/lib/utils'

const PRESENCE_DOT: Record<Presence, string> = {
  online: 'bg-[var(--green)]',
  focus: 'bg-[var(--purple)]',
  meeting: 'bg-[var(--orange)]',
  away: 'bg-[var(--text-3)]',
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: 'Online',
  focus: 'In focus',
  meeting: 'In a meeting',
  away: 'Away',
}

interface AvatarProps {
  id: string
  size?: number
  presence?: boolean
  className?: string
}

/** Initials on a gradient of the person's hue; optional presence dot. */
export function Avatar({ id, size = 28, presence = false, className }: AvatarProps) {
  const person = usePerson(id)
  if (!person) return null
  const dot = Math.max(8, Math.round(size * 0.3))
  return (
    <span
      className={cn('relative inline-flex shrink-0', `hue-${person.hue}`, className)}
      style={{ width: size, height: size }}
      title={person.name}
    >
      <span
        className="flex size-full items-center justify-center rounded-full font-semibold text-white"
        style={{
          fontSize: size * 0.38,
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--hue) 70%, #fff 30%), color-mix(in srgb, var(--hue) 75%, #000 25%))',
          boxShadow: 'inset 0 1px 1px #ffffff59, inset 0 -2px 4px #00000033',
        }}
      >
        {initials(person.name)}
      </span>
      {presence && (
        <span
          className={cn('absolute -right-px -bottom-px rounded-full', PRESENCE_DOT[person.presence])}
          style={{ width: dot, height: dot, boxShadow: '0 0 0 2px var(--av-ring)' }}
        />
      )}
    </span>
  )
}

export function AvatarStack({ ids, max = 4, size = 24 }: { ids: string[]; max?: number; size?: number }) {
  const shown = ids.slice(0, max)
  const extra = ids.length - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((id, i) => (
        <span key={id} className="rounded-full" style={{ marginLeft: i ? -size * 0.3 : 0, boxShadow: '0 0 0 2px var(--av-ring)' }}>
          <Avatar id={id} size={size} />
        </span>
      ))}
      {extra > 0 && <span className="ml-1.5 text-[12px] font-medium text-ink-2">+{extra}</span>}
    </span>
  )
}
