import { UserPlus } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import type { Team } from '@/data/types'
import { useNow } from '@/lib/derive'
import { Flip, gsap, prefersReducedMotion } from '@/lib/gsap'
import { agentSummary } from '@/lib/agents'
import { TEAMS, workload } from '@/lib/team'
import { useActors, usePeople } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { AgentCard } from './AgentCard'
import { PendingInvites } from './PendingInvites'
import { PersonCard } from './PersonCard'
import { ProfileDrawer } from './ProfileDrawer'

export function TeamPage() {
  const { personId } = useParams()
  const tasks = useWorkspace((s) => s.tasks)
  const runs = useWorkspace((s) => s.runs)
  const everyone = usePeople()
  const actors = useActors()
  const openDialog = useUi((s) => s.openDialog)
  const now = useNow(30_000)
  const [team, setTeam] = useState<Team | 'all' | 'agents'>('all')
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

  const people = team === 'agents' ? [] : everyone.filter((p) => team === 'all' || p.team === team)

  // Agents working come first, then those waiting on a person, then by what they've finished.
  const agents = useMemo(() => {
    const rank = { working: 0, waiting: 1, idle: 2 }
    return actors
      .filter((a) => a.kind === 'agent')
      .map((a) => ({ agent: a, summary: agentSummary(a, runs, tasks) }))
      .sort((x, y) => rank[x.summary.state] - rank[y.summary.state] || y.summary.finished - x.summary.finished)
  }, [actors, runs, tasks])
  const showAgents = (team === 'all' || team === 'agents') && agents.length > 0

  const changeTeam = (t: Team | 'all' | 'agents') => {
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
        subtitle={`${everyone.length} people · ${agents.length} agent${agents.length === 1 ? '' : 's'} · ${TEAMS.length} teams`}
        actions={
          <>
            <Segmented
              label="Team"
              size="md"
              value={team}
              onChange={changeTeam}
              options={[
                { value: 'all' as const, label: 'All' },
                ...TEAMS.map((t) => ({ value: t, label: t })),
                ...(agents.length ? [{ value: 'agents' as const, label: 'Agents' }] : []),
              ]}
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
          ...(agents.length
            ? [{ label: 'Agents working', value: agents.filter((a) => a.summary.state !== 'idle').length, suffix: `/ ${agents.length}` }]
            : []),
        ]}
      />

      <div ref={grid} className="grid gap-[var(--gap)] empty:hidden md:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} tasks={tasks} now={now} />
        ))}
      </div>

      {showAgents && (
        <section aria-label="Agents" className="flex flex-col gap-[var(--gap)]">
          {team === 'all' && (
            <h2 data-enter className="mt-2 text-[22px] font-bold">
              Agents
            </h2>
          )}
          <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
            {agents.map(({ agent, summary }) => (
              <AgentCard key={agent.id} agent={agent} summary={summary} now={now} />
            ))}
          </div>
        </section>
      )}

      <PendingInvites />
      <ProfileDrawer personId={personId} />
    </Page>
  )
}
