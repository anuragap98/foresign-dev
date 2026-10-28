import { Mail, X } from 'lucide-react'
import { useRef } from 'react'
import { HueChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNow } from '@/lib/derive'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { relTime } from '@/lib/time'
import { TEAM_HUE } from '@/lib/team'
import { initials } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

/** Invites that haven't been accepted yet. */
export function PendingInvites() {
  const invites = useWorkspace((s) => s.invites)
  const cancelInvite = useWorkspace((s) => s.cancelInvite)
  const now = useNow(60_000)
  const list = useRef<HTMLUListElement>(null)

  // New rows slide in.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('li:last-child', { autoAlpha: 0, y: 10, duration: 0.4, ease: 'power2.out' })
    },
    { scope: list, dependencies: [invites.length] },
  )

  if (!invites.length) return null

  return (
    <Card title="Pending invites" subtitle={`${invites.length} waiting to accept`}>
      <ul ref={list} className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-[18px] border border-dashed border-sep bg-fill px-3.5 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fill-2 text-[14px] font-semibold text-ink-2">
              {initials(i.name) || '?'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{i.name}</span>
              <span className="block truncate text-[12px] text-ink-2">
                {i.role || 'No role yet'} · invited {relTime(i.at, now.getTime())}
              </span>
              <HueChip hue={TEAM_HUE[i.team]} className="mt-1">
                {i.team}
              </HueChip>
            </span>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <a href={`mailto:${i.email}?subject=${encodeURIComponent('Your invite to Foresign')}`} aria-label={`Email ${i.name}`}>
                <Mail />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Cancel invite for ${i.name}`} onClick={() => cancelInvite(i.id)}>
              <X />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
