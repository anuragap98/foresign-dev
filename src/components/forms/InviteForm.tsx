import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import type { Team } from '@/data/types'
import { TEAMS } from '@/lib/team'
import { usePeople } from '@/store/settings'
import { useUi } from '@/store/ui'
import { useWorkspace, type NewInvite } from '@/store/workspace'

/** Mounted fresh each time the dialog opens. */
function InviteFields({ onDone }: { onDone: () => void }) {
  const addInvite = useWorkspace((s) => s.addInvite)
  const invites = useWorkspace((s) => s.invites)
  const people = usePeople()
  const [form, setForm] = useState<NewInvite>({ name: '', email: '', role: '', team: 'Product' })
  const [error, setError] = useState('')
  const set = <K extends keyof NewInvite>(key: K, value: NewInvite[K]) => {
    setError('')
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <form
      id="invite-form"
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        const email = form.email.trim().toLowerCase()
        if (people.some((p) => p.email === email)) return setError('They’re already on the team.')
        if (invites.some((i) => i.email === email)) return setError('An invite is already waiting for them.')
        addInvite({ ...form, name: form.name.trim(), email, role: form.role.trim() })
        onDone()
      }}
    >
      <Field label="Name">
        <Input autoFocus required autoComplete="off" placeholder="Sam Rivera" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          required
          autoComplete="off"
          placeholder="sam@pane.app"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'invite-error' : undefined}
        />
      </Field>
      <Field label="Role">
        <Input placeholder="Product Designer" value={form.role} onChange={(e) => set('role', e.target.value)} />
      </Field>
      <Field label="Team">
        <Select value={form.team} onValueChange={(v) => set('team', v as Team)} options={TEAMS.map((t) => ({ value: t, label: t }))} />
      </Field>
      {error && (
        <p id="invite-error" role="alert" className="col-span-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  )
}

export function InviteForm() {
  const open = useUi((s) => s.dialog === 'invite')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && closeDialog()}
      title="Invite someone"
      description="They join as soon as they accept."
      action={
        <Button variant="gel" size="sm" type="submit" form="invite-form">
          Send invite
        </Button>
      }
    >
      <InviteFields onDone={closeDialog} />
    </Modal>
  )
}
