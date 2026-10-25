import { UserPlus } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import type { Team } from '@/data/types'
import { useNow } from '@/lib/derive'
import { Flip, gsap, prefersReducedMotion } from '@/lib/gsap'
import { TEAMS, workload } from '@/lib/team'
import { usePeople } from '@/store/settings'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { PendingInvites } from './PendingInvites'
import { PersonCard } from './PersonCard'
import { ProfileDrawer } from './ProfileDrawer'

export function TeamPage() {
  const { personId } = useParams()
  const tasks = useWorkspace((s) => s.tasks)
  const everyone = usePeople()
  const openDialog = useUi((s) => s.openDialog)
  const now = useNow(30_000)
  const [team, setTeam] = useState<Team | 'all'>('all')
  const grid = useRef<HTMLDivElement>(null)
  const flip = useRef<Flip.FlipState | null>(null)

  const stats = useMemo(() => {
    const loads = everyone.map((p) => workload(p, tasks).ratio)
    return {
      online: everyone.filter((p) => p.presence !== 'away').length,
      focus: everyone.filter((p) => p.presence === 'focus').length,
      load: Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 100),
    }
  }, [tasks, everyone])

  const people = everyone.filter((p) => team === 'all' || p.team === team)

  const changeTeam = (t: Team | 'all') => {
    if (grid.current && !prefersReducedMotion()) flip.current = Flip.getState(grid.current.children)
    setTeam(t)
  }

  useLayoutEffect(() => {
    const state = flip.current
    if (!state || !grid.current) return
    flip.current = null
    Flip.from(state, {
      targets: grid.current.children,
      duration: 0.5,
      ease: 'power3.inOut',
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.4, delay: 0.1, ease: 'power2.out' }),
    })
  }, [team])

  return (
    <Page>
      <PageHeader
        title="Team"
        subtitle={`${everyone.length} people · ${TEAMS.length} teams`}
        actions={
          <>
            <Segmented
              label="Team"
              size="md"
              value={team}
              onChange={changeTeam}
              options={[{ value: 'all' as const, label: 'All' }, ...TEAMS.map((t) => ({ value: t, label: t }))]}
              className="max-w-full overflow-x-auto [scrollbar-width:none]"
            />
            <Button variant="gel" onClick={() => openDialog('invite')}>
              <UserPlus /> Invite
            </Button>
          </>
        }
      />

      <StatRow
        stats={[
          { label: 'Online now', value: stats.online, suffix: `/ ${everyone.length}` },
          { label: 'In focus', value: stats.focus },
          { label: 'Average load', value: stats.load, format: (n) => `${Math.round(n)}%` },
        ]}
      />

      <div ref={grid} className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} tasks={tasks} now={now} />
        ))}
      </div>

      <PendingInvites />
      <ProfileDrawer personId={personId} />
    </Page>
  )
}
