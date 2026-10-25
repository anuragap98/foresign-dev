import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { buildSeed, ME, type Workspace } from '@/data/seed'
import type { CalEvent, FocusEntry, Invite, Notice, Project, Status, Task } from '@/data/types'
import { DAY, dayKey, daysBetween, parseDay, shiftDay } from '@/lib/time'
import { uid } from '@/lib/utils'

export type NewTask = Pick<Task, 'title' | 'projectId' | 'assignee' | 'priority' | 'due' | 'status' | 'estH'>
export type NewEvent = Omit<CalEvent, 'id'>
export type NewProject = Pick<Project, 'name' | 'summary' | 'lead' | 'hue' | 'due' | 'icon'>
export type NewInvite = Omit<Invite, 'id' | 'at'>

interface WorkspaceState extends Workspace {
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
  reset: () => void
}

const shiftIso = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString()

/** Status change that keeps `doneAt` honest. */
const withStatus = (t: Task, status: Status): Task => ({
  ...t,
  status,
  doneAt: status === 'done' ? (t.status === 'done' ? t.doneAt : new Date().toISOString()) : undefined,
})

/**
 * The sample workspace is anchored to the day it was seeded. When it is
 * reopened on a later day every date moves forward by the same amount, so
 * "today" always has meetings and due tasks.
 */
function rebase(ws: Workspace, today = new Date()): Workspace {
  const delta = daysBetween(parseDay(ws.seededOn), today)
  if (delta === 0) return ws
  return {
    seededOn: dayKey(today),
    projects: ws.projects.map((p) => ({
      ...p,
      started: shiftDay(p.started, delta),
      due: shiftDay(p.due, delta),
      milestones: p.milestones.map((m) => ({ ...m, date: shiftDay(m.date, delta) })),
    })),
    tasks: ws.tasks.map((t) => ({
      ...t,
      due: shiftDay(t.due, delta),
      createdAt: shiftIso(t.createdAt, delta),
      doneAt: t.doneAt && shiftIso(t.doneAt, delta),
    })),
    events: ws.events.map((e) => ({ ...e, start: shiftIso(e.start, delta) })),
    focusLog: ws.focusLog.map((f) => ({ ...f, start: shiftIso(f.start, delta) })),
    notices: ws.notices.map((n) => ({ ...n, at: shiftIso(n.at, delta) })),
    activity: ws.activity.map((a) => ({ ...a, at: shiftIso(a.at, delta) })),
    invites: (ws.invites ?? []).map((i) => ({ ...i, at: shiftIso(i.at, delta) })),
    sent: ws.sent ?? [],
  }
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...buildSeed(),

      addTask: (input) => {
        const task: Task = {
          ...input,
          id: uid(input.projectId),
          createdAt: new Date().toISOString(),
          doneAt: input.status === 'done' ? new Date().toISOString() : undefined,
          subtasks: [],
          comments: [],
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        return task
      },

      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      toggleDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? withStatus(t, t.status === 'done' ? 'todo' : 'done') : t)),
        })),

      setStatus: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? withStatus(t, status) : t)) })),

      moveTask: (id, status, beforeId) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id)
          if (!task) return s
          const rest = s.tasks.filter((t) => t.id !== id)
          const moved = withStatus(task, status)
          const at = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1
          if (at < 0) return { tasks: [...rest, moved] }
          return { tasks: [...rest.slice(0, at), moved, ...rest.slice(at)] }
        }),

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addSubtask: (taskId, title) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: [...t.subtasks, { id: uid('sub'), title, done: false }] } : t,
          ),
        })),

      toggleSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st)) }
              : t,
          ),
        })),

      removeSubtask: (taskId, subId) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subId) } : t)),
        })),

      addComment: (taskId, text) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, comments: [...t.comments, { id: uid('c'), by: ME, text, at: new Date().toISOString() }] }
              : t,
          ),
        })),

      addEvent: (input) => {
        const event: CalEvent = { ...input, id: uid('ev') }
        set((s) => ({ events: [...s.events, event] }))
        return event
      },

      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      addProject: (input) => {
        const project: Project = {
          ...input,
          id: uid('proj'),
          members: [input.lead],
          status: 'planning',
          started: dayKey(),
          pinned: false,
          milestones: [],
        }
        set((s) => ({ projects: [...s.projects, project] }))
        return project
      },

      togglePin: (projectId) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === projectId ? { ...p, pinned: !p.pinned } : p)) })),

      toggleMilestone: (projectId, milestoneId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }
              : p,
          ),
        })),

      logFocus: (entry) => set((s) => ({ focusLog: [...s.focusLog, { ...entry, id: uid('f') }] })),

      markAllRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),

      notify: (n, key) =>
        set((s) => {
          if (key && s.sent.includes(key)) return s
          const notice: Notice = { ...n, id: uid('n'), at: new Date().toISOString(), read: false }
          return { notices: [notice, ...s.notices], sent: key ? [...s.sent, key] : s.sent }
        }),

      addInvite: (input) =>
        set((s) => ({ invites: [...s.invites, { ...input, id: uid('inv'), at: new Date().toISOString() }] })),

      cancelInvite: (id) => set((s) => ({ invites: s.invites.filter((i) => i.id !== id) })),

      reset: () => set(buildSeed()),
    }),
    {
      name: 'agent-panel:workspace',
      // v2 added months of history; older saved samples are replaced with the new one.
      version: 2,
      migrate: () => buildSeed(),
      partialize: ({ seededOn, projects, tasks, events, focusLog, notices, activity, invites, sent }) => ({
        seededOn, projects, tasks, events, focusLog, notices, activity, invites, sent,
      }),
      merge: (persisted, current) => ({ ...current, ...rebase(persisted as Workspace) }),
    },
  ),
)

export { ME }
