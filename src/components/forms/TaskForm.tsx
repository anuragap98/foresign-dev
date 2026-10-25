import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ME } from '@/lib/session'
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status } from '@/data/types'
import { dayKey } from '@/lib/time'
import { useActors } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace, type NewTask } from '@/store/workspace'

const blank = (projectId: string): NewTask => ({
  title: '',
  projectId,
  assignee: ME,
  priority: 'medium',
  due: dayKey(),
  status: 'todo',
  estH: 2,
})

/** Mounted fresh each time the dialog opens, so it starts from the defaults. */
function TaskFields({ onDone }: { onDone: () => void }) {
  const defaults = useUi((s) => s.taskDefaults)
  const projects = useWorkspace((s) => s.projects)
  const addTask = useWorkspace((s) => s.addTask)
  // People and agents can both own a task.
  const people = useActors()
  const [form, setForm] = useState<NewTask>(() => {
    // Start in your first pinned project that's still running, else the first running one.
    const live = projects.filter((p) => p.status !== 'shipped')
    return { ...blank((live.find((p) => p.pinned) ?? live[0])?.id ?? ''), ...defaults }
  })
  const set = <K extends keyof NewTask>(key: K, value: NewTask[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      id="task-form"
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.title.trim()) return
        addTask({ ...form, title: form.title.trim() })
        onDone()
      }}
    >
      <Field label="Title" className="col-span-2">
        <Input autoFocus required name="title" placeholder="What needs doing?" value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Project">
        <Select
          name="projectId"
          value={form.projectId}
          onValueChange={(v) => set('projectId', v)}
          options={projects.filter((p) => p.status !== 'shipped').map((p) => ({ value: p.id, label: p.name }))}
        />
      </Field>
      <Field label="Assignee">
        <Select name="assignee" value={form.assignee} onValueChange={(v) => set('assignee', v)} options={people.map((p) => ({ value: p.id, label: p.name }))} />
      </Field>
      <Field label="Priority">
        <Select
          name="priority"
          value={form.priority}
          onValueChange={(v) => set('priority', v as Priority)}
          options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Due">
        <Input type="date" name="due" required value={form.due} onChange={(e) => set('due', e.target.value)} />
      </Field>
      <Field label="Status">
        <Select
          name="status"
          value={form.status}
          onValueChange={(v) => set('status', v as Status)}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Estimate (hours)">
        <Input type="number" name="est" min={0} max={80} step={0.5} value={form.estH} onChange={(e) => set('estH', Number(e.target.value))} />
      </Field>
    </form>
  )
}

export function TaskForm() {
  const open = useUi((s) => s.dialog === 'task')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      title="New task"
      action={
        <Button variant="gel" size="sm" type="submit" form="task-form">
          Add
        </Button>
      }
    >
      <TaskFields onDone={closeDialog} />
    </Modal>
  )
}
