// The tools agents call over MCP. Every tool works inside the token's project.
import { z } from 'zod'
import {
  addActivity,
  AgentError,
  clip,
  createRun,
  currentRun,
  db,
  endRun,
  ensureAgent,
  getRun,
  logEvent,
  must,
  notifyPeople,
  type Ctx,
} from './core.ts'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Tool {
  name: string
  title: string
  description: string
  input: z.ZodObject
  /** Changes data, so it takes an idempotency_key and isn't safe to retry blindly. */
  write: boolean
  run: (ctx: Ctx, args: any) => Promise<unknown> // eslint-disable-line @typescript-eslint/no-explicit-any
}

const tool = <S extends z.ZodObject>(t: Omit<Tool, 'input' | 'run'> & { input: S; run: (ctx: Ctx, args: z.infer<S>) => Promise<unknown> }) =>
  t as unknown as Tool

// ------------------------------------------------------------- helpers

const GAP = 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AGENT_STATUSES = ['doing', 'review', 'done', 'blocked', 'failed'] as const
const STATUS_LABEL: Record<string, string> = {
  todo: 'To do', doing: 'In progress', review: 'In review', done: 'Done',
  blocked: 'Blocked', failed: 'Failed', awaiting_approval: 'Awaiting approval',
}

const taskId = z.string().min(1).describe('The task’s Foresign id, or the ref you gave it in propose_plan or create_task')
const runId = z.uuid().optional().describe('Your run id from start_run. Leave out to use your current run.')
const priority = z.enum(['low', 'medium', 'high', 'urgent'])

async function loadProject(ctx: Ctx): Promise<Row> {
  return must(await db.from('projects').select('*').eq('id', ctx.projectId).single(), 'Loading the project') as Row
}

async function resolveTask(ctx: Ctx, ref: string): Promise<Row> {
  const q = db.from('tasks').select('*').eq('project_id', ctx.projectId)
  const t = must(await (UUID.test(ref) ? q.eq('id', ref) : q.eq('external_ref', ref)).maybeSingle(), 'Loading the task')
  if (!t) throw new AgentError(`No task "${ref}" in this project. get_project lists them.`, 404)
  return t
}

/** Board order: the end of a status column (columns mix projects, so the whole workspace). */
async function endOfColumn(ctx: Ctx, status: string): Promise<number> {
  const top = must(
    await db.from('tasks').select('position').eq('workspace_id', ctx.workspaceId).eq('status', status)
      .order('position', { ascending: false }).limit(1).maybeSingle(),
    'Ordering the board',
  )
  return (top ? Number(top.position) : 0) + GAP
}

async function spend(ctx: Ctx) {
  const runs = must(await db.from('runs').select('cost_usd, tokens_in, tokens_out').eq('project_id', ctx.projectId), 'Adding up spend') as Row[]
  return runs.reduce(
    (s, r) => ({ usd: s.usd + Number(r.cost_usd), tokens: s.tokens + Number(r.tokens_in) + Number(r.tokens_out) }),
    { usd: 0, tokens: 0 },
  )
}

/** Stops new work once the project's budget is used up. */
async function checkBudget(ctx: Ctx, project?: Row) {
  const p = project ?? (await loadProject(ctx))
  if (p.budget_usd === null && p.budget_tokens === null) return
  const s = await spend(ctx)
  if (p.budget_usd !== null && s.usd >= Number(p.budget_usd))
    throw new AgentError(`Budget reached: $${s.usd.toFixed(2)} of $${Number(p.budget_usd).toFixed(2)} spent. Ask a person to raise it in Foresign.`, 409)
  if (p.budget_tokens !== null && s.tokens >= Number(p.budget_tokens))
    throw new AgentError(`Token budget reached: ${s.tokens.toLocaleString()} of ${Number(p.budget_tokens).toLocaleString()} used. Ask a person to raise it in Foresign.`, 409)
}

async function actorName(id?: string | null) {
  if (!id) return null
  const a = must(await db.from('actors').select('name').eq('id', id).maybeSingle(), 'Loading a name')
  return a?.name ?? null
}

function taskView(t: Row, deps: string[] = []) {
  return {
    id: t.id, ref: t.external_ref, title: t.title, status: t.status, priority: t.priority, due: t.due,
    assignee_id: t.assignee_id, parent_task_id: t.parent_task_id, depends_on: deps, attempts: t.attempts,
    waiting_on_gate: t.gate_id,
  }
}

async function depsOf(taskIds: string[]) {
  if (!taskIds.length) return new Map<string, string[]>()
  const rows = must(await db.from('task_dependencies').select('task_id, depends_on_id').in('task_id', taskIds), 'Loading dependencies') as Row[]
  const m = new Map<string, string[]>()
  for (const r of rows) m.set(r.task_id, [...(m.get(r.task_id) ?? []), r.depends_on_id])
  return m
}

/** Moves a task to a status, keeping board order and done dates right. */
async function setStatus(ctx: Ctx, t: Row, status: string, extra: Row = {}) {
  const patch: Row = { status, ...extra }
  if (status !== t.status) patch.position = await endOfColumn(ctx, status)
  if (status === 'done' && t.status !== 'done') patch.done_at = new Date().toISOString()
  if (status !== 'done') patch.done_at = null
  return must(await db.from('tasks').update(patch).eq('id', t.id).select().single(), 'Updating the task')
}

function findCycle(edges: Map<string, string[]>): string[] | null {
  const state = new Map<string, 1 | 2>()
  const path: string[] = []
  const visit = (n: string): string[] | null => {
    if (state.get(n) === 2) return null
    if (state.get(n) === 1) return [...path.slice(path.indexOf(n)), n]
    state.set(n, 1)
    path.push(n)
    for (const d of edges.get(n) ?? []) {
      const c = visit(d)
      if (c) return c
    }
    path.pop()
    state.set(n, 2)
    return null
  }
  for (const n of edges.keys()) {
    const c = visit(n)
    if (c) return c
  }
  return null
}

// --------------------------------------------------------------- tools

const planTask = z.strictObject({
  ref: z.string().min(1).max(80).describe('Your short, stable key for the task, e.g. "auth-api". Re-proposing with the same ref updates it.'),
  title: z.string().min(1).max(200),
  description: z.string().max(8000).optional(),
  acceptance_criteria: z.string().max(4000).optional().describe('How a reviewer can tell it is done'),
  priority: priority.optional(),
  est_h: z.number().positive().max(200).optional().describe('Estimate in hours'),
  due: z.iso.date().optional().describe('YYYY-MM-DD. Defaults to the project’s due date.'),
  depends_on: z.array(z.string()).max(50).optional().describe('Refs (or Foresign ids) of tasks that must be done first'),
  parent: z.string().optional().describe('Ref of the task this one is split from'),
})

export const TOOLS: Tool[] = [
  tool({
    name: 'get_project',
    title: 'Read the project',
    description:
      'Start here. Returns the project’s goal, repo, which approval gates are on, budget and spend, every task with its status and dependencies, and gates waiting on a person.',
    input: z.strictObject({}),
    write: false,
    async run(ctx) {
      const [p, s, tasks, gates, me] = await Promise.all([
        loadProject(ctx),
        spend(ctx),
        db.from('tasks').select('*').eq('project_id', ctx.projectId).order('created_at'),
        db.from('gates').select('id, kind, title, status, task_id, requested_at').eq('project_id', ctx.projectId).eq('status', 'pending'),
        actorName(ctx.agentId),
      ])
      const list = must(tasks, 'Loading tasks') as Row[]
      const deps = await depsOf(list.map((t) => t.id))
      return {
        project: {
          id: p.id, name: p.name, summary: p.summary, goal: p.goal, repo_url: p.repo_url, due: p.due, status: p.status,
          gates: p.gates,
          budget: { usd: p.budget_usd === null ? null : Number(p.budget_usd), tokens: p.budget_tokens === null ? null : Number(p.budget_tokens) },
          spent: { usd: Number(s.usd.toFixed(4)), tokens: s.tokens },
        },
        you: { agent_id: ctx.agentId, name: me },
        tasks: list.map((t) => taskView(t, deps.get(t.id))),
        pending_gates: must(gates, 'Loading gates'),
      }
    },
  }),

  tool({
    name: 'get_task',
    title: 'Read a task',
    description: 'Full detail for one task: description, acceptance criteria, dependencies, comments, artifacts and gates.',
    input: z.strictObject({ task_id: taskId }),
    write: false,
    async run(ctx, a) {
      const t = await resolveTask(ctx, a.task_id)
      const [deps, comments, artifacts, gates] = await Promise.all([
        depsOf([t.id]),
        db.from('comments').select('body, created_at, author_id').eq('task_id', t.id).order('created_at'),
        db.from('artifacts').select('kind, title, url, status').eq('task_id', t.id),
        db.from('gates').select('id, kind, title, status, note').eq('task_id', t.id),
      ])
      return {
        ...taskView(t, deps.get(t.id)),
        description: t.description,
        acceptance_criteria: t.acceptance_criteria,
        comments: must(comments, 'Loading comments'),
        artifacts: must(artifacts, 'Loading artifacts'),
        gates: must(gates, 'Loading gates'),
      }
    },
  }),

  tool({
    name: 'propose_plan',
    title: 'Propose a task plan',
    description:
      'Submit the whole plan as tasks with dependencies. If the project’s plan gate is on, the tasks wait as "Awaiting approval" until a person approves: call wait_for_gate next. ' +
      'To revise after changes are requested, call again with the same refs; unstarted tasks you leave out are removed.',
    input: z.strictObject({
      summary: z.string().min(1).max(8000).describe('What the plan does and why, for the person approving it'),
      tasks: z.array(planTask).min(1).max(100),
      run_id: runId,
    }),
    write: true,
    async run(ctx, a) {
      const project = await loadProject(ctx)
      const gated = !!project.gates?.plan
      const refs = a.tasks.map((t) => t.ref)
      const dup = refs.find((r, i) => refs.indexOf(r) !== i)
      if (dup) throw new AgentError(`Ref "${dup}" is used twice.`)

      const existing = must(await db.from('tasks').select('*').eq('project_id', ctx.projectId), 'Loading tasks') as Row[]
      const byRef = new Map(existing.filter((t) => t.external_ref).map((t) => [t.external_ref as string, t]))
      const byId = new Map(existing.map((t) => [t.id as string, t]))
      const known = (r: string) => refs.includes(r) || byRef.has(r) || byId.has(r)
      for (const t of a.tasks) {
        for (const d of t.depends_on ?? []) {
          if (!known(d)) throw new AgentError(`Task "${t.ref}" depends on "${d}", which isn’t in the plan or the project.`)
          if (d === t.ref) throw new AgentError(`Task "${t.ref}" can’t depend on itself.`)
        }
        if (t.parent && !known(t.parent)) throw new AgentError(`Task "${t.ref}" has parent "${t.parent}", which isn’t in the plan or the project.`)
      }
      const cycle = findCycle(new Map(a.tasks.map((t) => [t.ref, t.depends_on ?? []])))
      if (cycle) throw new AgentError(`Dependencies go in a circle: ${cycle.join(' → ')}.`)

      const run = await currentRun(ctx, a.run_id)
      const status = gated ? 'awaiting_approval' : 'todo'

      let gate: Row | null = null
      if (gated) {
        const title = `Plan: ${a.tasks.length} task${a.tasks.length === 1 ? '' : 's'}`
        const pending = must(
          await db.from('gates').select('*').eq('project_id', ctx.projectId).eq('kind', 'plan').eq('status', 'pending')
            .order('requested_at', { ascending: false }).limit(1).maybeSingle(),
          'Finding the plan gate',
        )
        gate = pending
          ? must(await db.from('gates').update({ title, summary: a.summary, requested_by_run: run.id }).eq('id', pending.id).select().single(), 'Updating the plan gate')
          : must(
            await db.from('gates').insert({
              workspace_id: ctx.workspaceId, project_id: ctx.projectId, kind: 'plan', title, summary: a.summary, requested_by_run: run.id,
            }).select().single(),
            'Opening the plan gate',
          )
      }

      // Update tasks the agent proposed before (only while unstarted), add the new ones.
      let pos = await endOfColumn(ctx, status)
      const fresh: Row[] = []
      for (const t of a.tasks) {
        const fields: Row = {
          title: t.title,
          description: t.description ?? '',
          acceptance_criteria: t.acceptance_criteria ?? '',
          priority: t.priority ?? 'medium',
          est_h: t.est_h ?? 2,
          due: t.due ?? project.due,
        }
        const old = byRef.get(t.ref)
        if (old) {
          if (['todo', 'awaiting_approval'].includes(old.status)) {
            const patch: Row = { ...fields, gate_id: gate?.id ?? null }
            if (old.status !== status) Object.assign(patch, { status, position: pos += GAP })
            must(await db.from('tasks').update(patch).eq('id', old.id), 'Updating a task')
          }
        } else {
          fresh.push({
            ...fields, workspace_id: ctx.workspaceId, project_id: ctx.projectId, external_ref: t.ref, status, position: pos += GAP,
            source: 'agent', created_by: run.agent_id, gate_id: gate?.id ?? null,
          })
        }
      }
      const inserted = fresh.length ? (must(await db.from('tasks').insert(fresh).select('id, external_ref'), 'Adding tasks') as Row[]) : []
      const ids = new Map<string, string>([...byRef].map(([r, t]) => [r, t.id]))
      for (const t of inserted) ids.set(t.external_ref, t.id)
      const idOf = (r: string) => ids.get(r) ?? r

      const planIds = refs.map(idOf)
      for (const t of a.tasks) if (t.parent) await db.from('tasks').update({ parent_task_id: idOf(t.parent) }).eq('id', idOf(t.ref))
      must(await db.from('task_dependencies').delete().in('task_id', planIds), 'Clearing dependencies')
      const edges = a.tasks.flatMap((t) => (t.depends_on ?? []).map((d) => ({ workspace_id: ctx.workspaceId, task_id: idOf(t.ref), depends_on_id: idOf(d) })))
      if (edges.length) must(await db.from('task_dependencies').insert(edges), 'Saving dependencies')

      // A revision replaces the earlier draft: drop draft tasks it no longer has.
      let removed = 0
      if (gated) {
        const stale = existing.filter((t) => t.source === 'agent' && t.status === 'awaiting_approval' && t.gate_id && t.external_ref && !refs.includes(t.external_ref))
        if (stale.length) {
          must(await db.from('tasks').delete().in('id', stale.map((t) => t.id)), 'Removing dropped tasks')
          removed = stale.length
        }
        await db.from('runs').update({ status: 'waiting' }).eq('id', run.id).eq('status', 'running')
      }

      const who = (await actorName(run.agent_id)) ?? 'An agent'
      await addActivity(ctx, run.agent_id, `proposed a plan of ${a.tasks.length} tasks`)
      if (gated) await notifyPeople(ctx, run.agent_id, 'gate', `${who} proposed a plan of ${a.tasks.length} tasks for ${project.name}. It needs your approval.`)

      return {
        gate: gate && { id: gate.id, status: 'pending' },
        tasks: refs.map((r) => ({ ref: r, id: idOf(r) })),
        removed,
        next: gated
          ? `The plan is waiting for a person to approve it. Call wait_for_gate with gate_id "${gate!.id}" and don’t start work until it’s approved.`
          : 'The tasks are open. claim_task one whose dependencies are done and start.',
      }
    },
  }),

  tool({
    name: 'create_task',
    title: 'Add a task',
    description: 'Add one task you discovered while working (it is open right away, no plan approval). Give a ref so retries don’t duplicate it.',
    input: z.strictObject({
      ref: z.string().min(1).max(80).optional(),
      title: z.string().min(1).max(200),
      description: z.string().max(8000).optional(),
      acceptance_criteria: z.string().max(4000).optional(),
      priority: priority.optional(),
      est_h: z.number().positive().max(200).optional(),
      due: z.iso.date().optional(),
      depends_on: z.array(taskId).max(50).optional(),
      parent_task_id: taskId.optional(),
      run_id: runId,
    }),
    write: true,
    async run(ctx, a) {
      if (a.ref) {
        const { data: same } = await db.from('tasks').select('*').eq('project_id', ctx.projectId).eq('external_ref', a.ref).maybeSingle()
        if (same) return { task: taskView(same), created: false }
      }
      const [project, run] = await Promise.all([loadProject(ctx), currentRun(ctx, a.run_id)])
      const deps = await Promise.all((a.depends_on ?? []).map((d) => resolveTask(ctx, d)))
      const parent = a.parent_task_id ? await resolveTask(ctx, a.parent_task_id) : null
      const t = must(
        await db.from('tasks').insert({
          workspace_id: ctx.workspaceId, project_id: ctx.projectId, external_ref: a.ref ?? null,
          title: a.title, description: a.description ?? '', acceptance_criteria: a.acceptance_criteria ?? '',
          priority: a.priority ?? 'medium', est_h: a.est_h ?? 2, due: a.due ?? project.due,
          status: 'todo', position: await endOfColumn(ctx, 'todo'), source: 'agent', created_by: run.agent_id,
          parent_task_id: parent?.id ?? null,
        }).select().single(),
        'Adding the task',
      )
      if (deps.length) {
        must(await db.from('task_dependencies').insert(deps.map((d) => ({ workspace_id: ctx.workspaceId, task_id: t.id, depends_on_id: d.id }))), 'Saving dependencies')
      }
      await addActivity(ctx, run.agent_id, `added “${t.title}”`)
      return { task: taskView(t, deps.map((d) => d.id)), created: true }
    },
  }),

  tool({
    name: 'claim_task',
    title: 'Claim a task',
    description: 'Assign a task to yourself and move it to In progress. Refused while it awaits approval, while its dependencies aren’t done, or once the budget is used up.',
    input: z.strictObject({ task_id: taskId, run_id: runId }),
    write: true,
    async run(ctx, a) {
      const t = await resolveTask(ctx, a.task_id)
      if (t.status === 'awaiting_approval') throw new AgentError(`“${t.title}” is waiting for approval${t.gate_id ? ` (gate ${t.gate_id})` : ''}. Call wait_for_gate first.`, 409)
      if (t.status === 'done') throw new AgentError(`“${t.title}” is already done.`, 409)
      const run = await currentRun(ctx, a.run_id)
      if (t.status === 'doing' && t.assignee_id && t.assignee_id !== run.agent_id) {
        throw new AgentError(`“${t.title}” is already being worked on by ${(await actorName(t.assignee_id)) ?? 'someone else'}.`, 409)
      }
      const deps = (await depsOf([t.id])).get(t.id) ?? []
      if (deps.length) {
        const open = must(await db.from('tasks').select('title, status').in('id', deps).neq('status', 'done'), 'Checking dependencies') as Row[]
        if (open.length) throw new AgentError(`Finish these first: ${open.map((d) => `“${d.title}” (${STATUS_LABEL[d.status]})`).join(', ')}.`, 409)
      }
      await checkBudget(ctx)

      const again = t.status === 'doing' && t.assignee_id === run.agent_id
      const updated = await setStatus(ctx, t, 'doing', { assignee_id: run.agent_id, attempts: again ? t.attempts : t.attempts + 1 })
      if (!run.task_id) await db.from('runs').update({ task_id: t.id }).eq('id', run.id)
      if (!again) await addActivity(ctx, run.agent_id, `started “${t.title}”`)
      return {
        task: { ...taskView(updated, deps), description: t.description, acceptance_criteria: t.acceptance_criteria },
        run_id: run.id,
        next: 'Do the work, attach_artifact for branches, commits and PRs, then update_task to review or done.',
      }
    },
  }),

  tool({
    name: 'update_task',
    title: 'Update a task',
    description:
      'Change a task’s status and/or leave a progress note (shown as a comment). Use blocked with a note saying what you need, failed when you gave up. ' +
      'With the merge gate on, a task with a pull request can only be done after its merge gate is approved.',
    input: z.strictObject({
      task_id: taskId,
      status: z.enum(AGENT_STATUSES).optional(),
      note: z.string().min(1).max(8000).optional(),
      run_id: runId,
    }),
    write: true,
    async run(ctx, a) {
      if (!a.status && !a.note) throw new AgentError('Send a status, a note, or both.')
      const t = await resolveTask(ctx, a.task_id)
      if (t.status === 'awaiting_approval' && a.status) throw new AgentError(`“${t.title}” is waiting for approval. Call wait_for_gate first.`, 409)
      const run = await currentRun(ctx, a.run_id)
      const project = await loadProject(ctx)

      if (a.status === 'done' && project.gates?.merge) {
        const [{ count: prs }, { count: approved }] = await Promise.all([
          db.from('artifacts').select('id', { count: 'exact', head: true }).eq('task_id', t.id).eq('kind', 'pull_request'),
          db.from('gates').select('id', { count: 'exact', head: true }).eq('task_id', t.id).eq('kind', 'merge').eq('status', 'approved'),
        ])
        if ((prs ?? 0) > 0 && !(approved ?? 0)) {
          throw new AgentError('This task has a pull request and the merge gate is on. request_gate with kind "merge", wait_for_gate, then merge and mark it done.', 409)
        }
      }

      let updated = t
      if (a.status && a.status !== t.status) {
        updated = await setStatus(ctx, t, a.status)
        const reason = a.note && ['blocked', 'failed'].includes(a.status) ? `: ${clip(a.note, 140)}` : ''
        await addActivity(ctx, run.agent_id, `moved “${t.title}” to ${STATUS_LABEL[a.status]}${reason}`)
        if (a.status === 'failed' || a.status === 'blocked') {
          const who = (await actorName(run.agent_id)) ?? 'An agent'
          await notifyPeople(ctx, run.agent_id, 'failure', `${who} marked “${t.title}” ${STATUS_LABEL[a.status].toLowerCase()}${reason}`)
        }
      }
      if (a.note) {
        must(await db.from('comments').insert({ workspace_id: ctx.workspaceId, task_id: t.id, author_id: run.agent_id, body: a.note }), 'Adding the note')
      }
      return { task: taskView(updated) }
    },
  }),

  tool({
    name: 'start_run',
    title: 'Start a run',
    description:
      'Opens a run, the unit Foresign uses to trace and cost agent work. With no arguments it returns your current run (hooks may have opened it already). ' +
      'For a sub-agent, pass agent_name (e.g. "Test writer") and the parent run id; the sub-agent then passes the returned run_id to its own calls and calls end_run when finished.',
    input: z.strictObject({
      agent_name: z.string().min(1).max(60).optional().describe('The sub-agent’s name; it shows in Foresign’s team list'),
      role: z.string().max(120).optional().describe('e.g. "Sub-agent · writes tests"'),
      parent_run_id: z.uuid().optional(),
      task_id: taskId.optional(),
      model: z.string().max(80).optional(),
      summary: z.string().max(2000).optional().describe('What this run is for'),
    }),
    write: true,
    async run(ctx, a) {
      const task = a.task_id ? await resolveTask(ctx, a.task_id) : null
      const fields: Row = {}
      if (task) fields.task_id = task.id
      if (a.model) fields.model = a.model
      if (a.summary) fields.summary = a.summary

      if (!a.agent_name && !a.parent_run_id) {
        const run = await currentRun(ctx)
        if (Object.keys(fields).length) await db.from('runs').update(fields).eq('id', run.id)
        return { run_id: run.id, started: false }
      }
      await checkBudget(ctx)
      const parent = a.parent_run_id ? await getRun(ctx, a.parent_run_id) : await currentRun(ctx)
      const agentId = a.agent_name ? await ensureAgent(ctx, a.agent_name, a.role ?? 'Sub-agent') : ctx.agentId
      const run = await createRun(ctx, { agent_id: agentId, parent_run_id: parent.id, model: a.model ?? parent.model, ...fields })
      return { run_id: run.id, agent_id: agentId, parent_run_id: parent.id, started: true }
    },
  }),

  tool({
    name: 'end_run',
    title: 'End a run',
    description: 'Close a run with how it went and a short summary. Optionally add final token and cost numbers (ignored if telemetry already reports them).',
    input: z.strictObject({
      run_id: runId,
      status: z.enum(['succeeded', 'failed', 'cancelled']),
      summary: z.string().max(2000).optional(),
      tokens_in: z.number().int().nonnegative().optional(),
      tokens_out: z.number().int().nonnegative().optional(),
      cost_usd: z.number().nonnegative().optional(),
    }),
    write: true,
    async run(ctx, a) {
      const run = await currentRun(ctx, a.run_id)
      if (!['running', 'waiting'].includes(run.status)) return { run_id: run.id, status: run.status, already_ended: true }
      if (!run.usage_from_telemetry && (a.tokens_in || a.tokens_out || a.cost_usd)) {
        must(await db.rpc('add_run_usage', { p_run: run.id, p_in: a.tokens_in ?? 0, p_out: a.tokens_out ?? 0, p_cost: a.cost_usd ?? 0 }), 'Adding usage')
      }
      await endRun(run, a.status, a.summary)
      if (a.status === 'failed') {
        const who = (await actorName(run.agent_id)) ?? 'An agent'
        await notifyPeople(ctx, run.agent_id, 'failure', `${who}’s run failed${a.summary ? `: ${clip(a.summary, 160)}` : '.'}`)
      }
      return { run_id: run.id, status: a.status }
    },
  }),

  tool({
    name: 'log_step',
    title: 'Log a step',
    description: 'Record a notable step in your run’s trace (a decision, a test result, an error). Tool calls are traced automatically when hooks are set up, so don’t log those.',
    input: z.strictObject({
      run_id: runId,
      type: z.enum(['tool_call', 'command', 'file_edit', 'message', 'error', 'note']),
      name: z.string().min(1).max(200),
      detail: z.string().max(4000).optional(),
      duration_ms: z.number().int().nonnegative().optional(),
      tokens: z.number().int().nonnegative().optional(),
    }),
    write: true,
    async run(ctx, a) {
      const run = await currentRun(ctx, a.run_id)
      await logEvent(ctx, run.id, { type: a.type, name: a.name, detail: a.detail, durationMs: a.duration_ms, tokens: a.tokens })
      return { run_id: run.id, logged: true }
    },
  }),

  tool({
    name: 'attach_artifact',
    title: 'Attach an artifact',
    description: 'Link something you produced (branch, commit, pull request, test report, deploy, doc) to a task. Attaching a pull request moves an in-progress task to In review.',
    input: z.strictObject({
      kind: z.enum(['branch', 'commit', 'pull_request', 'test_report', 'deploy', 'doc']),
      title: z.string().min(1).max(200).describe('e.g. "PR #12: Ledger core API" or "Commit 3f9c2ab"'),
      url: z.url({ protocol: /^https?$/ }).optional(),
      status: z.string().max(40).optional().describe('e.g. open, merged, passed, failed'),
      task_id: taskId.optional(),
      run_id: runId,
    }),
    write: true,
    async run(ctx, a) {
      const run = await currentRun(ctx, a.run_id)
      const task = a.task_id ? await resolveTask(ctx, a.task_id) : run.task_id ? await resolveTask(ctx, run.task_id) : null
      const art = must(
        await db.from('artifacts').insert({
          workspace_id: ctx.workspaceId, project_id: ctx.projectId, task_id: task?.id ?? null, run_id: run.id,
          kind: a.kind, title: a.title, url: a.url ?? null, status: a.status ?? null,
        }).select('id').single(),
        'Attaching the artifact',
      ) as Row
      if (a.kind === 'pull_request' && task?.status === 'doing') await setStatus(ctx, task, 'review')
      await addActivity(ctx, run.agent_id, a.kind === 'pull_request' ? `opened “${a.title}”` : `attached “${a.title}”${task ? ` to “${task.title}”` : ''}`)
      return { artifact_id: art.id, task_id: task?.id ?? null }
    },
  }),

  tool({
    name: 'request_gate',
    title: 'Ask a person to approve',
    description:
      'Pause for a person’s approval before a risky step: kind "merge" before merging a PR, "deploy" before deploying, "custom" for anything else. ' +
      'Then call wait_for_gate. If that gate is switched off for the project, it comes back approved at once.',
    input: z.strictObject({
      kind: z.enum(['merge', 'deploy', 'custom']),
      title: z.string().min(1).max(200).describe('What needs approving, e.g. "Merge PR #12: Ledger core API"'),
      summary: z.string().max(8000).optional().describe('What changed, how it was tested, and the risks'),
      task_id: taskId.optional(),
      run_id: runId,
    }),
    write: true,
    async run(ctx, a) {
      const project = await loadProject(ctx)
      if (a.kind !== 'custom' && !project.gates?.[a.kind]) {
        return { gate: null, status: 'approved', note: `The ${a.kind} gate is off for this project, so go ahead.` }
      }
      const run = await currentRun(ctx, a.run_id)
      const task = a.task_id ? await resolveTask(ctx, a.task_id) : null
      let q = db.from('gates').select('*').eq('project_id', ctx.projectId).eq('kind', a.kind).eq('status', 'pending')
      q = task ? q.eq('task_id', task.id) : q.eq('title', a.title)
      const open = must(await q.limit(1).maybeSingle(), 'Checking gates')
      if (open) return { gate: { id: open.id, status: 'pending' }, next: `Already waiting. Call wait_for_gate with gate_id "${open.id}".` }

      const gate = must(
        await db.from('gates').insert({
          workspace_id: ctx.workspaceId, project_id: ctx.projectId, kind: a.kind, task_id: task?.id ?? null,
          title: a.title, summary: a.summary ?? '', requested_by_run: run.id,
        }).select().single(),
        'Opening the gate',
      )
      if (task && task.status !== 'done') await setStatus(ctx, task, 'awaiting_approval', { gate_id: gate.id })
      await db.from('runs').update({ status: 'waiting' }).eq('id', run.id).eq('status', 'running')
      const who = (await actorName(run.agent_id)) ?? 'An agent'
      await addActivity(ctx, run.agent_id, `asked to approve “${a.title}”`)
      await notifyPeople(ctx, run.agent_id, 'gate', `${who} is waiting for your approval: ${a.title}`)
      return { gate: { id: gate.id, status: 'pending' }, next: `Call wait_for_gate with gate_id "${gate.id}" and don’t go ahead until it’s approved.` }
    },
  }),

  tool({
    name: 'wait_for_gate',
    title: 'Wait for a decision',
    description:
      'Waits up to timeout_s seconds for a person to decide a gate. If it is still pending, call again. ' +
      'approved: go ahead. changes_requested: read the note, revise (for a plan, call propose_plan again) and ask again. rejected: stop that work.',
    input: z.strictObject({
      gate_id: z.uuid(),
      timeout_s: z.number().int().min(0).max(55).optional().describe('Default 30'),
    }),
    write: false,
    async run(ctx, a) {
      const deadline = Date.now() + (a.timeout_s ?? 30) * 1000
      for (;;) {
        const g = must(await db.from('gates').select('*').eq('id', a.gate_id).eq('project_id', ctx.projectId).maybeSingle(), 'Checking the gate')
        if (!g) throw new AgentError(`No gate ${a.gate_id} in this project.`, 404)
        if (g.status !== 'pending' || Date.now() >= deadline) {
          return {
            gate_id: g.id, kind: g.kind, status: g.status, note: g.note, decided_by: await actorName(g.decided_by), decided_at: g.decided_at,
            next: {
              pending: 'Still waiting for a person. Call wait_for_gate again.',
              approved: g.kind === 'plan' ? 'Approved. The tasks are open: claim_task and start.' : 'Approved. Go ahead.',
              changes_requested: g.kind === 'plan' ? 'Changes requested. Revise with propose_plan using the same refs.' : 'Changes requested. Address the note, then request_gate again.',
              rejected: 'Rejected. Stop this work and tell the person.',
            }[g.status as string],
          }
        }
        await new Promise((r) => setTimeout(r, Math.min(2000, Math.max(0, deadline - Date.now()))))
      }
    },
  }),

  tool({
    name: 'report_usage',
    title: 'Report tokens and cost',
    description: 'Add tokens and cost to a run, for agents without telemetry. Ignored once telemetry reports usage for the run, so it is never counted twice.',
    input: z.strictObject({
      run_id: runId,
      tokens_in: z.number().int().nonnegative(),
      tokens_out: z.number().int().nonnegative(),
      cost_usd: z.number().nonnegative().optional(),
      model: z.string().max(80).optional(),
    }),
    write: true,
    async run(ctx, a) {
      const run = await currentRun(ctx, a.run_id)
      if (run.usage_from_telemetry) return { run_id: run.id, counted: false, reason: 'Telemetry already reports usage for this run.' }
      must(
        await db.rpc('add_run_usage', { p_run: run.id, p_in: a.tokens_in, p_out: a.tokens_out, p_cost: a.cost_usd ?? 0, p_model: a.model ?? null }),
        'Adding usage',
      )
      return { run_id: run.id, counted: true }
    },
  }),
]

export const INSTRUCTIONS = [
  'Foresign is where people track this project and approve agent work. Report your work here as you go.',
  '1. Call get_project to read the goal, the existing tasks and which approval gates are on.',
  '2. If there is no plan yet, propose_plan with the whole task graph. If it returns a gate, wait_for_gate until a person approves it; revise with propose_plan if they ask for changes.',
  '3. For each task whose dependencies are done: claim_task, do the work, attach_artifact for branches, commits and pull requests, then update_task to review or done. Use blocked or failed with a note when stuck.',
  '4. Before merging or deploying, request_gate (kind merge or deploy) and wait_for_gate. Never go ahead on a pending or rejected gate.',
  '5. Sub-agents: start_run with agent_name and the parent run id, pass that run_id to later calls, and end_run when finished.',
  'Write calls accept an idempotency_key; reuse it when retrying so nothing is created twice.',
].join('\n')
