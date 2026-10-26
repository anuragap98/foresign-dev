/**
 * Contract tests for the agent API (MCP tools, Claude Code hooks, OTLP intake)
 * against the local stack. Needs `npm run db:reset` once and the function
 * served (`npm run functions:serve`), then:
 *
 *   npm run test:agent
 *
 * It signs in as the demo person, makes two throwaway projects and removes them at the end.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { after, before, describe, test } from 'node:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const env = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
)
const API = `${env.API_URL}/functions/v1/agent`
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const person: SupabaseClient = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } })

let workspaceId = ''
const projects: Row = {}
const tokens: Row = {}
const tokenIds: string[] = []
let rpcId = 0

const today = new Date().toISOString().slice(0, 10)

async function post(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

async function rpc(method: string, params: Row = {}, token = tokens.a) {
  return post('/mcp', { jsonrpc: '2.0', id: ++rpcId, method, params }, token)
}

/** Calls a tool; returns its result, or { error } when the tool reports one. */
async function call(name: string, args: Row = {}, token = tokens.a): Promise<Row> {
  const { status, body } = await rpc('tools/call', { name, arguments: args }, token)
  assert.equal(status, 200, JSON.stringify(body))
  assert.ok(body.result, JSON.stringify(body))
  const r = body.result
  return r.isError ? { error: r.content[0].text } : r.structuredContent
}

const row = async (table: string, id: string) => (await admin.from(table).select('*').eq('id', id).single()).data as Row

before(async () => {
  const { error } = await person.auth.signInWithPassword({ email: 'lin@pane.app', password: 'pane-local-demo' })
  assert.ifError(error)
  const { data: m } = await person.from('memberships').select('workspace_id').limit(1).single()
  workspaceId = m!.workspace_id
  for (const key of ['a', 'b']) {
    const { data, error: e } = await person
      .from('projects')
      .insert({ workspace_id: workspaceId, name: `Contract test ${key} ${randomUUID().slice(0, 6)}`, due: today, gates: { plan: true, merge: true, deploy: false } })
      .select()
      .single()
    assert.ifError(e)
    projects[key] = data
    const { data: t, error: te } = await person.rpc('create_agent_token', { p_project: data!.id, p_label: `contract ${key}` })
    assert.ifError(te)
    tokens[key] = t.token
    tokenIds.push(t.id)
  }
})

after(async () => {
  await admin.from('projects').delete().in('id', [projects.a?.id, projects.b?.id].filter(Boolean))
  await admin.from('actors').delete().eq('workspace_id', workspaceId).eq('kind', 'agent').in('name', ['Contract helper', 'Contract explorer'])
})

describe('auth', () => {
  test('refuses a missing or unknown token', async () => {
    assert.equal((await post('/mcp', { jsonrpc: '2.0', id: 1, method: 'ping' })).status, 401)
    assert.equal((await post('/hooks', {}, 'pane_nope')).status, 401)
  })

  test('the token is not readable by people', async () => {
    const { data } = await person.from('agent_tokens').select('*').eq('id', tokenIds[0])
    // Selecting every column includes token_hash, which people have no grant for.
    assert.equal(data, null)
    const { data: safe } = await person.from('agent_tokens').select('id, label').eq('id', tokenIds[0])
    assert.equal(safe?.length, 1)
  })
})

describe('MCP protocol', () => {
  test('initialize, notifications and tools/list', async () => {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } })
    assert.equal(init.body.result.protocolVersion, '2025-06-18')
    assert.equal(init.body.result.serverInfo.name, 'pane')
    const note = await post('/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' }, tokens.a)
    assert.equal(note.status, 202)
    const list = await rpc('tools/list')
    const names = list.body.result.tools.map((t: Row) => t.name)
    for (const n of ['get_project', 'propose_plan', 'claim_task', 'update_task', 'start_run', 'end_run', 'log_step', 'attach_artifact', 'request_gate', 'wait_for_gate', 'report_usage']) {
      assert.ok(names.includes(n), n)
    }
    const plan = list.body.result.tools.find((t: Row) => t.name === 'propose_plan')
    assert.ok(plan.inputSchema.properties.idempotency_key)
    assert.equal((await rpc('nope/method')).body.error.code, -32601)
  })

  test('malformed input gets a clear error', async () => {
    const r = await call('propose_plan', { summary: 'x', tasks: [] })
    assert.match(r.error, /tasks/)
    const extra = await call('get_project', { surprise: 1 })
    assert.match(extra.error, /surprise|Unrecognized/i)
  })
})

describe('plan, gates and tasks', () => {
  const plan = {
    summary: 'Build a tiny thing.',
    tasks: [
      { ref: 'schema', title: 'Schema' },
      { ref: 'api', title: 'API', depends_on: ['schema'] },
      { ref: 'tests', title: 'Tests', depends_on: ['api'] },
    ],
  }
  let gateId = ''

  test('get_project reads the goal and gates', async () => {
    const r = await call('get_project')
    assert.equal(r.project.id, projects.a.id)
    assert.equal(r.project.gates.plan, true)
    assert.equal(r.you.name, 'Claude Code')
  })

  test('refuses a dependency cycle', async () => {
    const r = await call('propose_plan', { summary: 'loop', tasks: [{ ref: 'x', title: 'X', depends_on: ['y'] }, { ref: 'y', title: 'Y', depends_on: ['x'] }] })
    assert.match(r.error, /circle/)
  })

  test('propose_plan opens a gate; the same idempotency key creates the tasks once', async () => {
    const first = await call('propose_plan', { ...plan, idempotency_key: 'plan-1' })
    assert.equal(first.gate.status, 'pending')
    gateId = first.gate.id
    const again = await call('propose_plan', { ...plan, idempotency_key: 'plan-1' })
    assert.deepEqual(again, first)
    const { data } = await admin.from('tasks').select('status').eq('project_id', projects.a.id)
    assert.equal(data!.length, 3)
    assert.ok(data!.every((t) => t.status === 'awaiting_approval'))
  })

  test('agents cannot start work before approval', async () => {
    const r = await call('claim_task', { task_id: 'schema' })
    assert.match(r.error, /waiting for approval/)
    const waited = await call('wait_for_gate', { gate_id: gateId, timeout_s: 0 })
    assert.equal(waited.status, 'pending')
  })

  test('people cannot edit a gate row directly, only decide it', async () => {
    const { data } = await person.from('gates').update({ status: 'approved' }).eq('id', gateId).select()
    assert.equal(data?.length ?? 0, 0)
    assert.equal((await row('gates', gateId)).status, 'pending')
  })

  test('approving the plan opens its tasks', async () => {
    const { error } = await person.rpc('decide_gate', { p_gate: gateId, p_status: 'approved', p_note: 'Looks good' })
    assert.ifError(error)
    const waited = await call('wait_for_gate', { gate_id: gateId, timeout_s: 1 })
    assert.equal(waited.status, 'approved')
    assert.equal(waited.decided_by, 'Lin Zhao')
    const { data } = await admin.from('tasks').select('status').eq('project_id', projects.a.id)
    assert.ok(data!.every((t) => t.status === 'todo'))
  })

  test('dependencies must be done before claiming', async () => {
    const r = await call('claim_task', { task_id: 'api' })
    assert.match(r.error, /Finish these first: “Schema”/)
  })

  test('claim, attach a PR, merge gate, done', async () => {
    const claimed = await call('claim_task', { task_id: 'schema' })
    assert.equal(claimed.task.status, 'doing')
    assert.equal(claimed.task.attempts, 1)

    await call('attach_artifact', { kind: 'pull_request', title: 'PR #1: Schema', url: 'https://github.com/acme/x/pull/1', task_id: 'schema' })
    const t = (await admin.from('tasks').select('*').eq('project_id', projects.a.id).eq('external_ref', 'schema').single()).data!
    assert.equal(t.status, 'review')

    const early = await call('update_task', { task_id: 'schema', status: 'done' })
    assert.match(early.error, /merge gate/)

    const gate = await call('request_gate', { kind: 'merge', title: 'Merge PR #1', task_id: 'schema' })
    assert.equal((await row('tasks', t.id)).status, 'awaiting_approval')
    assert.ifError((await person.rpc('decide_gate', { p_gate: gate.gate.id, p_status: 'approved' })).error)
    assert.equal((await row('tasks', t.id)).status, 'review')

    const done = await call('update_task', { task_id: 'schema', status: 'done', note: 'Merged.' })
    assert.equal(done.task.status, 'done')
    assert.ok((await row('tasks', t.id)).done_at)
  })

  test('a token from another project cannot see this one', async () => {
    const t = (await admin.from('tasks').select('id').eq('project_id', projects.a.id).limit(1).single()).data!
    const r = await call('get_task', { task_id: t.id }, tokens.b)
    assert.match(r.error, /No task/)
    const p = await call('get_project', {}, tokens.b)
    assert.equal(p.project.id, projects.b.id)
  })
})

describe('runs and telemetry', () => {
  const session = `test-${randomUUID()}`

  test('sub-agent runs nest under the parent', async () => {
    const parent = await call('start_run', {})
    const child = await call('start_run', { agent_name: 'Contract helper', parent_run_id: parent.run_id, summary: 'help' })
    assert.equal(child.parent_run_id, parent.run_id)
    await call('log_step', { run_id: child.run_id, type: 'note', name: 'Thinking' })
    const ended = await call('end_run', { run_id: child.run_id, status: 'succeeded', tokens_in: 100, tokens_out: 10, cost_usd: 0.01 })
    assert.equal(ended.status, 'succeeded')
    const r = await row('runs', child.run_id)
    assert.equal(r.status, 'succeeded')
    assert.equal(Number(r.tokens_in), 100)
  })

  test('hooks build a run with a sub-agent and timed tool calls', async () => {
    const hook = (e: Row) => post('/hooks', { session_id: session, cwd: '/repo', transcript_path: '/x', ...e }, tokens.a)
    assert.equal((await hook({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-opus-5-5' })).status, 200)
    await hook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'tu1', tool_input: { command: 'npm test' } })
    await hook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_use_id: 'tu1', tool_input: { command: 'npm test' }, duration_ms: 1234 })
    await hook({ hook_event_name: 'SubagentStart', agent_id: 'ag1', agent_type: 'Contract explorer' })
    await hook({ hook_event_name: 'PreToolUse', agent_id: 'ag1', agent_type: 'Contract explorer', tool_name: 'Edit', tool_use_id: 'tu2', tool_input: { file_path: '/repo/src/a.ts' } })
    await hook({ hook_event_name: 'SubagentStop', agent_id: 'ag1', agent_type: 'Contract explorer', last_assistant_message: 'Found it' })

    const main = (await admin.from('runs').select('*').eq('external_session_id', session).single()).data!
    assert.equal(main.model, 'claude-opus-5-5')
    const ev = (await admin.from('run_events').select('*').eq('run_id', main.id).eq('span_id', 'tu1').single()).data!
    assert.equal(ev.type, 'command')
    assert.equal(ev.name, 'npm test')
    assert.equal(ev.duration_ms, 1234)

    const sub = (await admin.from('runs').select('*').eq('external_session_id', `${session}/ag1`).single()).data!
    assert.equal(sub.parent_run_id, main.id)
    assert.equal(sub.status, 'succeeded')
    assert.equal(sub.summary, 'Found it')
    const edit = (await admin.from('run_events').select('*').eq('run_id', sub.id).eq('span_id', 'tu2').single()).data!
    assert.equal(edit.payload.detail, 'src/a.ts')
  })

  test('a sub-agent opened with start_run is adopted by hooks, not traced twice', async () => {
    const s2 = `test-${randomUUID()}`
    const hook = (e: Row) => post('/hooks', { session_id: s2, cwd: '/repo', transcript_path: '/x', ...e }, tokens.a)
    await hook({ hook_event_name: 'SessionStart', source: 'startup' })
    const main = (await admin.from('runs').select('*').eq('external_session_id', s2).single()).data!
    const child = await call('start_run', { agent_name: 'Contract helper', parent_run_id: main.id })
    await hook({ hook_event_name: 'SubagentStart', agent_id: 'ag2', agent_type: 'general-purpose' })
    await hook({ hook_event_name: 'PreToolUse', agent_id: 'ag2', agent_type: 'general-purpose', tool_name: 'Read', tool_use_id: 'tu3', tool_input: { file_path: '/repo/a.ts' } })
    const kids = (await admin.from('runs').select('*').eq('parent_run_id', main.id)).data!
    assert.equal(kids.length, 1)
    assert.equal(kids[0].id, child.run_id)
    assert.equal(kids[0].external_session_id, `${s2}/ag2`)
    await hook({ hook_event_name: 'SessionEnd', reason: 'other' })
  })

  test('OTLP api_request events add tokens and cost once', async () => {
    const attr = (key: string, v: Row) => ({ key, value: v })
    const res = await post('/otlp/v1/logs', {
      resourceLogs: [{
        resource: { attributes: [attr('service.name', { stringValue: 'claude-code' })] },
        scopeLogs: [{
          logRecords: [1, 2].map(() => ({
            body: { stringValue: 'claude_code.api_request' },
            attributes: [
              attr('event.name', { stringValue: 'api_request' }),
              attr('session.id', { stringValue: session }),
              attr('model', { stringValue: 'claude-opus-5-5' }),
              attr('input_tokens', { intValue: '1000' }),
              attr('output_tokens', { intValue: '200' }),
              attr('cache_read_tokens', { intValue: '0' }),
              attr('cost_usd', { doubleValue: 0.5 }),
            ],
          })),
        }],
      }],
    }, tokens.a)
    assert.equal(res.status, 200)
    const main = (await admin.from('runs').select('*').eq('external_session_id', session).single()).data!
    assert.equal(Number(main.tokens_in), 2000)
    assert.equal(Number(main.cost_usd), 1)
    assert.equal(main.usage_from_telemetry, true)
    const dup = await call('report_usage', { run_id: main.id, tokens_in: 5, tokens_out: 5 })
    assert.equal(dup.counted, false)
  })

  test('SessionEnd closes the run', async () => {
    await post('/hooks', { session_id: session, hook_event_name: 'SessionEnd', reason: 'other' }, tokens.a)
    const main = (await admin.from('runs').select('*').eq('external_session_id', session).single()).data!
    assert.equal(main.status, 'succeeded')
    assert.ok(main.ended_at)
  })

  test('OTLP protobuf is refused with a hint', async () => {
    const res = await fetch(`${API}/otlp/v1/logs`, { method: 'POST', headers: { authorization: `Bearer ${tokens.a}`, 'content-type': 'application/x-protobuf' }, body: '' })
    assert.equal(res.status, 415)
  })
})

describe('limits', () => {
  test('a used-up budget stops new work', async () => {
    await admin.from('projects').update({ budget_usd: 0.5 }).eq('id', projects.a.id)
    const r = await call('claim_task', { task_id: 'api' })
    assert.match(r.error, /Budget reached/)
    await admin.from('projects').update({ budget_usd: null }).eq('id', projects.a.id)
  })

  test('a revoked token stops working', async () => {
    assert.ifError((await person.rpc('revoke_agent_token', { p_token: tokenIds[1] })).error)
    assert.equal((await rpc('ping', {}, tokens.b)).status, 401)
  })
})
