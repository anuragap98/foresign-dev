import { Bot } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArtifactList } from '@/components/ui/artifacts'
import { Avatar } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/field'
import { LiveDot } from '@/components/ui/live-dot'
import { useTaskAgent } from '@/lib/useTaskAgent'
import { STATUS_LABEL, type Task } from '@/data/types'
import { useNow } from '@/lib/derive'
import { childrenOf, fmtCost, fmtDuration, isLive, RUN_STATUS_LABEL, RUN_STATUS_TONE, runMs, subtree, totals } from '@/lib/runs'
import { FLAGGED, STATUS_TONE } from '@/lib/tasks'
import { relTime } from '@/lib/time'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'

function Section({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mt-6 mb-2 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {count && <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{count}</span>}
      </div>
      {children}
    </section>
  )
}

const FLAG_HINT: Record<string, string> = {
  awaiting_approval: 'An agent planned this. Work starts once a person approves the plan.',
  blocked: 'Stuck until someone helps. Moving it to a column clears the flag.',
  failed: 'The agent gave up. Reassign it, or move it to a column to try again.',
}

/** Why a task is parked, with the agent's latest note when there is one. */
export function TaskFlagBanner({ task }: { task: Task }) {
  const actors = useActorsById()
  if (!FLAGGED.has(task.status)) return null
  const tone = STATUS_TONE[task.status]
  const note = [...task.comments].reverse().find((c) => actors[c.by]?.kind === 'agent')
  return (
    <div className="mb-4 rounded-[16px] px-3.5 py-3" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
      <p className="text-[14px] font-semibold" style={{ color: tone }}>
        {STATUS_LABEL[task.status]}
        {task.attempts > 1 && ` · attempt ${task.attempts}`}
      </p>
      <p className="text-[13px] text-ink-2">{FLAG_HINT[task.status]}</p>
      {note && task.status !== 'awaiting_approval' && (
        <p className="mt-2 text-[13px]">
          <span className="font-semibold">{actors[note.by]?.name}:</span> {note.text}
        </p>
      )}
      {task.status === 'awaiting_approval' && (
        <Link to={`/projects/${task.projectId}`} className="mt-1.5 inline-block text-[13px] font-semibold text-accent-ink hover:underline">
          Review the plan
        </Link>
      )}
    </div>
  )
}

/** Who created the task, when an agent did. */
export function PlannedBy({ task }: { task: Task }) {
  const actors = useActorsById()
  if (task.source !== 'agent') return null
  const by = task.createdBy ? actors[task.createdBy] : undefined
  return (
    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-2">
      <Bot className="size-3.5" /> Planned by {by?.name ?? 'an agent'}
    </p>
  )
}

/** Description and acceptance criteria; agents write both, people can edit them. */
export function TaskDetails({ task }: { task: Task }) {
  const updateTask = useWorkspace((s) => s.updateTask)
  const [description, setDescription] = useState(task.description)
  const [acceptance, setAcceptance] = useState(task.acceptance)
  return (
    <Section title="Details">
      <div className="flex flex-col gap-2.5">
        <Textarea
          aria-label="Description"
          placeholder="What this task is about"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== task.description && updateTask(task.id, { description })}
        />
        <Textarea
          aria-label="Acceptance criteria"
          placeholder="Done when… (agents read this)"
          value={acceptance}
          onChange={(e) => setAcceptance(e.target.value)}
          onBlur={() => acceptance !== task.acceptance && updateTask(task.id, { acceptance })}
          className="min-h-16"
        />
      </div>
    </Section>
  )
}

function TaskLink({ task }: { task: Task }) {
  return (
    <li>
      <Link to={`/tasks/${task.id}`} className="flex items-center gap-2.5 rounded-[12px] px-1 py-1.5 hover:bg-fill-hover">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_TONE[task.status] }} />
        <span className="min-w-0 flex-1 truncate text-[14px]">{task.title}</span>
        <span className="shrink-0 text-[12px] text-ink-2">{STATUS_LABEL[task.status]}</span>
      </Link>
    </li>
  )
}

/** The task's place in the plan: what it waits on and what waits on it. */
export function TaskDependencies({ task }: { task: Task }) {
  const tasks = useWorkspace((s) => s.tasks)
  const after = task.dependsOn.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => !!t)
  const unblocks = tasks.filter((t) => t.dependsOn.includes(task.id))
  if (!after.length && !unblocks.length) return null
  const open = after.filter((t) => t.status !== 'done').length
  return (
    <Section title="Dependencies" count={open ? `${open} open` : undefined}>
      {after.length > 0 && (
        <>
          <p className="px-1 text-[12px] font-medium text-ink-2">Waits on</p>
          <ul>{after.map((t) => <TaskLink key={t.id} task={t} />)}</ul>
        </>
      )}
      {unblocks.length > 0 && (
        <>
          <p className="mt-2 px-1 text-[12px] font-medium text-ink-2">Unblocks</p>
          <ul>{unblocks.map((t) => <TaskLink key={t.id} task={t} />)}</ul>
        </>
      )}
    </Section>
  )
}

/** Agent runs on this task and what they produced. */
export function TaskAgentWork({ task }: { task: Task }) {
  const runs = useWorkspace((s) => s.runs)
  const actors = useActorsById()
  const { artifacts } = useTaskAgent(task)
  const children = useMemo(() => childrenOf(runs), [runs])
  const now = useNow(60_000).getTime()
  const mine = runs.filter((r) => r.taskId === task.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  if (!mine.length && !artifacts.length) return null
  const cost = totals(mine.flatMap((r) => subtree(r, children)).filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)).cost

  return (
    <Section title="Agent work" count={mine.length ? fmtCost(cost) : undefined}>
      {mine.length > 0 && (
        <ul className="flex flex-col">
          {mine.map((r) => (
            <li key={r.id}>
              <Link to={`/runs/${r.id}`} className="flex items-center gap-2.5 rounded-[12px] px-1 py-1.5 hover:bg-fill-hover">
                <Avatar id={r.agentId} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium">
                    <span className="truncate">{actors[r.agentId]?.name ?? 'Agent'}</span>
                    <LiveDot color={RUN_STATUS_TONE[r.status]} live={isLive(r)} className="size-2" />
                  </span>
                  <span className="block truncate text-[12px] text-ink-2">
                    {RUN_STATUS_LABEL[r.status]} · {relTime(r.startedAt, now)} · {fmtDuration(runMs(r, now))}
                  </span>
                </span>
                <span className="tabular shrink-0 text-[13px] font-semibold">{fmtCost(totals(subtree(r, children)).cost)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {artifacts.length > 0 && (
        <div className={mine.length ? 'mt-2 border-t border-sep pt-1' : ''}>
          <ArtifactList artifacts={artifacts} />
        </div>
      )}
    </Section>
  )
}
