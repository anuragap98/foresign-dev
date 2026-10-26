// Small builders for unit tests: sensible defaults, override what the test is about.
import type { Gate, Person, Project, Run, Task } from '@/data/types'

export const NOW = new Date('2026-10-26T12:00:00Z')
export const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()

export const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  projectId: 'p1',
  assignee: 'lin',
  priority: 'medium',
  status: 'todo',
  due: '2026-10-30',
  estH: 2,
  createdAt: minsAgo(60 * 24),
  subtasks: [],
  comments: [],
  description: '',
  acceptance: '',
  source: 'human',
  dependsOn: [],
  position: 1024,
  attempts: 0,
  ...over,
})

export const run = (id: string, over: Partial<Run> = {}): Run => ({
  id,
  projectId: 'p1',
  agentId: 'cc',
  status: 'succeeded',
  startedAt: minsAgo(60),
  endedAt: minsAgo(30),
  tokensIn: 1000,
  tokensOut: 100,
  costUsd: 0.1,
  summary: '',
  ...over,
})

export const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  kind: 'person',
  name: id,
  role: '',
  team: 'Product',
  presence: 'online',
  city: '',
  tz: 'UTC',
  capacityH: 32,
  focusWeekH: 0,
  email: `${id}@example.com`,
  hue: 'blue',
  ...over,
})

export const agent = (id: string, over: Partial<Person> = {}) => person(id, { kind: 'agent', runtime: 'claude-code', ...over })

export const project = (id: string, over: Partial<Project> = {}): Project => ({
  id,
  name: id,
  summary: '',
  lead: 'lin',
  members: [],
  hue: 'blue',
  icon: 'folder',
  status: 'progress',
  started: '2026-10-01',
  due: '2026-11-30',
  pinned: false,
  milestones: [],
  goal: '',
  gates: { plan: true, merge: true, deploy: false },
  ...over,
})

export const gate = (id: string, over: Partial<Gate> = {}): Gate => ({
  id,
  projectId: 'p1',
  kind: 'plan',
  title: 'Plan: 3 tasks',
  summary: '',
  status: 'pending',
  requestedAt: minsAgo(10),
  ...over,
})
