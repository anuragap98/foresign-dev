import { Check, RotateCcw, Timer, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { TaskCheck } from '@/components/ui/task-check'
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status, type Task } from '@/data/types'
import { useNow } from '@/lib/derive'
import { STATUSES } from '@/lib/tasks'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useFocus } from '@/store/focus'
import { usePeople, usePeopleById } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'

const bare = 'h-8 bg-transparent px-0 text-[15px] font-semibold hover:bg-transparent focus:bg-transparent focus:shadow-none'

function Tile({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-tile bg-fill px-3.5 pt-2.5 pb-1.5 transition-colors focus-within:bg-fill-2 hover:bg-fill-2', className)}>
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      {children}
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {count && <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{count}</span>}
    </div>
  )
}

/** Small inline form: text field plus a submit button. */
function AddLine({ placeholder, button, onAdd, label }: { placeholder: string; button: string; onAdd: (v: string) => void; label: string }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!value.trim()) return
        onAdd(value.trim())
        setValue('')
      }}
    >
      <Input aria-label={label} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} className="h-10" />
      <Button type="submit" variant="soft" className="h-10 shrink-0 rounded-[14px]" disabled={!value.trim()}>
        {button}
      </Button>
    </form>
  )
}

function TaskBody({ task }: { task: Task }) {
  const s = useWorkspace()
  const people = usePeople()
  const peopleById = usePeopleById()
  const now = useNow(60_000)
  const subsDone = task.subtasks.filter((st) => st.done).length

  return (
    <>
      <Segmented
        label="Status"
        size="md"
        value={task.status}
        onChange={(v: Status) => s.setStatus(task.id, v)}
        options={STATUSES.map((st) => ({ value: st, label: STATUS_LABEL[st] }))}
        className="w-full justify-between"
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Tile label="Assignee">
          <Select
            aria-label="Assignee"
            className={bare}
            value={task.assignee}
            onValueChange={(v) => s.updateTask(task.id, { assignee: v })}
            options={people.map((p) => ({
              value: p.id,
              label: (
                <span className="inline-flex items-center gap-2">
                  <Avatar id={p.id} size={20} /> {p.name}
                </span>
              ),
            }))}
          />
        </Tile>
        <Tile label="Priority">
          <Select
            aria-label="Priority"
            className={bare}
            value={task.priority}
            onValueChange={(v) => s.updateTask(task.id, { priority: v as Priority })}
            options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
          />
        </Tile>
        <Tile label="Due">
          <input
            type="date"
            aria-label="Due date"
            value={task.due}
            onChange={(e) => e.target.value && s.updateTask(task.id, { due: e.target.value })}
            className={cn(bare, 'w-full text-ink outline-none')}
          />
        </Tile>
        <Tile label="Estimate">
          <span className="flex h-8 items-center gap-1">
            <input
              type="number"
              aria-label="Estimate in hours"
              min={0}
              max={80}
              step={0.5}
              value={task.estH}
              onChange={(e) => s.updateTask(task.id, { estH: Math.max(0, Number(e.target.value)) })}
              className="tabular w-12 bg-transparent text-[15px] font-semibold text-ink outline-none"
            />
            <span className="text-[15px] font-semibold text-ink-2">h</span>
          </span>
        </Tile>
        <Tile label="Project" className="col-span-2">
          <Select
            aria-label="Project"
            className={bare}
            value={task.projectId}
            onValueChange={(v) => s.updateTask(task.id, { projectId: v })}
            options={s.projects.map((p) => ({
              value: p.id,
              label: (
                <span className={`hue-${p.hue} inline-flex items-center gap-2`}>
                  <i className="size-2 rounded-full bg-[var(--hue)]" /> {p.name}
                </span>
              ),
            }))}
          />
        </Tile>
      </div>

      <SectionTitle title="Subtasks" count={task.subtasks.length ? `${subsDone}/${task.subtasks.length}` : undefined} />
      {task.subtasks.length > 0 && (
        <>
          <div className="mb-1 h-1 overflow-hidden rounded-full bg-fill-2">
            <div
              className="h-full origin-left rounded-full bg-accent-ink transition-transform duration-500 ease-glass"
              style={{ transform: `scaleX(${subsDone / task.subtasks.length})` }}
            />
          </div>
          <ul>
            {task.subtasks.map((st) => (
              <li key={st.id} className="group flex items-center gap-3 border-b border-sep py-2 last:border-b-0">
                <TaskCheck size={20} checked={st.done} onToggle={() => s.toggleSubtask(task.id, st.id)} label={`Mark “${st.title}” ${st.done ? 'not done' : 'done'}`} />
                <span className={cn('flex-1 text-[14px]', st.done && 'text-ink-2 line-through')}>{st.title}</span>
                <button
                  type="button"
                  aria-label={`Remove “${st.title}”`}
                  onClick={() => s.removeSubtask(task.id, st.id)}
                  className="rounded-full p-1 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <AddLine label="New subtask" placeholder="Add a subtask" button="Add" onAdd={(v) => s.addSubtask(task.id, v)} />

      <SectionTitle title="Comments" count={task.comments.length ? String(task.comments.length) : undefined} />
      {task.comments.length ? (
        <ul className="flex flex-col gap-3">
          {task.comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar id={c.by} size={30} />
              <div className="min-w-0 flex-1 rounded-[16px] rounded-tl-[6px] bg-fill px-3.5 py-2.5">
                <p className="text-[13px]">
                  <span className="font-semibold">{peopleById[c.by]?.name}</span>
                  <span className="ml-2 text-ink-3">{relTime(c.at, now.getTime())}</span>
                </p>
                <p className="mt-0.5 text-[14px] leading-snug">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-3">No comments yet.</p>
      )}
      <AddLine label="New comment" placeholder="Write a comment" button="Post" onAdd={(v) => s.addComment(task.id, v)} />
    </>
  )
}

export function TaskDrawer({ taskId }: { taskId?: string }) {
  const task = useWorkspace((s) => s.tasks.find((t) => t.id === taskId))
  const toggleDone = useWorkspace((s) => s.toggleDone)
  const deleteTask = useWorkspace((s) => s.deleteTask)
  const focusPhase = useFocus((s) => s.phase)
  const startFocus = useFocus((s) => s.start)
  const navigate = useNavigate()

  // Keep showing the last task while the drawer slides out.
  const [shown, setShown] = useState(task)
  if (task && task !== shown) setShown(task)
  if (!shown) return null

  const close = () => navigate('/tasks')
  const done = shown.status === 'done'

  return (
    <Drawer
      open={!!task}
      onOpenChange={(o) => !o && close()}
      title={shown.title}
      eyebrow={
        <>
          <ProjectChip id={shown.projectId} />
          <PriorityBadge priority={shown.priority} always />
        </>
      }
      footer={
        <>
          <Button
            variant="soft"
            disabled={focusPhase !== 'idle'}
            title={focusPhase !== 'idle' ? 'A focus session is already running' : undefined}
            onClick={() => startFocus(undefined, shown.id)}
          >
            <Timer /> Focus on this
          </Button>
          <Button variant={done ? 'soft' : 'gel'} onClick={() => toggleDone(shown.id)}>
            {done ? <RotateCcw /> : <Check />}
            {done ? 'Reopen' : 'Mark done'}
          </Button>
          <Button
            variant="danger"
            size="icon"
            className="ml-auto"
            aria-label="Delete task"
            onClick={() => {
              deleteTask(shown.id)
              close()
            }}
          >
            <Trash2 />
          </Button>
        </>
      }
    >
      <TaskBody task={shown} />
    </Drawer>
  )
}
