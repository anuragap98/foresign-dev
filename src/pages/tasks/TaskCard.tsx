import { CalendarDays, Check, MessageSquare } from 'lucide-react'
import type { PointerEvent } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { AgentWorking, TaskAgentCounts, TaskFlag } from '@/components/ui/task-agent'
import { TaskMenu } from '@/components/ui/task-menu'
import type { Task } from '@/data/types'
import { dayKey, fmtDue } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  now: Date
  onOpen: (id: string) => void
  onPointerDown?: (e: PointerEvent<HTMLElement>, task: Task) => void
  hidden?: boolean
}

export function TaskCard({ task, now, onOpen, onPointerDown, hidden }: TaskCardProps) {
  const done = task.status === 'done'
  const today = dayKey(now)
  const late = !done && task.due < today
  const subsDone = task.subtasks.filter((s) => s.done).length

  return (
    <article
      data-card={task.id}
      onPointerDown={(e) => onPointerDown?.(e, task)}
      onClick={() => onOpen(task.id)}
      className={cn(
        'tile group relative cursor-grab touch-pan-y rounded-[20px] p-3.5 transition-[opacity,transform] duration-200 select-none active:cursor-grabbing',
        'hover:-translate-y-px',
        hidden && 'hidden',
      )}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <ProjectChip id={task.projectId} className="max-w-[60%]" />
        {!done && <PriorityBadge priority={task.priority} />}
        <TaskMenu task={task} className="relative z-10 ml-auto -mr-1 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" />
      </div>

      <h3 className="flex items-start gap-2 text-[15px] leading-snug font-semibold">
        {done && (
          <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(task.id)
          }}
          className={cn('text-left outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:shadow-[0_0_0_2px_var(--accent-ink)]', done && 'text-ink-2 line-through')}
        >
          {task.title}
        </button>
      </h3>

      {!done && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden">
          <TaskFlag task={task} />
          <AgentWorking task={task} />
        </div>
      )}

      {task.subtasks.length > 0 && !done && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-fill-2">
            <span
              className="block h-full origin-left rounded-full bg-[var(--orange)] transition-transform duration-500"
              style={{ transform: `scaleX(${subsDone / task.subtasks.length})` }}
            />
          </span>
          <span className="tabular text-[12px] text-ink-2" aria-label={`${subsDone} of ${task.subtasks.length} subtasks done`}>
            {subsDone}/{task.subtasks.length}
          </span>
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-3 text-[12px] text-ink-2">
        <span className={cn('inline-flex items-center gap-1', late && 'font-semibold text-danger', task.due === today && !done && 'font-semibold text-accent-ink')}>
          <CalendarDays className="size-3.5" />
          {fmtDue(task.due, now)}
        </span>
        {task.comments.length > 0 && (
          <span className="inline-flex items-center gap-1" aria-label={`${task.comments.length} comments`}>
            <MessageSquare className="size-3.5" />
            {task.comments.length}
          </span>
        )}
        <TaskAgentCounts task={task} />
        <span className="ml-auto">
          <Avatar id={task.assignee} size={24} />
        </span>
      </div>
    </article>
  )
}
