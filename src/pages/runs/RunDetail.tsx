import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { ProjectChip } from '@/components/ui/badges'
import { LiveDot } from '@/components/ui/live-dot'
import { ArtifactList } from '@/components/ui/artifacts'
import type { Run } from '@/data/types'
import { childrenOf, fmtCost, fmtDuration, fmtTokens, isLive, RUN_STATUS_LABEL, RUN_STATUS_TONE, runMs, subtree, totals } from '@/lib/runs'
import { fmtDate, fmtTime } from '@/lib/time'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'
import { Trace } from './Trace'

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-tile bg-fill px-3.5 py-2.5">
      <p className="text-[12px] text-ink-2">{label}</p>
      <div className="tabular mt-0.5 truncate text-[15px] font-semibold">{children}</div>
    </div>
  )
}

/** Everything about one run: who, what, how long, what it cost, what it made, and every step. */
export function RunDetail({ run, now }: { run: Run; now: number }) {
  const runs = useWorkspace((s) => s.runs)
  const allArtifacts = useWorkspace((s) => s.artifacts)
  const task = useWorkspace((s) => (run.taskId ? s.tasks.find((t) => t.id === run.taskId) : undefined))
  const actors = useActorsById()
  const agent = actors[run.agentId]

  const children = useMemo(() => childrenOf(runs), [runs])
  const tree = useMemo(() => subtree(run, children), [run, children])
  const parent = run.parentRunId ? runs.find((r) => r.id === run.parentRunId) : undefined
  const kids = children.get(run.id) ?? []
  const all = totals(tree)
  const treeIds = new Set(tree.map((r) => r.id))
  const artifacts = allArtifacts.filter((a) => a.runId && treeIds.has(a.runId))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar id={run.agentId} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: RUN_STATUS_TONE[run.status] }}>
              <LiveDot color={RUN_STATUS_TONE[run.status]} live={isLive(run)} />
              {RUN_STATUS_LABEL[run.status]}
            </span>
            {run.model && <span className="font-mono text-[12px]">{run.model}</span>}
          </p>
          <h2 className="truncate text-[20px] font-bold">{agent?.name ?? 'Agent'}</h2>
          {agent?.role && <p className="truncate text-[13px] text-ink-2">{agent.role}</p>}
        </div>
      </div>

      {parent && (
        <p className="text-[13px] text-ink-2">
          Sub-agent of{' '}
          <Link to={`/runs/${parent.id}`} className="font-semibold text-accent-ink hover:underline">
            {actors[parent.agentId]?.name ?? 'its parent'}’s run
          </Link>
        </p>
      )}
      {run.summary && <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{run.summary}</p>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Fact label="Started">
          {fmtDate(run.startedAt)}, {fmtTime(run.startedAt)}
        </Fact>
        <Fact label={isLive(run) ? 'Running for' : 'Took'}>{fmtDuration(runMs(run, now))}</Fact>
        <Fact label={kids.length ? 'Cost with sub-agents' : 'Cost'}>
          {fmtCost(all.cost)}
          {kids.length > 0 && <span className="ml-1 text-[12px] font-medium text-ink-3">({fmtCost(run.costUsd)} own)</span>}
        </Fact>
        <Fact label="Tokens in / out">
          {fmtTokens(all.tokensIn)} / {fmtTokens(all.tokensOut)}
        </Fact>
        <Fact label="Project">
          <Link to={`/projects/${run.projectId}`} className="hover:opacity-80">
            <ProjectChip id={run.projectId} />
          </Link>
        </Fact>
        <Fact label="Task">
          {task ? (
            <Link to={`/tasks/${task.id}`} className="text-accent-ink hover:underline">
              {task.title}
            </Link>
          ) : (
            <span className="text-ink-3">None</span>
          )}
        </Fact>
      </div>

      {kids.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-[15px] font-semibold">Sub-agents</h3>
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <Link key={k.id} to={`/runs/${k.id}`} className="flex items-center gap-1.5 rounded-full bg-fill py-1 pr-3 pl-1 text-[13px] font-medium hover:bg-fill-2">
                <Avatar id={k.agentId} size={22} />
                {actors[k.agentId]?.name ?? 'Agent'}
                <LiveDot color={RUN_STATUS_TONE[k.status]} live={isLive(k)} className="size-2" />
                <span className="tabular text-ink-2">{fmtCost(totals(subtree(k, children)).cost)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {artifacts.length > 0 && (
        <div>
          <h3 className="mb-1 text-[15px] font-semibold">Artifacts</h3>
          <ArtifactList artifacts={artifacts} />
        </div>
      )}

      <Trace runs={tree} now={now} />
    </div>
  )
}
