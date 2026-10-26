import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { LiveDot } from '@/components/ui/live-dot'
import { ProjectIcon } from '@/components/ui/project-icon'
import type { Person } from '@/data/types'
import { agentSummary, AGENT_STATE_LABEL, AGENT_STATE_TONE } from '@/lib/agents'
import { useNow } from '@/lib/derive'
import { fmtCost, fmtDuration, fmtTokens, isLive, RUN_STATUS_LABEL, RUN_STATUS_TONE, runMs } from '@/lib/runs'
import { fmtDue, relTime } from '@/lib/time'
import { useWorkspace } from '@/store/workspace'

const RECENT = 8

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{count}</span>
      </div>
      {children}
    </section>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-tile bg-fill px-3.5 py-2.5">
      <p className="text-[12px] text-ink-2">{label}</p>
      <p className="tabular mt-0.5 text-[17px] font-semibold">{value}</p>
    </div>
  )
}

/** An agent's profile: what it's doing, its record, its runs and its work. */
export function AgentProfile({ agent: a }: { agent: Person }) {
  const runs = useWorkspace((s) => s.runs)
  const tasks = useWorkspace((s) => s.tasks)
  const projects = useWorkspace((s) => s.projects)
  const now = useNow(30_000)
  const s = useMemo(() => agentSummary(a, runs, tasks), [a, runs, tasks])
  const tone = AGENT_STATE_TONE[s.state]
  const theirProjects = projects.filter((p) => s.projects.has(p.id) || p.members.includes(a.id))

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar id={a.id} size={72} />
        <div className="min-w-0">
          <p className="text-[15px] text-ink-2">{a.role || 'Agent'}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {a.runtime && <span className="rounded-full bg-fill-2 px-2 py-px text-[12px] font-medium text-ink-2">{a.runtime}</span>}
            {(s.lastRun?.model ?? a.model) && <span className="rounded-full bg-fill-2 px-2 py-px font-mono text-[11px] text-ink-2">{s.lastRun?.model ?? a.model}</span>}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[18px] bg-fill px-3.5 py-3">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: tone }}>
          <LiveDot color={tone} live={s.state !== 'idle'} className="size-2" />
          {AGENT_STATE_LABEL[s.state]}
          {s.liveRun && <span className="font-normal text-ink-3">· for {fmtDuration(runMs(s.liveRun, now.getTime()))}</span>}
        </p>
        {s.current ? (
          <Link to={`/tasks/${s.current.id}`} className="mt-1 block truncate text-[15px] font-medium hover:underline">
            {s.current.title}
          </Link>
        ) : (
          <p className="mt-1 text-[14px] text-ink-3">No task in progress</p>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Tile label="Tasks finished" value={String(s.finished)} />
        <Tile label="Run success" value={s.success === null ? '–' : `${s.success}%`} />
        <Tile label="Spend" value={fmtCost(s.spend)} />
        <Tile label="Tokens" value={fmtTokens(s.tokens)} />
      </div>

      <Section title="Open tasks" count={s.open.length}>
        {s.open.length ? (
          <ul>
            {[...s.open]
              .sort((x, y) => x.due.localeCompare(y.due))
              .map((t) => (
                <li key={t.id}>
                  <Link to={`/tasks/${t.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-fill-hover">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{t.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        {fmtDue(t.due, now)} <ProjectChip id={t.projectId} />
                      </span>
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">Nothing assigned. Agents claim tasks themselves, or you can assign one.</p>
        )}
      </Section>

      <Section title="Recent runs" count={s.runs.length}>
        {s.runs.length ? (
          <ul>
            {s.runs.slice(0, RECENT).map((r) => (
              <li key={r.id}>
                <Link to={`/runs/${r.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-fill-hover">
                  <LiveDot color={RUN_STATUS_TONE[r.status]} live={isLive(r)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{r.summary || RUN_STATUS_LABEL[r.status]}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                      {relTime(r.startedAt, now.getTime())} · {fmtDuration(runMs(r, now.getTime()))} <ProjectChip id={r.projectId} />
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[13px] font-semibold">{fmtCost(r.costUsd)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">No runs yet. Connect it from a project to see its work here.</p>
        )}
        {s.runs.length > RECENT && (
          <Link to="/runs" className="mt-1 inline-block px-1 text-[13px] font-semibold text-accent-ink hover:underline">
            All runs
          </Link>
        )}
      </Section>

      <Section title="Projects" count={theirProjects.length}>
        <ul>
          {theirProjects.map((pr) => (
            <li key={pr.id}>
              <Link to={`/projects/${pr.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-fill-hover">
                <ProjectIcon icon={pr.icon} hue={pr.hue} size={30} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{pr.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
