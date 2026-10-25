import { CalendarDays, ChevronDown } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { TaskCheck } from '@/components/ui/task-check'
import { TaskMenu } from '@/components/ui/task-menu'
import { STATUS_LABEL, type Status, type Task } from '@/data/types'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { columnTasks, sortTasks, STATUSES, STATUS_TONE } from '@/lib/tasks'
import { dayKey, fmtDue } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useTasksView, type TasksSort } from '@/store/tasksView'
import { useWorkspace } from '@/store/workspace'

const DONE_CAP = 8

function Row({ task, now }: { task: Task; now: Date }) {
  const toggleDone = useWorkspace((s) => s.toggleDone)
  const navigate = useNavigate()
  const done = task.status === 'done'
  const today = dayKey(now)
  const late = !done && task.due < today

  return (
    <li
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] px-2.5 py-2 transition-colors hover:bg-fill-hover md:grid-cols-[auto_minmax(0,1fr)_170px_96px_84px_auto_auto]"
    >
      <TaskCheck checked={done} onToggle={() => toggleDone(task.id)} label={`Mark “${task.title}” ${done ? 'not done' : 'done'}`} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/tasks/${task.id}`)
        }}
        className={cn('truncate text-left text-[15px] font-medium outline-none focus-visible:underline', done && 'text-ink-2 line-through')}
      >
        {task.title}
      </button>
      <span className="hidden min-w-0 md:block">
        <ProjectChip id={task.projectId} />
      </span>
      <span
        className={cn(
          'hidden items-center gap-1.5 text-[13px] md:inline-flex',
          late ? 'font-semibold text-danger' : task.due === today && !done ? 'font-semibold text-accent-ink' : 'text-ink-2',
        )}
      >
        <CalendarDays className="size-3.5" />
        {fmtDue(task.due, now)}
      </span>
      <span className="hidden md:block">
        <PriorityBadge priority={task.priority} always />
      </span>
      <Avatar id={task.assignee} size={26} />
      <span onClick={(e) => e.stopPropagation()} className="hidden md:block">
        <TaskMenu task={task} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100" />
      </span>
    </li>
  )
}

function Group({ status, tasks, now, sort }: { status: Status; tasks: Task[]; now: Date; sort: TasksSort }) {
  const collapsed = useTasksView((s) => s.collapsed.includes(status))
  const toggleCollapsed = useTasksView((s) => s.toggleCollapsed)
  const [showAll, setShowAll] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  const ordered = status === 'done' ? columnTasks(tasks, 'done') : sortTasks(tasks, sort)
  const shown = status === 'done' && !showAll ? ordered.slice(0, DONE_CAP) : ordered

  // Open/close the group by tweening its height.
  useLayoutEffect(() => {
    const el = body.current
    if (!el) return
    if (first.current || prefersReducedMotion()) {
      first.current = false
      gsap.set(el, { height: collapsed ? 0 : 'auto', autoAlpha: collapsed ? 0 : 1 })
      return
    }
    gsap.to(el, { height: collapsed ? 0 : 'auto', autoAlpha: collapsed ? 0 : 1, duration: 0.45, ease: 'power3.inOut' })
  }, [collapsed])

  return (
    <section className="border-t border-sep pt-2 first:border-t-0 first:pt-0">
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => toggleCollapsed(status)}
        className="flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2 text-left outline-none hover:bg-fill-hover focus-visible:bg-fill-hover"
      >
        <ChevronDown className={cn('size-4 text-ink-2 transition-transform duration-300', collapsed && '-rotate-90')} />
        <span className="size-2.5 rounded-full" style={{ background: STATUS_TONE[status] }} />
        <span className="text-[15px] font-semibold">{STATUS_LABEL[status]}</span>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{tasks.length}</span>
      </button>
      <div ref={body} className="overflow-hidden">
        {tasks.length ? (
          <ul className="pb-2">
            {shown.map((t) => (
              <Row key={t.id} task={t} now={now} />
            ))}
          </ul>
        ) : (
          <p className="px-9 pb-3 text-[13px] text-ink-3">No tasks match.</p>
        )}
        {status === 'done' && tasks.length > DONE_CAP && (
          <Button variant="ghost" size="sm" className="mb-2 ml-7" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${tasks.length}`}
          </Button>
        )}
      </div>
    </section>
  )
}

export function ListView({ tasks, now }: { tasks: Task[]; now: Date }) {
  const sort = useTasksView((s) => s.sort)
  const setSort = useTasksView((s) => s.setSort)

  return (
    <Card
      title="All tasks"
      subtitle={`${tasks.length} on the board`}
      action={
        <Segmented
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'due', label: 'Due' },
            { value: 'prio', label: 'Priority' },
          ]}
        />
      }
    >
      {STATUSES.map((s) => (
        <Group key={s} status={s} tasks={tasks.filter((t) => t.status === s)} now={now} sort={sort} />
      ))}
    </Card>
  )
}
