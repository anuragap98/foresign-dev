/**
 * Seeds the local Supabase with the demo workspace.
 *
 *   npm run db:seed      (or `npm run db:reset` to rebuild the schema first)
 *
 * Reads the local URL and keys from `supabase status`, replaces any
 * previous demo workspace, creates the demo sign-in, and writes the public
 * settings the app needs into .env.local.
 */
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { addDays, dayKey, MIN } from '@/lib/time'
import { AGENT_TASKS, AGENTS, ARTIFACTS, GATES, LEDGER, RUNS } from './demo/agents'
import { buildSeed, ME, PEOPLE } from './demo/workspace'

// Local-only demo sign-in. Never use these anywhere but a local stack.
const DEMO_EMAIL = 'lin@pane.app'
const DEMO_PASSWORD = 'pane-local-demo'
const WORKSPACE_NAME = 'Pane demo'

function localEnv() {
  const out = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  const env = Object.fromEntries(
    out
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  )
  if (!env.API_URL || !env.SERVICE_ROLE_KEY || !env.ANON_KEY) throw new Error('Is the local stack running? Try `npx supabase start`.')
  return { url: env.API_URL as string, anon: env.ANON_KEY as string, service: env.SERVICE_ROLE_KEY as string }
}

/** Writes the browser's settings, keeping any other lines already in .env.local. */
function writeEnvLocal(url: string, anon: string) {
  const path = '.env.local'
  const keep = existsSync(path)
    ? readFileSync(path, 'utf8').split('\n').filter((l) => l && !/^VITE_(SUPABASE_URL|SUPABASE_ANON_KEY|DEMO_EMAIL|DEMO_PASSWORD)=/.test(l))
    : []
  writeFileSync(
    path,
    [...keep, `VITE_SUPABASE_URL=${url}`, `VITE_SUPABASE_ANON_KEY=${anon}`, `VITE_DEMO_EMAIL=${DEMO_EMAIL}`, `VITE_DEMO_PASSWORD=${DEMO_PASSWORD}`, ''].join('\n'),
  )
}

async function main() {
  const { url, anon, service } = localEnv()
  const db = createClient(url, service, { auth: { persistSession: false } })
  const must = <D>(label: string, r: { data: D; error: unknown }): D => {
    if (r.error) throw new Error(`${label}: ${JSON.stringify(r.error)}`)
    return r.data
  }
  // Batches must list the same columns in every row: PostgREST sends null, not the default, for a missing key.
  const insert = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 500) must(table, await db.from(table).insert(rows.slice(i, i + 500)))
  }

  // Replace the previous demo workspace and sign-in.
  must('clear workspaces', await db.from('workspaces').delete().eq('name', WORKSPACE_NAME))
  const { data: listed, error: listError } = await db.auth.admin.listUsers()
  if (listError) throw new Error(`list users: ${listError.message}`)
  const old = listed.users.find((u) => u.email === DEMO_EMAIL)
  if (old) {
    const { error } = await db.auth.admin.deleteUser(old.id)
    if (error) throw new Error(`delete user: ${error.message}`)
  }
  const { data: created, error: createError } = await db.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true })
  if (createError || !created.user) throw new Error(`create user: ${createError?.message ?? 'no user returned'}`)
  const user = created.user

  const now = new Date()
  const ws = buildSeed(now)
  const ids = new Map<string, string>()
  const id = (key: string) => {
    if (!ids.has(key)) ids.set(key, randomUUID())
    return ids.get(key)!
  }
  const workspace_id = id('workspace')
  const ago = (min: number) => new Date(now.getTime() - min * MIN).toISOString()
  const day = (n: number) => dayKey(addDays(now, n))

  must('workspace', await db.from('workspaces').insert({ id: workspace_id, name: WORKSPACE_NAME }))

  // People and agents
  await insert('actors', [
    ...PEOPLE.map((p) => ({
      id: id(`actor:${p.id}`), workspace_id, kind: 'person', user_id: p.id === ME ? user.id : null,
      name: p.name, email: p.email, role: p.role, team: p.team, hue: p.hue, presence: p.presence,
      presence_note: p.presenceNote ?? null, city: p.city, tz: p.tz, capacity_h: p.capacityH, focus_week_h: p.focusWeekH,
    })),
    ...AGENTS.map((a) => ({
      id: id(`actor:${a.key}`), workspace_id, kind: 'agent', name: a.name, role: a.role, hue: a.hue,
      runtime: a.runtime, model: a.model, agent_status: a.status, presence: a.status === 'running' ? 'focus' : 'online',
      tz: 'UTC', capacity_h: 0, focus_week_h: 0,
    })),
  ])
  const actor = (key: string) => id(`actor:${key}`)
  must('membership', await db.from('memberships').insert({ workspace_id, user_id: user.id, actor_id: actor(ME), role: 'owner' }))

  // Projects, members, pins, milestones
  await insert('projects', [
    ...ws.projects.map((p) => ({
      id: id(`project:${p.id}`), workspace_id, name: p.name, summary: p.summary, lead_id: actor(p.lead),
      hue: p.hue, icon: p.icon, status: p.status, started: p.started, due: p.due, gates: { plan: false, merge: false, deploy: false },
      goal: '', repo_url: null, budget_tokens: null, budget_usd: null,
    })),
    {
      id: id(`project:${LEDGER.key}`), workspace_id, name: LEDGER.name, summary: LEDGER.summary, goal: LEDGER.goal,
      repo_url: LEDGER.repoUrl, lead_id: actor(ME), hue: LEDGER.hue, icon: LEDGER.icon, status: 'progress',
      started: day(-LEDGER.startedDaysAgo), due: day(LEDGER.dueIn), gates: { plan: true, merge: true, deploy: true },
      budget_tokens: LEDGER.budgetTokens, budget_usd: LEDGER.budgetUsd,
    },
  ])
  const project = (key: string) => id(`project:${key}`)
  await insert('project_members', [
    ...ws.projects.flatMap((p) => p.members.map((m) => ({ workspace_id, project_id: project(p.id), actor_id: actor(m) }))),
    ...[ME, ...AGENTS.map((a) => a.key)].map((m) => ({ workspace_id, project_id: project(LEDGER.key), actor_id: actor(m) })),
  ])
  await insert('project_pins', [
    ...ws.projects.filter((p) => p.pinned).map((p) => ({ workspace_id, project_id: project(p.id), user_id: user.id })),
    { workspace_id, project_id: project(LEDGER.key), user_id: user.id },
  ])
  await insert(
    'milestones',
    ws.projects.flatMap((p) => p.milestones.map((m) => ({ id: id(`milestone:${m.id}`), workspace_id, project_id: project(p.id), title: m.title, date: m.date, done: m.done }))),
  )

  // Tasks: positions follow the board, where a column mixes every project, so number them per status.
  const position: Record<string, number> = {}
  const nextPosition = (col: string) => (position[col] = (position[col] ?? 0) + 1024)
  await insert('tasks', [
    ...ws.tasks.map((t) => ({
      id: id(`task:${t.id}`), workspace_id, project_id: project(t.projectId), title: t.title, assignee_id: actor(t.assignee),
      created_by: actor(t.assignee), source: 'human', priority: t.priority, status: t.status, due: t.due, est_h: t.estH,
      position: nextPosition(t.status), created_at: t.createdAt, done_at: t.doneAt ?? null,
      description: '', acceptance_criteria: '', attempts: t.status === 'todo' ? 0 : 1, external_ref: null,
    })),
    ...AGENT_TASKS.map((t) => ({
      id: id(`task:${t.key}`), workspace_id, project_id: project(LEDGER.key), title: t.title, description: t.description,
      acceptance_criteria: t.acceptance, assignee_id: actor(t.agent), created_by: actor('planner'), source: 'agent',
      priority: t.priority, status: t.status, due: day(t.dueIn), est_h: t.estH, attempts: t.attempts ?? 1,
      position: nextPosition(t.status), external_ref: `plan-1:${t.key}`,
      created_at: ago(t.createdHoursAgo * 60), done_at: t.doneHoursAgo ? ago(t.doneHoursAgo * 60) : null,
    })),
  ])
  const task = (key: string) => id(`task:${key}`)
  await insert(
    'task_dependencies',
    AGENT_TASKS.flatMap((t) => t.dependsOn.map((d) => ({ workspace_id, task_id: task(t.key), depends_on_id: task(d) }))),
  )
  await insert(
    'subtasks',
    ws.tasks.flatMap((t) => t.subtasks.map((s, i) => ({ id: id(`subtask:${s.id}`), workspace_id, task_id: task(t.id), title: s.title, done: s.done, position: i }))),
  )
  await insert(
    'comments',
    ws.tasks.flatMap((t) => t.comments.map((c) => ({ id: id(`comment:${c.id}`), workspace_id, task_id: task(t.id), author_id: actor(c.by), body: c.text, created_at: c.at }))),
  )

  // Calendar and focus
  await insert('events', ws.events.map((e) => ({
    id: id(`event:${e.id}`), workspace_id, project_id: e.projectId ? project(e.projectId) : null, title: e.title,
    starts_at: e.start, len_min: e.lenMin, kind: e.kind, place: e.place ?? null,
  })))
  await insert('event_attendees', ws.events.flatMap((e) => e.people.map((p) => ({ workspace_id, event_id: id(`event:${e.id}`), actor_id: actor(p) }))))
  await insert('focus_sessions', ws.focusLog.map((f) => ({
    workspace_id, actor_id: actor(ME), task_id: f.taskId ? task(f.taskId) : null, started_at: f.start, minutes: f.minutes,
  })))

  // Agent runs, trace steps, artifacts and gates
  await insert('runs', RUNS.map((r) => ({
    id: id(`run:${r.key}`), workspace_id, project_id: project(LEDGER.key), agent_id: actor(r.agent),
    parent_run_id: r.parent ? id(`run:${r.parent}`) : null, task_id: r.task ? task(r.task) : null, status: r.status,
    started_at: ago(r.startedMinAgo), ended_at: r.endedMinAgo !== undefined ? ago(r.endedMinAgo) : null,
    tokens_in: r.tokensIn, tokens_out: r.tokensOut, cost_usd: r.costUsd, model: r.model, summary: r.summary,
    external_session_id: `demo-${r.key}`,
  })))
  await insert('run_events', RUNS.flatMap((r) => r.events.map(([offset, type, name, durationMs, detail]) => ({
    workspace_id, run_id: id(`run:${r.key}`), ts: ago(r.startedMinAgo - offset), type, name, duration_ms: durationMs, payload: { detail },
  }))))
  await insert('artifacts', ARTIFACTS.map((a) => ({
    workspace_id, project_id: project(LEDGER.key), run_id: id(`run:${a.run}`), task_id: a.task ? task(a.task) : null,
    kind: a.kind, title: a.title, url: a.url ?? null, status: a.status ?? null,
  })))
  await insert('gates', GATES.map((g) => ({
    workspace_id, project_id: project(LEDGER.key), kind: g.kind, title: g.title, summary: g.summary, status: g.status,
    requested_by_run: id(`run:${g.run}`), task_id: 'task' in g && g.task ? task(g.task) : null, requested_at: ago(g.requestedMinAgo),
    decided_by: g.status === 'approved' ? actor(ME) : null, decided_at: 'decidedMinAgo' in g && g.decidedMinAgo !== undefined ? ago(g.decidedMinAgo) : null,
  })))

  // Feeds
  await insert('notifications', [
    ...ws.notices.map((n) => ({
      workspace_id, recipient_id: actor(ME), from_actor_id: n.from === 'pane' ? null : actor(n.from), kind: n.kind ?? 'update',
      text: n.text, read: n.read, created_at: n.at,
    })),
    { workspace_id, recipient_id: actor(ME), from_actor_id: actor('reviewer'), kind: 'gate', text: 'Reviewer is waiting for you to approve merging “Ledger core API” (#12)', read: false, created_at: ago(55) },
  ])
  await insert('activity', [
    ...ws.activity.map((a) => ({ workspace_id, project_id: project(a.projectId), actor_id: actor(a.who), text: a.text, created_at: a.at })),
    { workspace_id, project_id: project(LEDGER.key), actor_id: actor('reviewer'), text: 'asked to merge “Ledger core API” (#12)', created_at: ago(55) },
    { workspace_id, project_id: project(LEDGER.key), actor_id: actor('tester'), text: 'started integration tests for journal entries', created_at: ago(95) },
  ])

  writeEnvLocal(url, anon)
  console.log(`Seeded "${WORKSPACE_NAME}": ${PEOPLE.length} people, ${AGENTS.length} agents, ${ws.projects.length + 1} projects, ${ws.tasks.length + AGENT_TASKS.length} tasks, ${RUNS.length} agent runs.`)
  console.log('Wrote .env.local. Demo sign-in details are in scripts/seed.ts.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
