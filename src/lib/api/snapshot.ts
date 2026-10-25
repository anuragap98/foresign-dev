import type {
  Activity,
  Artifact,
  CalEvent,
  FocusEntry,
  Gate,
  Invite,
  Notice,
  Person,
  Project,
  Run,
  Task,
} from '@/data/types'
import { supabase } from '@/lib/supabase'

/** Everything the app shows for one workspace, already in the app's shapes. */
export interface Snapshot {
  people: Person[]
  projects: Project[]
  tasks: Task[]
  events: CalEvent[]
  focusLog: FocusEntry[]
  notices: Notice[]
  activity: Activity[]
  invites: Invite[]
  runs: Run[]
  artifacts: Artifact[]
  gates: Gate[]
}

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const PAGE = 1000

/** Reads every row of a table for the workspace, a page at a time (the API caps responses). */
async function all(table: string, workspaceId: string, columns = '*', order?: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).eq('workspace_id', workspaceId).range(from, from + PAGE - 1)
    if (order) q = q.order(order)
    const { data, error } = await q
    if (error) throw new Error(`Loading ${table} failed: ${error.message}`)
    rows.push(...(data as unknown as Row[]))
    if (!data || data.length < PAGE) return rows
  }
}

const opt = <T>(v: T | null | undefined) => (v === null ? undefined : v)

export function toPerson(r: Row): Person {
  return {
    id: r.id,
    kind: r.kind,
    userId: opt(r.user_id),
    name: r.name,
    email: r.email ?? '',
    role: r.role,
    team: r.team ?? 'Product',
    hue: r.hue,
    presence: r.presence,
    presenceNote: opt(r.presence_note),
    city: r.city ?? '',
    tz: r.tz,
    capacityH: Number(r.capacity_h),
    focusWeekH: Number(r.focus_week_h),
    runtime: opt(r.runtime),
    model: opt(r.model),
    agentStatus: opt(r.agent_status),
  }
}

export async function loadSnapshot(workspaceId: string, meId: string, userId: string): Promise<Snapshot> {
  const [
    actors, projects, members, pins, milestones, tasks, deps, subtasks, comments,
    events, attendees, focus, notices, activity, invites, runs, artifacts, gates,
  ] = await Promise.all([
    all('actors', workspaceId),
    all('projects', workspaceId, '*', 'created_at'),
    all('project_members', workspaceId),
    all('project_pins', workspaceId),
    all('milestones', workspaceId, '*', 'date'),
    all('tasks', workspaceId, '*', 'position'),
    all('task_dependencies', workspaceId),
    all('subtasks', workspaceId, '*', 'position'),
    all('comments', workspaceId, '*', 'created_at'),
    all('events', workspaceId, '*', 'starts_at'),
    all('event_attendees', workspaceId),
    all('focus_sessions', workspaceId, '*', 'started_at'),
    all('notifications', workspaceId, '*', 'created_at'),
    all('activity', workspaceId, '*', 'created_at'),
    all('invites', workspaceId, '*', 'created_at'),
    all('runs', workspaceId, '*', 'started_at'),
    all('artifacts', workspaceId, '*', 'created_at'),
    all('gates', workspaceId, '*', 'requested_at'),
  ])

  const group = <T>(rows: Row[], key: string, map: (r: Row) => T) => {
    const m = new Map<string, T[]>()
    for (const r of rows) m.set(r[key], [...(m.get(r[key]) ?? []), map(r)])
    return m
  }
  const membersBy = group(members, 'project_id', (r) => r.actor_id as string)
  const milestonesBy = group(milestones, 'project_id', (r) => ({ id: r.id, title: r.title, date: r.date, done: r.done }))
  const pinned = new Set(pins.filter((p) => p.user_id === userId).map((p) => p.project_id))
  const depsBy = group(deps, 'task_id', (r) => r.depends_on_id as string)
  const subsBy = group(subtasks, 'task_id', (r) => ({ id: r.id, title: r.title, done: r.done }))
  const commentsBy = group(comments, 'task_id', (r) => ({ id: r.id, by: r.author_id, text: r.body, at: r.created_at }))
  const attendeesBy = group(attendees, 'event_id', (r) => r.actor_id as string)

  return {
    people: actors.map(toPerson),
    projects: projects.map((r) => ({
      id: r.id,
      name: r.name,
      summary: r.summary,
      lead: r.lead_id,
      members: membersBy.get(r.id) ?? [],
      hue: r.hue,
      icon: r.icon,
      status: r.status,
      started: r.started,
      due: r.due,
      pinned: pinned.has(r.id),
      milestones: milestonesBy.get(r.id) ?? [],
      goal: r.goal,
      repoUrl: opt(r.repo_url),
      gates: { plan: false, merge: false, deploy: false, ...r.gates },
      budgetTokens: r.budget_tokens === null ? undefined : Number(r.budget_tokens),
      budgetUsd: r.budget_usd === null ? undefined : Number(r.budget_usd),
    })),
    tasks: tasks.map((r) => ({
      id: r.id,
      title: r.title,
      projectId: r.project_id,
      assignee: r.assignee_id,
      priority: r.priority,
      status: r.status,
      due: r.due,
      estH: Number(r.est_h),
      createdAt: r.created_at,
      doneAt: opt(r.done_at),
      subtasks: subsBy.get(r.id) ?? [],
      comments: commentsBy.get(r.id) ?? [],
      description: r.description,
      acceptance: r.acceptance_criteria,
      createdBy: opt(r.created_by),
      source: r.source,
      parentTaskId: opt(r.parent_task_id),
      dependsOn: depsBy.get(r.id) ?? [],
      position: Number(r.position),
      attempts: r.attempts,
    })),
    events: events.map((r) => ({
      id: r.id,
      title: r.title,
      start: r.starts_at,
      lenMin: r.len_min,
      kind: r.kind,
      projectId: opt(r.project_id),
      place: opt(r.place),
      people: attendeesBy.get(r.id) ?? [],
    })),
    focusLog: focus
      .filter((r) => r.actor_id === meId)
      .map((r) => ({ id: r.id, start: r.started_at, minutes: r.minutes, taskId: opt(r.task_id) })),
    notices: notices
      .map((r) => ({
        id: r.id,
        from: r.from_actor_id ?? 'pane',
        kind: r.kind,
        text: r.text,
        at: r.created_at,
        read: r.read,
        dedupeKey: opt(r.dedupe_key),
      }))
      .reverse(),
    activity: activity.map((r) => ({ id: r.id, who: r.actor_id, text: r.text, projectId: r.project_id, at: r.created_at })).reverse(),
    invites: invites
      .filter((r) => !r.accepted_at)
      .map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, team: r.team, at: r.created_at })),
    runs: runs.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      taskId: opt(r.task_id),
      agentId: r.agent_id,
      parentRunId: opt(r.parent_run_id),
      status: r.status,
      startedAt: r.started_at,
      endedAt: opt(r.ended_at),
      tokensIn: Number(r.tokens_in),
      tokensOut: Number(r.tokens_out),
      costUsd: Number(r.cost_usd),
      model: opt(r.model),
      summary: r.summary,
    })),
    artifacts: artifacts.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      taskId: opt(r.task_id),
      runId: opt(r.run_id),
      kind: r.kind,
      title: r.title,
      url: opt(r.url),
      status: opt(r.status),
      createdAt: r.created_at,
    })),
    gates: gates.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      kind: r.kind,
      taskId: opt(r.task_id),
      title: r.title,
      summary: r.summary,
      status: r.status,
      requestedByRun: opt(r.requested_by_run),
      requestedAt: r.requested_at,
      decidedBy: opt(r.decided_by),
      decidedAt: opt(r.decided_at),
      note: opt(r.note),
    })),
  }
}

/** The signed-in person's workspace and their actor in it. */
export async function loadMembership(userId: string) {
  const { data, error } = await supabase.from('memberships').select('workspace_id, actor_id').eq('user_id', userId).limit(1).maybeSingle()
  if (error) throw new Error(`Loading your workspace failed: ${error.message}`)
  return data ? { workspaceId: data.workspace_id as string, actorId: data.actor_id as string } : null
}
