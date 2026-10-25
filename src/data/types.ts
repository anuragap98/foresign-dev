export type Status = 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Hue = 'blue' | 'purple' | 'pink' | 'orange' | 'green' | 'teal' | 'indigo' | 'yellow'
export type Team = 'Product' | 'Design' | 'Engineering' | 'Marketing'
export type Presence = 'online' | 'focus' | 'meeting' | 'away'
export type ProjectStatus = 'planning' | 'progress' | 'review' | 'shipped'
export type ProjectIcon = 'folder' | 'rocket' | 'leaf' | 'flame' | 'phone' | 'grid' | 'chart' | 'sparkle'
export type EventKind = 'meeting' | 'focus' | 'review' | 'deadline' | 'team'

export interface Person {
  id: string
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
  kind?: 'mention' | 'review' | 'update' | 'reminder'
  text: string
  at: string
  read: boolean
}

export interface Activity {
  id: string
  who: string
  text: string
  projectId: string
  at: string
}

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'In review',
  done: 'Done',
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
