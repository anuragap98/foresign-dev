import { CircleAlert, CircleCheck, CircleX, OctagonPause, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { attentionItems, type AttentionKind } from '@/lib/attention'
import { useNow } from '@/lib/derive'
import { relTime } from '@/lib/time'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'

const SHOWN = 6

const LOOK: Record<AttentionKind, { icon: LucideIcon; tone: string }> = {
  gate: { icon: ShieldCheck, tone: 'var(--prio-high)' },
  budget: { icon: Wallet, tone: 'var(--danger)' },
  failed_task: { icon: CircleX, tone: 'var(--danger)' },
  blocked_task: { icon: OctagonPause, tone: 'var(--orange)' },
  failed_run: { icon: CircleAlert, tone: 'var(--danger)' },
}

/** What agents (and the plan) are waiting on you for, across every project. Shown once agents are about. */
export function AttentionCard({ className }: { className?: string }) {
  const { gates, runs, tasks, projects } = useWorkspace(useShallow((s) => ({ gates: s.gates, runs: s.runs, tasks: s.tasks, projects: s.projects })))
  const actors = useActorsById()
  const now = useNow(60_000).getTime()
  const [all, setAll] = useState(false)
  const items = useMemo(() => attentionItems(gates, runs, tasks, projects, actors, now), [gates, runs, tasks, projects, actors, now])
  const working = useMemo(() => [...new Set(runs.filter((r) => r.status === 'running').map((r) => r.agentId))], [runs])

  if (!Object.values(actors).some((a) => a.kind === 'agent')) return null
  const shown = all ? items : items.slice(0, SHOWN)

  return (
    <Card
      title="Needs your attention"
      subtitle={items.length ? `${items.length} thing${items.length === 1 ? '' : 's'} waiting on a person` : 'Nothing waiting on you'}
      className={className}
      action={
        working.length > 0 && (
          <Link to="/runs" className="flex items-center gap-2 rounded-full bg-fill py-1 pr-3 pl-1 text-[13px] font-medium hover:bg-fill-2" aria-label={`${working.length} agents working now`}>
            <span className="flex -space-x-1.5">
              {working.slice(0, 3).map((id) => (
                <Avatar key={id} id={id} size={22} />
              ))}
            </span>
            {working.length} working
          </Link>
        )
      }
    >
      {items.length ? (
        <>
          <ul className="-mx-2 grid gap-x-4 xl:grid-cols-2">
            {shown.map((it) => {
              const { icon: Icon, tone } = LOOK[it.kind]
              return (
                <li key={it.id}>
                  <Link to={it.to} className="flex items-center gap-3 rounded-[16px] px-2 py-2 transition-colors hover:bg-fill-hover">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-[12px]"
                      style={{ color: tone, background: `color-mix(in srgb, ${tone} 16%, transparent)` }}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{it.title}</span>
                      <span className="block truncate text-[12px] text-ink-2">{it.detail}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {it.actorId && <Avatar id={it.actorId} size={20} />}
                      {it.kind !== 'budget' && <span className="text-[11px] text-ink-3">{relTime(it.at, now)}</span>}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {items.length > SHOWN && (
            <Button variant="ghost" size="sm" className="mt-1 self-start" onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </Button>
          )}
        </>
      ) : (
        <p className="flex items-center gap-2 py-3 text-[14px] text-ink-2">
          <CircleCheck className="size-5 text-[var(--green)]" /> All clear. Agents ask here when they need a decision.
        </p>
      )}
    </Card>
  )
}
