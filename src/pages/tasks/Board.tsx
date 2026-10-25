import { Plus } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import { Button } from '@/components/ui/button'
import { STATUS_LABEL, type Status, type Task } from '@/data/types'
import { columnTasks, STATUSES, STATUS_TONE } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { TaskCard } from './TaskCard'
import { useBoardDrag, type DragState } from './useBoardDrag'

const DONE_CAP = 8

function Placeholder({ height }: { height: number }) {
  return (
    <div
      data-placeholder
      aria-hidden
      style={{ height }}
      className="rounded-[20px] border-2 border-dashed border-[color-mix(in_srgb,var(--accent-ink)_55%,transparent)] bg-accent-soft"
    />
  )
}

interface ColumnProps {
  status: Status
  tasks: Task[]
  now: Date
  drag: DragState | null
  onOpen: (id: string) => void
  onCardPointerDown: ReturnType<typeof useBoardDrag>['onCardPointerDown']
}

function Column({ status, tasks, now, drag, onOpen, onCardPointerDown }: ColumnProps) {
  const newTask = useUi((s) => s.newTask)
  const [showAll, setShowAll] = useState(false)
  const over = drag?.over === status
  const capped = status === 'done' && !showAll ? tasks.slice(0, DONE_CAP) : tasks
  const visible = capped.filter((t) => t.id !== drag?.id)
  const placeAtEnd = over && (drag.beforeId === null || !visible.some((t) => t.id === drag.beforeId))

  return (
    <Glass
      as="section"
      data-col={status}
      aria-label={`${STATUS_LABEL[status]}, ${tasks.length} tasks`}
      className={cn(
        'flex snap-start flex-col rounded-card p-2.5 transition-shadow duration-300',
        over && 'shadow-[var(--depth),0_0_0_2px_color-mix(in_srgb,var(--accent-ink)_45%,transparent),var(--shadow)]',
      )}
    >
      <header className="flex items-center gap-2 px-2 pt-1 pb-2.5">
        <span className="size-2.5 rounded-full" style={{ background: STATUS_TONE[status] }} />
        <h2 className="text-[15px] font-semibold">{STATUS_LABEL[status]}</h2>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{tasks.length}</span>
        <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label={`Add a task to ${STATUS_LABEL[status]}`} onClick={() => newTask({ status })}>
          <Plus />
        </Button>
      </header>

      <div className="flex min-h-[96px] flex-1 flex-col gap-2.5">
        {capped.map((t) => (
          <Fragment key={t.id}>
            {over && drag.beforeId === t.id && <Placeholder height={drag.height} />}
            <TaskCard task={t} now={now} onOpen={onOpen} onPointerDown={onCardPointerDown} hidden={drag?.id === t.id} />
          </Fragment>
        ))}
        {placeAtEnd && <Placeholder height={drag.height} />}
        {tasks.length === 0 && !over && <p className="px-2 py-6 text-center text-[13px] text-ink-3">Nothing here. Drop a task in.</p>}
        {status === 'done' && tasks.length > DONE_CAP && (
          <Button variant="ghost" size="sm" className="self-center" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show fewer' : `Show all ${tasks.length}`}
          </Button>
        )}
      </div>
    </Glass>
  )
}

export function Board({ tasks, now }: { tasks: Task[]; now: Date }) {
  const moveTask = useWorkspace((s) => s.moveTask)
  const navigate = useNavigate()
  const { drag, board, onCardPointerDown, shouldIgnoreClick } = useBoardDrag(moveTask)

  const onOpen = (id: string) => {
    if (!shouldIgnoreClick()) navigate(`/tasks/${id}`)
  }

  return (
    <div ref={board} data-enter>
      <div data-board-scroll className="scroll-thin -mx-[var(--gutter)] snap-x overflow-x-auto px-[var(--gutter)] pb-3 xl:mx-0 xl:overflow-visible xl:px-0">
        <div className="grid auto-cols-[minmax(280px,1fr)] grid-flow-col items-start gap-[var(--gap)] xl:grid-flow-row xl:grid-cols-4">
          {STATUSES.map((s) => (
            <Column
              key={s}
              status={s}
              tasks={columnTasks(tasks, s)}
              now={now}
              drag={drag}
              onOpen={onOpen}
              onCardPointerDown={onCardPointerDown}
            />
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {drag ? `Moving task. Over ${STATUS_LABEL[drag.over]}. Release to drop, Escape to cancel.` : ''}
      </p>
    </div>
  )
}
