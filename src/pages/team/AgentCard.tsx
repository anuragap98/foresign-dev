import { Activity } from 'lucide-react'
import { Link } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LiveDot } from '@/components/ui/live-dot'
import type { Person } from '@/data/types'
import { AGENT_STATE_LABEL, AGENT_STATE_TONE, type AgentSummary } from '@/lib/agents'
import { fmtCost } from '@/lib/runs'
import { relTime } from '@/lib/time'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] text-ink-2">{label}</p>
      <p className="tabular truncate text-[15px] font-semibold">{value}</p>
    </div>
  )
}

/** An agent on the roster: what it's doing now, and its record. */
export function AgentCard({ agent: a, summary: s, now }: { agent: Person; summary: AgentSummary; now: Date }) {
  const tone = AGENT_STATE_TONE[s.state]
  return (
    <div data-enter className="min-w-0">
      <Glass as="article" className="relative flex h-full flex-col rounded-card p-5 transition-transform duration-300 ease-glass hover:-translate-y-1">
        <div className="flex items-start gap-3.5">
          <Avatar id={a.id} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold">
              <Link
                to={`/team/${a.id}`}
                className="block truncate outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:shadow-[0_0_0_2px_var(--accent-ink)]"
              >
                {a.name}
              </Link>
            </h2>
            <p className="truncate text-[13px] text-ink-2">{a.role || 'Agent'}</p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {a.runtime && <span className="rounded-full bg-fill-2 px-2 py-px text-[12px] font-medium text-ink-2">{a.runtime}</span>}
              {(s.lastRun?.model ?? a.model) && <span className="rounded-full bg-fill-2 px-2 py-px font-mono text-[11px] text-ink-2">{s.lastRun?.model ?? a.model}</span>}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] bg-fill px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone }}>
            <LiveDot color={tone} live={s.state !== 'idle'} className="size-2" />
            {AGENT_STATE_LABEL[s.state]}
            {s.state === 'idle' && s.lastRun && <span className="font-normal text-ink-3">· last run {relTime(s.lastRun.startedAt, now.getTime())}</span>}
          </p>
          {s.current ? (
            <Link to={`/tasks/${s.current.id}`} className="relative z-10 mt-1 block truncate text-[14px] font-medium hover:underline">
              {s.current.title}
            </Link>
          ) : (
            <p className="mt-1 text-[14px] text-ink-3">{s.runs.length ? 'No task in progress' : 'Hasn’t run yet'}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Finished" value={String(s.finished)} />
          <Stat label="Success" value={s.success === null ? '–' : `${s.success}%`} />
          <Stat label="Spend" value={fmtCost(s.spend)} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <span className="text-[13px] text-ink-2">
            <span className="tabular font-semibold text-ink">{s.runs.length}</span> run{s.runs.length === 1 ? '' : 's'}
          </span>
          {s.liveRun && (
            <Button asChild variant="soft" size="sm" className="relative z-10 ml-auto">
              <Link to={`/runs/${s.liveRun.id}`}>
                <Activity /> Live run
              </Link>
            </Button>
          )}
          <Button asChild variant="soft" size="sm" className={s.liveRun ? 'relative z-10' : 'relative z-10 ml-auto'}>
            <Link to={`/team/${a.id}`}>Profile</Link>
          </Button>
        </div>
      </Glass>
    </div>
  )
}
