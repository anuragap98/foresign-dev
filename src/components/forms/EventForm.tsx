import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ME } from '@/data/seed'
import { EVENT_KIND_LABEL, type EventKind } from '@/data/types'
import { dayKey } from '@/lib/time'
import { useUi } from '@/store/ui'
import { useWorkspace, type NewEvent } from '@/store/workspace'

const LENGTHS = [
  ['15', '15 min'],
  ['30', '30 min'],
  ['45', '45 min'],
  ['60', '1 hour'],
  ['90', '1½ hours'],
  ['120', '2 hours'],
]

interface EventDraft {
  title: string
  date: string
  time: string
  lenMin: number
  kind: EventKind
  projectId: string
  place: string
}

function draftFrom(defaults: Partial<NewEvent>): EventDraft {
  const start = defaults.start ? new Date(defaults.start) : null
  return {
    title: '',
    date: dayKey(start ?? new Date()),
    time: start ? start.toTimeString().slice(0, 5) : '12:00',
    lenMin: defaults.lenMin ?? 30,
    kind: defaults.kind ?? 'meeting',
    projectId: defaults.projectId ?? '',
    place: '',
  }
}

/** Mounted fresh each time the dialog opens, so it starts from the defaults. */
function EventFields({ onDone }: { onDone: () => void }) {
  const defaults = useUi((s) => s.eventDefaults)
  const projects = useWorkspace((s) => s.projects)
  const addEvent = useWorkspace((s) => s.addEvent)
  const [form, setForm] = useState<EventDraft>(() => draftFrom(defaults))
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      id="event-form"
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.title.trim()) return
        const [h, m] = form.time.split(':').map(Number)
        const [y, mo, d] = form.date.split('-').map(Number)
        addEvent({
          title: form.title.trim(),
          start: new Date(y, mo - 1, d, h, m).toISOString(),
          lenMin: form.lenMin,
          kind: form.kind,
          projectId: form.projectId || undefined,
          place: form.place.trim() || undefined,
          people: [ME],
        })
        onDone()
      }}
    >
      <Field label="Title" className="col-span-2">
        <Input autoFocus required placeholder="Design review" value={form.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Date">
        <Input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
      </Field>
      <Field label="Starts">
        <Input type="time" required value={form.time} onChange={(e) => set('time', e.target.value)} />
      </Field>
      <Field label="Length">
        <Select value={String(form.lenMin)} onValueChange={(v) => set('lenMin', Number(v))} options={LENGTHS.map(([value, label]) => ({ value, label }))} />
      </Field>
      <Field label="Type">
        <Select
          value={form.kind}
          onValueChange={(v) => set('kind', v as EventKind)}
          options={Object.entries(EVENT_KIND_LABEL).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Project">
        <Select
          value={form.projectId || 'none'}
          onValueChange={(v) => set('projectId', v === 'none' ? '' : v)}
          options={[{ value: 'none', label: 'None' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
        />
      </Field>
      <Field label="Where">
        <Input placeholder="Video call" value={form.place} onChange={(e) => set('place', e.target.value)} />
      </Field>
    </form>
  )
}

export function EventForm() {
  const open = useUi((s) => s.dialog === 'event')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      title="New event"
      action={
        <Button variant="gel" size="sm" type="submit" form="event-form">
          Add
        </Button>
      }
    >
      <EventFields onDone={closeDialog} />
    </Modal>
  )
}
