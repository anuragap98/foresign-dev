import { useMemo } from 'react'
import { Link } from 'react-router'
import { ProjectChip, PriorityBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TaskCheck } from '@/components/ui/task-check'
import type { Task } from '@/data/types'
import { myTasksToday, useNow } from '@/lib/derive'
import { dayKey, fmtDue } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

function TaskRow({ task, now }: { task: Task; now: Date }) {
  const toggleDone = useWorkspace((s) => s.toggleDone)
  const done = task.status === 'done'
  const late = !done && task.due < dayKey(now)

  return (
    <li className="flex items-center gap-3 border-b border-sep py-2.5 last:border-b-0">
      <TaskCheck checked={done} onToggle={() => toggleDone(task.id)} label={`Mark “${task.title}” ${done ? 'not done' : 'done'}`} />
      <div className={cn('min-w-0 flex-1 transition-opacity', done && 'opacity-55')}>
        <Link
          to={`/tasks/${task.id}`}
          className={cn('block truncate text-[15px] font-medium hover:underline', done && 'text-ink-2 line-through')}
        >
          {task.title}
        </Link>
        <div className="mt-1 flex items-center gap-2 text-[12px]">
          <ProjectChip id={task.projectId} className="max-w-[60%]" />
          <span className={cn(late ? 'font-semibold text-danger' : 'text-ink-2')}>{fmtDue(task.due, now)}</span>
        </div>
      </div>
      {!done && <PriorityBadge priority={task.priority} />}
    </li>
  )
}

export function MyTasksCard({ className }: { className?: string }) {
  const tasks = useWorkspace((s) => s.tasks)
  const now = useNow(60_000)
  const list = useMemo(() => myTasksToday(tasks, now), [tasks, now])

  return (
    <Card
      title="My tasks"
      subtitle="Due today and late"
      className={className}
      action={
        <Button asChild variant="link" size="none" className="text-[14px]">
          <Link to="/tasks">All tasks</Link>
        </Button>
      }
      bodyClassName="scroll-thin -mr-2 overflow-y-auto pr-2"
    >
      {list.length ? (
        <ul>
          {list.map((t) => (
            <TaskRow key={t.id} task={t} now={now} />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-[14px] text-ink-2">All clear. Nothing due today.</p>
      )}
    </Card>
  )
}
