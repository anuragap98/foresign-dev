/** Board columns use the first four; agents can also park tasks as blocked, failed or awaiting approval. */
export type Status = 'todo' | 'doing' | 'review' | 'done' | 'blocked' | 'failed' | 'awaiting_approval'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Hue = 'blue' | 'purple' | 'pink' | 'orange' | 'green' | 'teal' | 'indigo' | 'yellow'
export type Team = 'Product' | 'Design' | 'Engineering' | 'Marketing'
export type Presence = 'online' | 'focus' | 'meeting' | 'away'
export type ProjectStatus = 'planning' | 'progress' | 'review' | 'shipped'
export type ProjectIcon = 'folder' | 'rocket' | 'leaf' | 'flame' | 'phone' | 'grid' | 'chart' | 'sparkle'
export type EventKind = 'meeting' | 'focus' | 'review' | 'deadline' | 'team'
export type ActorKind = 'person' | 'agent'
export type TaskSource = 'human' | 'agent'
export type RunStatus = 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled' | 'stale'
export type RunEventType = 'tool_call' | 'command' | 'file_edit' | 'message' | 'error' | 'note'
export type ArtifactKind = 'branch' | 'commit' | 'pull_request' | 'test_report' | 'deploy' | 'doc'
export type GateKind = 'plan' | 'merge' | 'deploy' | 'custom'
export type GateStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'

/** An actor: a person or an agent. Anything with a "who" points at one. */
export interface Person {
  id: string
  kind: ActorKind
  /** Set for people who can sign in. */
  userId?: string
  name: string
  role: string
  team: Team
  presence: Presence
  /** e.g. "until 11:30 AM" or the meeting name */
  presenceNote?: string
  city: string
  tz: string
  capacityH: number
  /** Hours spent in focus sessions this week (sample figure for teammates). */
  focusWeekH: number
  email: string
  hue: Hue
  /** Agents only */
  runtime?: string
  model?: string
  agentStatus?: 'running' | 'idle' | 'offline'
}

export interface Invite {
  id: string
  name: string
  email: string
  role: string
  team: Team
  at: string
}

export interface Milestone {
  id: string
  title: string
  date: string // day key
  done: boolean
}

export interface Project {
  id: string
  name: string
  summary: string
  lead: string
  members: string[]
  hue: Hue
  icon: ProjectIcon
  status: ProjectStatus
  started: string // day key
  due: string // day key
  pinned: boolean
  milestones: Milestone[]
  /** What agents should build (markdown). */
  goal: string
  repoUrl?: string
  gates: { plan: boolean; merge: boolean; deploy: boolean }
  budgetTokens?: number
  budgetUsd?: number
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  by: string
  text: string
  at: string
}

export interface Task {
  id: string
  title: string
  projectId: string
  assignee: string
  priority: Priority
  status: Status
  due: string // day key
  estH: number
  createdAt: string
  doneAt?: string
  subtasks: Subtask[]
  comments: Comment[]
  description: string
  acceptance: string
  createdBy?: string
  source: TaskSource
  parentTaskId?: string
  dependsOn: string[]
  /** Order within its column. */
  position: number
  attempts: number
}

export interface CalEvent {
  id: string
  title: string
  start: string // ISO
  lenMin: number
  kind: EventKind
  projectId?: string
  place?: string
  people: string[]
}

export interface FocusEntry {
  id: string
  start: string
  minutes: number
  taskId?: string
}

export interface Notice {
  id: string
  /** A person id, or 'pane' for reminders the app sends itself. */
  from: string
  kind?: 'mention' | 'review' | 'update' | 'reminder' | 'gate' | 'failure'
  text: string
  at: string
  read: boolean
  dedupeKey?: string
}

export interface Activity {
  id: string
  who: string
  text: string
  projectId: string
  at: string
}

export interface Run {
  id: string
  projectId: string
  taskId?: string
  agentId: string
  parentRunId?: string
  status: RunStatus
  startedAt: string
  endedAt?: string
  tokensIn: number
  tokensOut: number
  costUsd: number
  model?: string
  summary: string
}

/** One step in a run's trace. Loaded per run, not with the workspace. */
export interface RunEvent {
  id: number
  runId: string
  ts: string
  type: RunEventType
  name: string
  durationMs?: number
  tokens?: number
  detail?: string
}

export interface Artifact {
  id: string
  projectId: string
  taskId?: string
  runId?: string
  kind: ArtifactKind
  title: string
  url?: string
  status?: string
  createdAt: string
}

export interface Gate {
  id: string
  projectId: string
  kind: GateKind
  taskId?: string
  title: string
  summary: string
  status: GateStatus
  requestedByRun?: string
  requestedAt: string
  decidedBy?: string
  decidedAt?: string
  note?: string
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
  failed: 'Failed',
  awaiting_approval: 'Awaiting approval',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Planning',
  progress: 'In progress',
  review: 'In review',
  shipped: 'Shipped',
}

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  meeting: 'Meeting',
  focus: 'Focus block',
  review: 'Review',
  deadline: 'Deadline',
  team: 'Team',
}

export const HUES: Hue[] = ['blue', 'purple', 'pink', 'orange', 'green', 'teal', 'indigo', 'yellow']
