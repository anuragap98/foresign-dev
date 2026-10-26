import { GitPullRequest, Link2 } from 'lucide-react'
import { STATUS_LABEL, type Task } from '@/data/types'
import { FLAGGED, STATUS_TONE } from '@/lib/tasks'
import { useTaskAgent } from '@/lib/useTaskAgent'
import { cn } from '@/lib/utils'
import { useActorsById } from '@/store/people'
import { LiveDot } from './live-dot'

const pill = 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold'

/** Flag for a task parked as blocked, failed or awaiting approval, with its attempt count. */
export function TaskFlag({ task, className }: { task: Task; className?: string }) {
  const flagged = FLAGGED.has(task.status)
  if (!flagged && task.attempts < 2) return null
  const tone = flagged ? STATUS_TONE[task.status] : 'var(--text-2)'
  return (
    <span className={cn(pill, className)} style={{ color: tone, background: `color-mix(in srgb, ${tone} 15%, transparent)` }}>
      {flagged && STATUS_LABEL[task.status]}
      {flagged && task.attempts > 1 && ' · '}
      {task.attempts > 1 && `attempt ${task.attempts}`}
    </span>
  )
}

/** "Working" with a pulse while an agent has a live run on the task. */
export function AgentWorking({ task, className }: { task: Task; className?: string }) {
  const { liveRun } = useTaskAgent(task)
  const actors = useActorsById()
  // A parked task isn't being worked on, even while its agent's run goes on.
  if (!liveRun || FLAGGED.has(task.status)) return null
  const waiting = liveRun.status === 'waiting'
  const tone = waiting ? 'var(--yellow)' : 'var(--blue)'
  const model = liveRun.model ?? actors[liveRun.agentId]?.model
  return (
    <span className={cn(pill, className)} style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)` }} title={model}>
      <LiveDot color={tone} live className="size-2" />
      {waiting ? 'Waiting on you' : 'Working'}
    </span>
  )
}

/** Small counts for the card footer: pull requests and unfinished dependencies. */
export function TaskAgentCounts({ task }: { task: Task }) {
  const { artifacts, openDeps } = useTaskAgent(task)
  const prs = artifacts.filter((a) => a.kind === 'pull_request').length
  return (
    <>
      {prs > 0 && (
        <span className="inline-flex items-center gap-1" aria-label={`${prs} pull request${prs === 1 ? '' : 's'}`}>
          <GitPullRequest className="size-3.5" />
          {prs}
        </span>
      )}
      {openDeps > 0 && task.status !== 'done' && (
        <span className="inline-flex items-center gap-1" aria-label={`Waiting on ${openDeps} task${openDeps === 1 ? '' : 's'}`} title="Waiting on other tasks">
          <Link2 className="size-3.5" />
          {openDeps}
        </span>
      )}
    </>
  )
}
