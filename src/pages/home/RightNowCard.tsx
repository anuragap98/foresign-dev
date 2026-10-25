import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, PRESENCE_LABEL } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { ME, PEOPLE, PEOPLE_BY_ID } from '@/data/seed'
import type { Presence } from '@/data/types'
import { useNow } from '@/lib/derive'
import { gsap, prefersReducedMotion, useGSAP } from '@/lib/gsap'
import { relTime } from '@/lib/time'
import { useWorkspace } from '@/store/workspace'

const ORDER: Presence[] = ['focus', 'meeting', 'online', 'away']

export function RightNowCard({ className }: { className?: string }) {
  const [tab, setTab] = useState<'team' | 'activity'>('team')
  const activity = useWorkspace((s) => s.activity)
  const projects = useWorkspace((s) => s.projects)
  const now = useNow(60_000)
  const list = useRef<HTMLUListElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('li', { autoAlpha: 0, x: 12, duration: 0.45, stagger: 0.04, ease: 'power2.out' })
    },
    { scope: list, dependencies: [tab] },
  )

  const people = PEOPLE.filter((p) => p.id !== ME && p.presence !== 'away')
    .sort((a, b) => ORDER.indexOf(a.presence) - ORDER.indexOf(b.presence))
    .slice(0, 6)

  return (
    <Card
      title="Right now"
      className={className}
      action={
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'team', label: 'Team' },
            { value: 'activity', label: 'Activity' },
          ]}
        />
      }
    >
      <ul ref={list} className="-mx-2">
        {tab === 'team'
          ? people.map((p) => (
              <li key={p.id}>
                <Link to={`/team/${p.id}`} className="flex items-center gap-3 rounded-[16px] px-2 py-2 transition-colors hover:bg-fill-hover">
                  <Avatar id={p.id} size={36} presence />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                    <span className="block truncate text-[12px] text-ink-2">
                      {PRESENCE_LABEL[p.presence]} · {p.presenceNote ?? p.role}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          : activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-2 py-2">
                <Avatar id={a.who} size={32} />
                <span className="min-w-0 text-[14px]">
                  <span className="block leading-snug">
                    <span className="font-semibold">{PEOPLE_BY_ID[a.who]?.name.split(' ')[0]}</span> {a.text}
                  </span>
                  <span className="block text-[12px] text-ink-3">
                    {relTime(a.at, now.getTime())} · {projects.find((p) => p.id === a.projectId)?.name}
                  </span>
                </span>
              </li>
            ))}
      </ul>
    </Card>
  )
}
