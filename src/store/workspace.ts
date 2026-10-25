import { create } from 'zustand'
import type { CalEvent, FocusEntry, Invite, Notice, Person, Project, Status, Task } from '@/data/types'
import type { Snapshot } from '@/lib/api/snapshot'
import { ME, USER_ID, WORKSPACE_ID } from '@/lib/session'
import { byPosition } from '@/lib/tasks'
import { supabase } from '@/lib/supabase'
import { dayKey } from '@/lib/time'

export type NewTask = Pick<Task, 'title' | 'projectId' | 'assignee' | 'priority' | 'due' | 'status' | 'estH'>
export type NewEvent = Omit<CalEvent, 'id'>
export type NewProject = Pick<Project, 'name' | 'summary' | 'lead' | 'hue' | 'due' | 'icon'>
export type NewInvite = Omit<Invite, 'id' | 'at'>
export type ProfilePatch = Partial<Pick<Person, 'name' | 'email' | 'role'>>

interface WorkspaceState extends Snapshot {
  ready: boolean
  hydrate: (s: Snapshot) => void

  addTask: (t: NewTask) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  toggleDone: (id: string) => void
  setStatus: (id: string, status: Status) => void
  /** Moves a task to `status`, placed before `beforeId` (or last in that column). */
  moveTask: (id: string, status: Status, beforeId: string | null) => void
  deleteTask: (id: string) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subId: string) => void
  removeSubtask: (taskId: string, subId: string) => void
  addComment: (taskId: string, text: string) => void
  addEvent: (e: NewEvent) => CalEvent
  removeEvent: (id: string) => void
  addProject: (p: NewProject) => Project
  togglePin: (projectId: string) => void
  toggleMilestone: (projectId: string, milestoneId: string) => void
  logFocus: (entry: Omit<FocusEntry, 'id'>) => void
  markAllRead: () => void
  /** Adds a notification; with `key`, only the first call for that key does anything. */
  notify: (n: Pick<Notice, 'from' | 'text' | 'kind'>, key?: string) => void
  addInvite: (i: NewInvite) => void
  cancelInvite: (id: string) => void
  updateMe: (patch: ProfilePatch) => void
}

const EMPTY: Snapshot = {
  people: [], projects: [], tasks: [], events: [], focusLog: [], notices: [], activity: [], invites: [], runs: [], artifacts: [], gates: [],
}

let reportWriteError: (message: string) => void = (m) => console.error(m)
/** The boot screen points this at its error toast and a reload of the server's copy. */
export const onWriteError = (fn: (message: string) => void) => {
  reportWriteError = fn
}

/** Sends a write. The screen has already changed; if the server says no, report it and reload. */
async function save(label: string, ...ops: PromiseLike<{ error: { message: string } | null }>[]) {
  for (const op of ops) {
    const { error } = await op
    if (error) {
      reportWriteError(`${label} didn’t save: ${error.message}`)
      return
    }
  }
}

const newId = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const doneAtFor = (t: Task, status: Status) =>
  status === 'done' ? (t.status === 'done' ? t.doneAt : now()) : undefined

/** Status change that keeps `doneAt` honest. */
const withStatus = (t: Task, status: Status): Task => ({ ...t, status, doneAt: doneAtFor(t, status) })

/** App field → database column, for the task fields people can edit. */
const TASK_COLUMNS: Partial<Record<keyof Task, string>> = {
  title: 'title',
  projectId: 'project_id',
  assignee: 'assignee_id',
  priority: 'priority',
  status: 'status',
  due: 'due',
  estH: 'est_h',
  doneAt: 'done_at',
  description: 'description',
  acceptance: 'acceptance_criteria',
  position: 'position',
}

function taskColumns(patch: Partial<Task>) {
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const col = TASK_COLUMNS[k as keyof Task]
    if (col) row[col] = v ?? null
  }
  return row
}

export const useWorkspace = create<WorkspaceState>()((set, get) => {
  const patchTask = (id: string, fn: (t: Task) => Task) => {
    const before = get().tasks.find((t) => t.id === id)
    if (!before) return null
    const after = fn(before)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? after : t)) }))
    return after
  }

  return {
    ...EMPTY,
    ready: false,
    hydrate: (snapshot) => set({ ...snapshot, ready: true }),

    addTask: (input) => {
      const column = get().tasks.filter((t) => t.projectId === input.projectId && t.status === input.status)
      const task: Task = {
        ...input,
        id: newId(),
        createdAt: now(),
        doneAt: input.status === 'done' ? now() : undefined,
        subtasks: [],
        comments: [],
        description: '',
        acceptance: '',
        createdBy: ME,
        source: 'human',
        dependsOn: [],
        position: Math.max(0, ...column.map((t) => t.position)) + 1024,
        attempts: 0,
      }
      set((s) => ({ tasks: [task, ...s.tasks] }))
      save(
        'New task',
        supabase.from('tasks').insert({
          id: task.id, workspace_id: WORKSPACE_ID, project_id: task.projectId, title: task.title, assignee_id: task.assignee,
          created_by: ME, source: 'human', priority: task.priority, status: task.status, due: task.due, est_h: task.estH,
          position: task.position, done_at: task.doneAt ?? null,
        }),
      )
      return task
    },

    updateTask: (id, patch) => {
      if (!patchTask(id, (t) => ({ ...t, ...patch }))) return
      save('Task change', supabase.from('tasks').update(taskColumns(patch)).eq('id', id))
    },

    toggleDone: (id) => {
      const t = patchTask(id, (t) => withStatus(t, t.status === 'done' ? 'todo' : 'done'))
      if (t) save('Task status', supabase.from('tasks').update({ status: t.status, done_at: t.doneAt ?? null }).eq('id', id))
    },

    setStatus: (id, status) => {
      const t = patchTask(id, (t) => withStatus(t, status))
      if (t) save('Task status', supabase.from('tasks').update({ status: t.status, done_at: t.doneAt ?? null }).eq('id', id))
    },

    moveTask: (id, status, beforeId) => {
      const task = get().tasks.find((t) => t.id === id)
      if (!task) return
      // New position halfway between its new neighbours, so only this row changes.
      const column = get().tasks.filter((t) => t.status === status && t.id !== id).sort(byPosition)
      const at = beforeId ? column.findIndex((t) => t.id === beforeId) : -1
      const prev = at < 0 ? column.at(-1) : column[at - 1]
      const next = at < 0 ? undefined : column[at]
      const position = !prev ? (next ? next.position - 1024 : 1024) : !next ? prev.position + 1024 : (prev.position + next.position) / 2
      const t = patchTask(id, (t) => ({ ...withStatus(t, status), position }))
      if (!t) return
      save('Move', supabase.from('tasks').update({ status: t.status, done_at: t.doneAt ?? null, position }).eq('id', id))

      // No room left between the neighbours: renumber the column (rare).
      if ((prev && position <= prev.position) || (next && position >= next.position)) {
        const ordered = [...column]
        ordered.splice(at < 0 ? ordered.length : at, 0, t)
        const renumbered = new Map(ordered.map((x, i) => [x.id, (i + 1) * 1024]))
        set((s) => ({ tasks: s.tasks.map((x) => (renumbered.has(x.id) ? { ...x, position: renumbered.get(x.id)! } : x)) }))
        save('Reorder', ...ordered.map((x) => supabase.from('tasks').update({ position: renumbered.get(x.id) }).eq('id', x.id)))
      }
    },

    deleteTask: (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      save('Delete', supabase.from('tasks').delete().eq('id', id))
    },

    addSubtask: (taskId, title) => {
      const sub = { id: newId(), title, done: false }
      const t = patchTask(taskId, (t) => ({ ...t, subtasks: [...t.subtasks, sub] }))
      if (t)
        save('Subtask', supabase.from('subtasks').insert({ id: sub.id, workspace_id: WORKSPACE_ID, task_id: taskId, title, position: t.subtasks.length - 1 }))
    },

    toggleSubtask: (taskId, subId) => {
      const t = patchTask(taskId, (t) => ({ ...t, subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st)) }))
      const sub = t?.subtasks.find((st) => st.id === subId)
      if (sub) save('Subtask', supabase.from('subtasks').update({ done: sub.done }).eq('id', subId))
    },

    removeSubtask: (taskId, subId) => {
      if (patchTask(taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((st) => st.id !== subId) })))
        save('Subtask', supabase.from('subtasks').delete().eq('id', subId))
    },

    addComment: (taskId, text) => {
      const c = { id: newId(), by: ME, text, at: now() }
      if (patchTask(taskId, (t) => ({ ...t, comments: [...t.comments, c] })))
        save('Comment', supabase.from('comments').insert({ id: c.id, workspace_id: WORKSPACE_ID, task_id: taskId, author_id: ME, body: text }))
    },

    addEvent: (input) => {
      const event: CalEvent = { ...input, id: newId() }
      set((s) => ({ events: [...s.events, event] }))
      save(
        'Event',
        supabase.from('events').insert({
          id: event.id, workspace_id: WORKSPACE_ID, project_id: event.projectId ?? null, title: event.title,
          starts_at: event.start, len_min: event.lenMin, kind: event.kind, place: event.place ?? null,
        }),
        supabase.from('event_attendees').insert(event.people.map((actor_id) => ({ workspace_id: WORKSPACE_ID, event_id: event.id, actor_id }))),
      )
      return event
    },

    removeEvent: (id) => {
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
      save('Remove event', supabase.from('events').delete().eq('id', id))
    },

    addProject: (input) => {
      const project: Project = {
        ...input,
        id: newId(),
        members: [input.lead],
        status: 'planning',
        started: dayKey(),
        pinned: false,
        milestones: [],
        goal: '',
        gates: { plan: true, merge: true, deploy: false },
      }
      set((s) => ({ projects: [...s.projects, project] }))
      save(
        'New project',
        supabase.from('projects').insert({
          id: project.id, workspace_id: WORKSPACE_ID, name: project.name, summary: project.summary, lead_id: project.lead,
          hue: project.hue, icon: project.icon, status: project.status, started: project.started, due: project.due,
        }),
        supabase.from('project_members').insert({ workspace_id: WORKSPACE_ID, project_id: project.id, actor_id: project.lead }),
      )
      return project
    },

    togglePin: (projectId) => {
      const p = get().projects.find((p) => p.id === projectId)
      if (!p) return
      set((s) => ({ projects: s.projects.map((x) => (x.id === projectId ? { ...x, pinned: !x.pinned } : x)) }))
      save(
        p.pinned ? 'Unpin' : 'Pin',
        p.pinned
          ? supabase.from('project_pins').delete().eq('project_id', projectId).eq('user_id', USER_ID)
          : supabase.from('project_pins').insert({ workspace_id: WORKSPACE_ID, project_id: projectId, user_id: USER_ID }),
      )
    },

    toggleMilestone: (projectId, milestoneId) => {
      const m = get().projects.find((p) => p.id === projectId)?.milestones.find((m) => m.id === milestoneId)
      if (!m) return
      set((s) => ({
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, milestones: p.milestones.map((x) => (x.id === milestoneId ? { ...x, done: !x.done } : x)) } : p,
        ),
      }))
      save('Milestone', supabase.from('milestones').update({ done: !m.done }).eq('id', milestoneId))
    },

    logFocus: (entry) => {
      const f = { ...entry, id: newId() }
      set((s) => ({ focusLog: [...s.focusLog, f] }))
      save(
        'Focus session',
        supabase.from('focus_sessions').insert({
          id: f.id, workspace_id: WORKSPACE_ID, actor_id: ME, task_id: f.taskId ?? null, started_at: f.start, minutes: f.minutes,
        }),
      )
    },

    markAllRead: () => {
      set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) }))
      save('Mark read', supabase.from('notifications').update({ read: true }).eq('recipient_id', ME).eq('read', false))
    },

    notify: (n, key) => {
      if (key && get().notices.some((x) => x.dedupeKey === key)) return
      const notice: Notice = { ...n, id: newId(), at: now(), read: false, dedupeKey: key }
      set((s) => ({ notices: [notice, ...s.notices] }))
      const row = {
        id: notice.id, workspace_id: WORKSPACE_ID, recipient_id: ME, from_actor_id: n.from === 'pane' ? null : n.from,
        kind: n.kind ?? 'update', text: n.text, dedupe_key: key ?? null,
      }
      // Another tab may have sent the same keyed reminder; the database keeps the first.
      save('Notification', key
        ? supabase.from('notifications').upsert(row, { onConflict: 'recipient_id,dedupe_key', ignoreDuplicates: true })
        : supabase.from('notifications').insert(row))
    },

    addInvite: (input) => {
      const invite = { ...input, id: newId(), at: now() }
      set((s) => ({ invites: [...s.invites, invite] }))
      save('Invite', supabase.from('invites').insert({ id: invite.id, workspace_id: WORKSPACE_ID, ...input, invited_by: ME }))
    },

    cancelInvite: (id) => {
      set((s) => ({ invites: s.invites.filter((i) => i.id !== id) }))
      save('Cancel invite', supabase.from('invites').delete().eq('id', id))
    },

    updateMe: (patch) => {
      set((s) => ({ people: s.people.map((p) => (p.id === ME ? { ...p, ...patch } : p)) }))
      save('Profile', supabase.from('actors').update(patch).eq('id', ME))
    },
  }
})

export { ME }
