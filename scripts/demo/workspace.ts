import { addDays, at, dayKey, fmtTime, HOUR, MIN } from '@/lib/time'
import type {
  Activity,
  CalEvent,
  EventKind,
  FocusEntry,
  Invite,
  Notice,
  Person,
  Priority,
  Project,
  Status,
  Task,
} from '@/data/types'

// The sample predates agents: these are the app types without the agent-era fields,
// which the seed script fills in when it writes rows.
type DemoPerson = Omit<Person, 'kind'>
type DemoProject = Omit<Project, 'goal' | 'gates'>
type DemoTask = Omit<Task, 'description' | 'acceptance' | 'source' | 'dependsOn' | 'position' | 'attempts'>

export const ME = 'lin'

/* People are static: presence notes are relative to when the app loads. */
const soon = (mins: number) => `until ${fmtTime(new Date(Date.now() + mins * MIN))}`

export const PEOPLE: DemoPerson[] = [
  { id: 'lin', name: 'Lin Zhao', role: 'Product Lead', team: 'Product', presence: 'online', city: 'London', tz: 'Europe/London', capacityH: 32, focusWeekH: 6, email: 'lin@pane.app', hue: 'blue' },
  { id: 'nia', name: 'Nia Okoro', role: 'Design Lead', team: 'Design', presence: 'focus', presenceNote: soon(47), city: 'Lagos', tz: 'Africa/Lagos', capacityH: 32, focusWeekH: 4, email: 'nia@pane.app', hue: 'purple' },
  { id: 'elise', name: 'Elise Marchand', role: 'Product Designer', team: 'Design', presence: 'online', city: 'Lyon', tz: 'Europe/Paris', capacityH: 36, focusWeekH: 9, email: 'elise@pane.app', hue: 'pink' },
  { id: 'kwame', name: 'Kwame Asante', role: 'iOS Engineer', team: 'Engineering', presence: 'meeting', presenceNote: 'Tide sync review', city: 'Accra', tz: 'Africa/Accra', capacityH: 36, focusWeekH: 7, email: 'kwame@pane.app', hue: 'orange' },
  { id: 'peter', name: 'Peter Lund', role: 'Engineering Manager', team: 'Engineering', presence: 'online', city: 'Copenhagen', tz: 'Europe/Copenhagen', capacityH: 28, focusWeekH: 2, email: 'peter@pane.app', hue: 'teal' },
  { id: 'freya', name: 'Freya Nilsen', role: 'Brand Designer', team: 'Design', presence: 'away', city: 'Bergen', tz: 'Europe/Oslo', capacityH: 32, focusWeekH: 5, email: 'freya@pane.app', hue: 'yellow' },
  { id: 'omar', name: 'Omar Saleh', role: 'Backend Engineer', team: 'Engineering', presence: 'focus', presenceNote: soon(47), city: 'Amman', tz: 'Asia/Amman', capacityH: 36, focusWeekH: 11, email: 'omar@pane.app', hue: 'green' },
  { id: 'haruto', name: 'Haruto Sato', role: 'Frontend Engineer', team: 'Engineering', presence: 'online', city: 'Tokyo', tz: 'Asia/Tokyo', capacityH: 36, focusWeekH: 8, email: 'haruto@pane.app', hue: 'indigo' },
  { id: 'ines', name: 'Inés Duarte', role: 'Marketing Lead', team: 'Marketing', presence: 'meeting', presenceNote: 'Press briefing', city: 'Lisbon', tz: 'Europe/Lisbon', capacityH: 32, focusWeekH: 3, email: 'ines@pane.app', hue: 'pink' },
  { id: 'vikram', name: 'Vikram Nair', role: 'Data Analyst', team: 'Product', presence: 'online', city: 'Bengaluru', tz: 'Asia/Kolkata', capacityH: 32, focusWeekH: 6, email: 'vikram@pane.app', hue: 'teal' },
  { id: 'camila', name: 'Camila Ortiz', role: 'Content Strategist', team: 'Marketing', presence: 'away', city: 'Mexico City', tz: 'America/Mexico_City', capacityH: 28, focusWeekH: 4, email: 'camila@pane.app', hue: 'orange' },
  { id: 'malik', name: 'Malik Johnson', role: 'QA Engineer', team: 'Engineering', presence: 'away', city: 'Atlanta', tz: 'America/New_York', capacityH: 36, focusWeekH: 5, email: 'malik@pane.app', hue: 'purple' },
]

export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p])) as Record<string, DemoPerson>

export interface Workspace {
  seededOn: string
  projects: DemoProject[]
  tasks: DemoTask[]
  events: CalEvent[]
  focusLog: FocusEntry[]
  notices: Notice[]
  activity: Activity[]
  invites: Invite[]
  /** Keys of reminders already sent, so each fires once. */
  sent: string[]
}

type OpenRow = [title: string, project: string, assignee: string, priority: Priority, status: Status, dueIn: number, estH: number, subsDone?: number, comments?: number]
type DoneRow = [title: string, project: string, assignee: string, daysAgo: number]

const OPEN: OpenRow[] = [
  ['Review Tide release checklist', 'tide', 'lin', 'high', 'doing', 0, 2],
  ['Plan next sprint goals', 'tide', 'lin', 'medium', 'todo', 0, 1],
  ['Image cache eviction', 'tide', 'haruto', 'high', 'todo', 0, 4, 1],
  ['Pull-to-refresh spring', 'tide', 'haruto', 'high', 'todo', 0, 3, undefined, 1],
  ['Settings search', 'tide', 'haruto', 'low', 'doing', 4, 3],
  ['Crash on cold launch in iOS 18', 'tide', 'kwame', 'low', 'doing', 14, 5, 2, 1],
  ['Onboarding copy review', 'tide', 'elise', 'high', 'doing', 24, 4],
  ['Push notification permissions flow', 'tide', 'elise', 'urgent', 'review', 24, 6],
  ['Accessibility audit: Dynamic Type', 'tide', 'kwame', 'low', 'review', 24, 4],
  ['Reply to Facet token questions', 'facet', 'lin', 'medium', 'todo', 0, 1],
  ['Menu + context menu', 'facet', 'haruto', 'medium', 'todo', 23, 5],
  ['Avatar stack', 'facet', 'haruto', 'low', 'todo', 24, 2],
  ['Motion guidelines page', 'facet', 'elise', 'medium', 'doing', 6, 6],
  ['Component usage analytics', 'facet', 'vikram', 'low', 'doing', 17, 4, 2, 1],
  ['Date picker', 'facet', 'haruto', 'medium', 'review', 10, 6, 2],
  ['Token export to iOS', 'facet', 'nia', 'urgent', 'review', 22, 5],
  ['Approve Orbit press kit', 'orbit', 'lin', 'urgent', 'todo', 0, 1],
  ['Photography call sheet', 'orbit', 'freya', 'urgent', 'todo', 3, 3, undefined, 1],
  ['Founder blog post', 'orbit', 'camila', 'high', 'todo', 3, 4, 1, 1],
  ['Launch-day run of show', 'orbit', 'ines', 'high', 'todo', 5, 3],
  ['Partner quotes sign-off', 'orbit', 'ines', 'high', 'doing', 1, 2],
  ['Pricing page FAQ', 'orbit', 'camila', 'medium', 'review', 7, 2, undefined, 1],
  ['Product Hunt assets', 'orbit', 'freya', 'high', 'review', 2, 5, 2],
  ['Write Sprout read-out summary', 'sprout', 'lin', 'high', 'doing', 0, 3],
  ['Invite flow friction log', 'sprout', 'lin', 'urgent', 'review', 0, 2],
  ['Day-3 nudge email', 'sprout', 'camila', 'urgent', 'doing', 2, 2, undefined, 1],
  ['Read-out deck', 'sprout', 'vikram', 'high', 'review', 0, 4, 2],
  ['Moodboard round one', 'ember', 'freya', 'medium', 'todo', 52, 6, undefined, 1],
  ['Media plan budget', 'ember', 'ines', 'medium', 'todo', 28, 4],
  ['Agency shortlist', 'ember', 'nia', 'medium', 'todo', 47, 3, 1],
  ['Campaign line options', 'ember', 'camila', 'high', 'todo', 33, 4],
  ['Creative brief draft', 'ember', 'freya', 'low', 'doing', 22, 6, 2],
]

const DONE: DoneRow[] = [
  ['Answer Kwame on the sync edge case', 'tide', 'lin', 0],
  ['Share sprint notes', 'facet', 'lin', 0],
  ['Profile screen empty states', 'tide', 'elise', 0],
  ['Activation funnel dashboard', 'sprout', 'vikram', 0],
  ['Haptics pass on the tab bar', 'tide', 'kwame', 1],
  ['Write release notes for 3.0', 'tide', 'peter', 1],
  ['Template gallery picks', 'sprout', 'camila', 1],
  ['Launch film rough cut', 'orbit', 'ines', 1],
  ['Colour token audit', 'facet', 'nia', 1],
  ['Build offline queue for edits', 'tide', 'omar', 2],
  ['Waitlist email draft', 'orbit', 'camila', 2],
  ['Button states spec', 'facet', 'elise', 2],
  ['Onboarding checklist copy', 'sprout', 'camila', 2],
  ['Sync conflict banner', 'tide', 'haruto', 2],
  ['Icon set refresh', 'facet', 'freya', 3],
  ['Press list', 'orbit', 'ines', 3],
  ['Search indexing job', 'tide', 'omar', 3],
  ['Empty-state illustrations', 'sprout', 'freya', 3],
  ['Retention cohort query', 'sprout', 'vikram', 4],
  ['Tab bar badge logic', 'tide', 'haruto', 4],
  ['Docs site navigation', 'facet', 'nia', 4],
  ['Landing page hero', 'orbit', 'elise', 4],
  ['QA pass: login flows', 'tide', 'malik', 5],
  ['Weekly digest email', 'northstar', 'vikram', 5],
  ['Spacing scale', 'facet', 'nia', 6],
  ['Metric definitions', 'northstar', 'vikram', 8],
  ['Dashboard filters', 'northstar', 'haruto', 9],
  ['Team metric picker', 'northstar', 'elise', 10],
  ['Digest scheduling', 'northstar', 'omar', 12],
  ['Alert thresholds', 'northstar', 'malik', 13],
  ['QA pass: digest', 'northstar', 'malik', 14],
]

const CHORES = ['QA follow-ups', 'Copy tweaks', 'Design QA pass', 'Analytics events', 'Release prep', 'Docs update', 'Review feedback', 'Bug bash fixes']
const CHORE_PROJECTS = ['tide', 'facet', 'orbit', 'sprout']
const CHORE_PEOPLE = ['haruto', 'elise', 'kwame', 'camila', 'omar', 'nia', 'malik', 'vikram']

/** Older finished work, so week-over-week comparisons have a baseline. */
const HISTORY: DoneRow[] = Array.from({ length: 16 }, (_, i) => i + 5).flatMap((daysAgo) =>
  Array.from({ length: [2, 3, 1, 3, 2, 4, 2][daysAgo % 7] }, (_, j): DoneRow => {
    const k = daysAgo * 3 + j
    return [CHORES[k % CHORES.length], CHORE_PROJECTS[k % 4], CHORE_PEOPLE[k % 8], daysAgo]
  }),
)

const ARCHIVE_TITLES = [
  'Invoice PDF layout', 'Proration rules', 'Tax table import', 'Dunning emails', 'Card update flow', 'Usage metering',
  'Plan comparison page', 'Refund tooling', 'Ledger reconciliation', 'Billing settings UI', 'Webhook retries', 'Receipt copy',
]
const ARCHIVE_PEOPLE = ['peter', 'omar', 'haruto', 'vikram', 'malik', 'elise']

/**
 * Three months of older finished work (quiet at weekends), so 30- and
 * 90-day insights have a previous period to compare against. It belongs to
 * shipped projects, so the progress of active ones is untouched.
 */
function archiveRows(today: Date): DoneRow[] {
  const rows: DoneRow[] = []
  for (let daysAgo = 21; daysAgo <= 185; daysAgo++) {
    const dow = addDays(today, -daysAgo).getDay()
    const count = dow === 0 || dow === 6 ? 0 : [2, 3, 4, 2, 3, 3, 2, 4][daysAgo % 8]
    for (let j = 0; j < count; j++) {
      const k = daysAgo * 3 + j
      const projectId = daysAgo <= 45 ? 'northstar' : 'atlas'
      rows.push([projectId === 'northstar' ? CHORES[k % CHORES.length] : ARCHIVE_TITLES[k % ARCHIVE_TITLES.length], projectId, ARCHIVE_PEOPLE[k % ARCHIVE_PEOPLE.length], daysAgo])
    }
  }
  return rows
}

const SUBTASKS = ['Draft', 'Review with team', 'Polish']

type EventRow = [title: string, dayIn: number, h: number, m: number, lenMin: number, kind: EventKind, people: string[], place?: string, projectId?: string]

const EVENTS: EventRow[] = [
  ['Design critique', -3, 10, 0, 60, 'review', ['lin', 'nia', 'elise', 'freya'], 'Studio A', 'facet'],
  ['Customer call: Halvard', -2, 15, 0, 30, 'meeting', ['lin', 'vikram'], 'Video call', 'sprout'],
  ['Retro', -1, 16, 0, 45, 'team', ['lin', 'peter', 'kwame', 'haruto', 'omar']],
  ['Stand-up', 0, 9, 30, 15, 'meeting', ['lin', 'kwame', 'elise', 'haruto', 'omar'], 'Huddle room', 'tide'],
  ['Tide sync review', 0, 11, 0, 45, 'review', ['lin', 'kwame', 'peter', 'omar'], 'Video call', 'tide'],
  ['Lunch & learn: glass materials', 0, 12, 30, 60, 'team', ['lin', 'nia', 'elise', 'freya', 'haruto'], 'Kitchen'],
  ['Deep work', 0, 14, 0, 90, 'focus', ['lin']],
  ['Orbit launch film cut', 0, 16, 0, 30, 'review', ['lin', 'ines', 'freya'], 'Studio B', 'orbit'],
  ['Stand-up', 3, 9, 30, 15, 'meeting', ['lin', 'kwame', 'elise', 'haruto', 'omar'], 'Huddle room', 'tide'],
  ['Design critique', 3, 10, 0, 60, 'review', ['lin', 'nia', 'elise'], 'Studio A', 'facet'],
  ['1:1 Peter', 3, 13, 0, 30, 'meeting', ['lin', 'peter']],
  ['Offline sync demo', 4, 11, 0, 60, 'review', ['lin', 'kwame', 'omar', 'peter'], 'Video call', 'tide'],
  ['Deep work', 4, 14, 0, 120, 'focus', ['lin']],
  ['Brand brief kickoff', 5, 10, 0, 60, 'meeting', ['lin', 'freya', 'ines', 'camila'], 'Studio A', 'ember'],
  ['Team lunch', 5, 12, 30, 60, 'team', ['lin', 'nia', 'peter', 'ines', 'vikram'], 'Marea'],
  ['Launch film final', 6, 14, 0, 30, 'review', ['lin', 'ines', 'freya'], 'Studio B', 'orbit'],
  ['Sprout read-out', 7, 15, 0, 60, 'review', ['lin', 'vikram', 'peter'], 'Boardroom', 'sprout'],
]

export function buildSeed(now = new Date()): Workspace {
  const today = new Date(now)
  const day = (n: number) => dayKey(addDays(today, n))
  const ago = (mins: number) => new Date(now.getTime() - mins * MIN).toISOString()

  const projects: DemoProject[] = [
    {
      id: 'orbit', name: 'Orbit 2.0 launch', hue: 'purple', icon: 'rocket', status: 'progress', pinned: true,
      summary: 'Everything the public sees on launch day: site, film, press kit and the waitlist email.',
      lead: 'ines', members: ['ines', 'camila', 'freya', 'elise', 'lin'], started: day(-40), due: day(12),
      milestones: [
        { id: 'orbit-m1', title: 'Site copy locked', date: day(-12), done: true },
        { id: 'orbit-m2', title: 'Launch film final cut', date: day(4), done: false },
        { id: 'orbit-m3', title: 'Press embargo lifts', date: day(12), done: false },
      ],
    },
    {
      id: 'tide', name: 'Tide mobile app', hue: 'blue', icon: 'phone', status: 'progress', pinned: true,
      summary: 'The 3.0 rebuild of the Tide app: new home, offline sync and a calmer onboarding.',
      lead: 'kwame', members: ['kwame', 'elise', 'haruto', 'omar', 'malik', 'lin'], started: day(-30), due: day(40),
      milestones: [
        { id: 'tide-m1', title: 'Navigation prototype signed off', date: day(-20), done: true },
        { id: 'tide-m2', title: 'Offline sync in beta', date: day(6), done: false },
        { id: 'tide-m3', title: 'TestFlight to 500 users', date: day(15), done: false },
        { id: 'tide-m4', title: 'App Store release', date: day(40), done: false },
      ],
    },
    {
      id: 'facet', name: 'Facet design system', hue: 'pink', icon: 'grid', status: 'progress', pinned: false,
      summary: 'One set of tokens, components and docs for every Pane surface, light and dark.',
      lead: 'nia', members: ['nia', 'elise', 'haruto'], started: day(-50), due: day(60),
      milestones: [
        { id: 'facet-m1', title: 'Token pipeline', date: day(-15), done: true },
        { id: 'facet-m2', title: 'Docs site live', date: day(18), done: false },
      ],
    },
    {
      id: 'sprout', name: 'Sprout onboarding', hue: 'green', icon: 'leaf', status: 'review', pinned: false,
      summary: 'A first-week path that gets new teams to their first finished project.',
      lead: 'lin', members: ['lin', 'vikram', 'camila'], started: day(-35), due: day(5),
      milestones: [{ id: 'sprout-m1', title: 'Read-out to leadership', date: day(5), done: false }],
    },
    {
      id: 'ember', name: 'Q4 brand campaign', hue: 'orange', icon: 'flame', status: 'planning', pinned: false,
      summary: 'Out-of-home and social for the winter season, built around “work you can see through”.',
      lead: 'freya', members: ['freya', 'ines', 'camila', 'nia'], started: day(-5), due: day(68),
      milestones: [{ id: 'ember-m1', title: 'Creative brief', date: day(10), done: false }],
    },
    {
      id: 'northstar', name: 'Northstar analytics', hue: 'teal', icon: 'chart', status: 'shipped', pinned: false,
      summary: 'One trusted metric per team and a weekly digest everyone actually opens.',
      lead: 'vikram', members: ['vikram', 'haruto', 'omar', 'malik'], started: day(-70), due: day(-12),
      milestones: [{ id: 'northstar-m1', title: 'Digest live', date: day(-12), done: true }],
    },
    {
      id: 'atlas', name: 'Atlas billing', hue: 'indigo', icon: 'folder', status: 'shipped', pinned: false,
      summary: 'Invoices, plans and refunds rebuilt on one ledger, so finance stops reconciling by hand.',
      lead: 'peter', members: ['peter', 'omar', 'haruto', 'vikram', 'malik', 'elise'], started: day(-200), due: day(-46),
      milestones: [
        { id: 'atlas-m1', title: 'Ledger in production', date: day(-120), done: true },
        { id: 'atlas-m2', title: 'Old billing switched off', date: day(-46), done: true },
      ],
    },
  ]

  const counters: Record<string, number> = {}
  const nextId = (projectId: string) => {
    counters[projectId] = (counters[projectId] ?? -1) + 1
    return `${projectId}-${counters[projectId]}`
  }

  const tasks: DemoTask[] = [
    ...OPEN.map(([title, projectId, assignee, priority, status, dueIn, estH, subsDone, comments]): DemoTask => {
      const id = nextId(projectId)
      return {
        id, title, projectId, assignee, priority, status, estH,
        due: day(dueIn),
        createdAt: ago((12 + dueIn) * 24 * 60),
        subtasks: subsDone === undefined ? [] : SUBTASKS.map((t, i) => ({ id: `${id}-s${i}`, title: t, done: i < subsDone })),
        comments: comments
          ? [{ id: `${id}-c0`, by: assignee === 'nia' ? 'elise' : 'nia', text: 'Left a few notes on this, nothing blocking.', at: ago(180) }]
          : [],
      }
    }),
    ...[...DONE, ...HISTORY, ...archiveRows(today)].map(([title, projectId, assignee, daysAgo], i): DemoTask => {
      const id = nextId(projectId)
      const doneAt = daysAgo === 0 ? ago(40 + i * 55) : at(addDays(today, -daysAgo), 11 + (i % 6), (i * 13) % 60).toISOString()
      return {
        id, title, projectId, assignee,
        priority: (['medium', 'high', 'low', 'medium'] as Priority[])[i % 4],
        status: 'done',
        // Every ninth task landed a couple of days after its due date.
        due: i % 9 === 4 ? day(-daysAgo - 2) : day(-daysAgo),
        estH: 2 + (i % 4),
        // Cycle times vary between 2 and 11 days.
        createdAt: ago((daysAgo + 2 + ((i * 5) % 10)) * 24 * 60),
        doneAt,
        subtasks: i % 3 === 0 ? SUBTASKS.map((t, j) => ({ id: `${id}-s${j}`, title: t, done: true })) : [],
        comments: [],
      }
    }),
  ]

  const events: CalEvent[] = EVENTS.map(([title, dayIn, h, m, lenMin, kind, people, place, projectId], i) => ({
    id: `ev-${i}`, title, lenMin, kind, people, place, projectId,
    start: at(addDays(today, dayIn), h, m).toISOString(),
  }))

  const focusLog: FocusEntry[] = [
    { id: 'f-0', start: new Date(now.getTime() - 3 * HOUR).toISOString(), minutes: 40 },
    { id: 'f-1', start: new Date(now.getTime() - 80 * MIN).toISOString(), minutes: 26, taskId: 'tide-0' },
  ]

  const notices: Notice[] = [
    { id: 'n-0', from: 'nia', text: 'Nia mentioned you on “Glass material tokens”', at: ago(19), read: false, kind: 'mention' },
    { id: 'n-1', from: 'kwame', text: 'Kwame asked for your review on “Accessibility audit: Dynamic Type”', at: ago(62), read: false, kind: 'review' },
    { id: 'n-2', from: 'ines', text: 'Orbit launch film cut is ready to watch', at: ago(185), read: false },
    { id: 'n-3', from: 'peter', text: 'Peter moved your 1:1 to later this week', at: ago(26 * 60), read: true },
  ]

  const activity: Activity[] = [
    { id: 'a-0', who: 'kwame', text: 'moved “Accessibility audit: Dynamic Type” to In review', projectId: 'tide', at: ago(26) },
    { id: 'a-1', who: 'nia', text: 'commented on “Glass material tokens”', projectId: 'facet', at: ago(56) },
    { id: 'a-2', who: 'ines', text: 'uploaded the launch film rough cut', projectId: 'orbit', at: ago(125) },
    { id: 'a-3', who: 'omar', text: 'finished a 50-minute focus session', projectId: 'tide', at: ago(140) },
    { id: 'a-4', who: 'elise', text: 'completed “Profile screen empty states”', projectId: 'tide', at: ago(190) },
    { id: 'a-5', who: 'vikram', text: 'shared the activation funnel dashboard', projectId: 'sprout', at: ago(300) },
  ]

  return { seededOn: dayKey(today), projects, tasks, events, focusLog, notices, activity, invites: [], sent: [] }
}
