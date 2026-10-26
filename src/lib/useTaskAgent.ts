import { useMemo } from 'react'
import type { Task } from '@/data/types'
import { isLive } from '@/lib/runs'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'

/** What agents are doing with a task: a live run on it, what it produced, what it waits on. */
export function useTaskAgent(task: Task) {
  const runs = useWorkspace((s) => s.runs)
  const artifacts = useWorkspace((s) => s.artifacts)
  const tasks = useWorkspace((s) => s.tasks)
  const actors = useActorsById()
  return useMemo(() => {
    const assignee = actors[task.assignee]
    // A run names one task, but an agent works through several: an in-progress task
    // whose agent has a live run in the project counts as being worked on.
    const liveRun =
      runs.find((r) => r.taskId === task.id && isLive(r)) ??
      (task.status === 'doing' && assignee?.kind === 'agent'
        ? runs.find((r) => r.agentId === task.assignee && r.projectId === task.projectId && isLive(r))
        : undefined)
    const openDeps = task.dependsOn.filter((id) => tasks.find((t) => t.id === id)?.status !== 'done').length
    return {
      liveRun,
      artifacts: artifacts.filter((a) => a.taskId === task.id),
      openDeps,
      byAgent: assignee?.kind === 'agent',
    }
  }, [task, runs, artifacts, tasks, actors])
}
