import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { PROJECT_ICONS } from '@/components/ui/project-icon'
import { ME } from '@/lib/session'
import { HUES, type Hue, type ProjectIcon } from '@/data/types'
import { addDays, dayKey } from '@/lib/time'
import { usePeople } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace, type NewProject } from '@/store/workspace'

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const blank = (): NewProject => ({
  name: '',
  summary: '',
  lead: ME,
  hue: 'indigo',
  due: dayKey(addDays(new Date(), 30)),
  icon: 'sparkle',
})

/** Mounted fresh each time the dialog opens. */
function ProjectFields({ onDone }: { onDone: () => void }) {
  const addProject = useWorkspace((s) => s.addProject)
  const people = usePeople()
  const navigate = useNavigate()
  const [form, setForm] = useState<NewProject>(blank)
  const set = <K extends keyof NewProject>(key: K, value: NewProject[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      id="project-form"
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!form.name.trim()) return
        const p = addProject({ ...form, name: form.name.trim(), summary: form.summary.trim() })
        onDone()
        navigate(`/projects/${p.id}`)
      }}
    >
      <Field label="Name" className="col-span-2">
        <Input autoFocus required placeholder="Spring launch" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="What is it for?" className="col-span-2">
        <Textarea
          placeholder="One or two sentences the whole team can repeat."
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </Field>
      <Field label="Lead">
        <Select value={form.lead} onValueChange={(v) => set('lead', v)} options={people.map((p) => ({ value: p.id, label: p.name }))} />
      </Field>
      <Field label="Colour">
        <Select
          value={form.hue}
          onValueChange={(v) => set('hue', v as Hue)}
          options={HUES.map((h) => ({
            value: h,
            label: (
              <span className={`hue-${h} inline-flex items-center gap-2`}>
                <i className="size-2.5 rounded-full bg-[var(--hue)]" />
                {cap(h)}
              </span>
            ),
          }))}
        />
      </Field>
      <Field label="Target date">
        <Input type="date" required value={form.due} onChange={(e) => set('due', e.target.value)} />
      </Field>
      <Field label="Icon">
        <Select
          value={form.icon}
          onValueChange={(v) => set('icon', v as ProjectIcon)}
          options={(Object.keys(PROJECT_ICONS) as ProjectIcon[]).map((k) => {
            const Icon = PROJECT_ICONS[k]
            return {
              value: k,
              label: (
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4" /> {cap(k)}
                </span>
              ),
            }
          })}
        />
      </Field>
    </form>
  )
}

export function ProjectForm() {
  const open = useUi((s) => s.dialog === 'project')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      title="New project"
      action={
        <Button variant="gel" size="sm" type="submit" form="project-form">
          Create
        </Button>
      }
    >
      <ProjectFields onDone={closeDialog} />
    </Modal>
  )
}
