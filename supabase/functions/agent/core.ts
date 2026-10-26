// Shared pieces of the agent API: the service-role client, token checks,
// and the run bookkeeping that MCP calls, hooks and telemetry all go through.
import { createClient } from '@supabase/supabase-js'

export const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

/** Calls per token per minute. Hooks send two per tool call, so this is generous. */
const RATE_LIMIT = Number(Deno.env.get('PANE_AGENT_RATE_LIMIT') ?? 1200)

/** Who is calling: a token is tied to one project and the agent it acts as. */
export interface Ctx {
  tokenId: string
  workspaceId: string
  projectId: string
  agentId: string
}

/** An error the agent should see as-is. */
export class AgentError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** Unwraps a Supabase result, turning database errors into readable ones. */
export function must<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) {
    console.error(`${what}: ${res.error.message}`)
    throw new AgentError(`${what} failed: ${res.error.message}`, 500)
  }
  return res.data
}

export const clip = (s: unknown, n: number) => {
  const t = typeof s === 'string' ? s : s === undefined || s === null ? '' : JSON.stringify(s)
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Reads the bearer token, checks it and counts the call. */
export async function authenticate(req: Request): Promise<Ctx> {
  const header = req.headers.get('authorization') ?? ''
  const token = header.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) throw new AgentError('Missing token. Send "Authorization: Bearer pane_…" from Pane’s Connect an agent panel.', 401)
  const rows = must(await db.rpc('agent_auth', { p_hash: await sha256(token), p_limit: RATE_LIMIT }), 'Checking the token') as Row[]
  const t = rows?.[0]
  if (!t) throw new AgentError('This token is unknown or was revoked.', 401)
  if (!t.allowed) throw new AgentError(`Too many calls: the limit is ${RATE_LIMIT} a minute per token.`, 429)
  return { tokenId: t.token_id, workspaceId: t.workspace_id, projectId: t.project_id, agentId: t.agent_id }
}

// ------------------------------------------------------------------ actors

export async function ensureAgent(ctx: Ctx, name: string, role = 'Sub-agent', runtime = 'claude-code'): Promise<string> {
  return must(
    await db.rpc('ensure_agent', { p_workspace: ctx.workspaceId, p_project: ctx.projectId, p_name: clip(name, 60), p_runtime: runtime, p_role: role }),
    'Finding the agent',
  ) as string
}

/** Shows an agent as working while it has a live run, idle otherwise. */
export async function refreshAgentStatus(agentId: string) {
  const { count } = await db.from('runs').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).in('status', ['running', 'waiting'])
  const busy = (count ?? 0) > 0
  await db.from('actors').update({ agent_status: busy ? 'running' : 'idle', presence: busy ? 'focus' : 'online' }).eq('id', agentId)
}

// -------------------------------------------------------------------- runs

export async function getRun(ctx: Ctx, runId: string): Promise<Row> {
  const run = must(await db.from('runs').select('*').eq('id', runId).eq('project_id', ctx.projectId).maybeSingle(), 'Loading the run')
  if (!run) throw new AgentError(`No run ${runId} in this project.`, 404)
  return run
}

export async function createRun(ctx: Ctx, fields: Row): Promise<Row> {
  const run = must(
    await db
      .from('runs')
      .insert({ workspace_id: ctx.workspaceId, project_id: ctx.projectId, agent_id: ctx.agentId, token_id: ctx.tokenId, ...fields })
      .select()
      .single(),
    'Starting the run',
  )
  await refreshAgentStatus(run.agent_id)
  return run
}

/**
 * The run a call belongs to: the one named, or the token's latest live
 * top-level run (often opened by the SessionStart hook), or a new one.
 */
export async function currentRun(ctx: Ctx, runId?: string): Promise<Row> {
  if (runId) {
    const named = await getRun(ctx, runId)
    return named.status === 'stale' ? revive(named) : named
  }
  const since = new Date(Date.now() - 12 * 3600_000).toISOString()
  const live = must(
    await db
      .from('runs')
      .select('*')
      .eq('token_id', ctx.tokenId)
      .is('parent_run_id', null)
      .in('status', ['running', 'waiting'])
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'Finding the current run',
  )
  return live ?? createRun(ctx, {})
}

const findSession = (ctx: Ctx, externalId: string) =>
  db.from('runs').select('*').eq('workspace_id', ctx.workspaceId).eq('external_session_id', externalId).maybeSingle()

/** The run for an agent tool's session id, if Pane has seen that session. */
export async function existingSessionRun(ctx: Ctx, externalId: string): Promise<Row | null> {
  return must(await findSession(ctx, externalId), 'Finding the session’s run')
}

/** The run for an agent tool's session id, created on first sight. */
export async function sessionRun(ctx: Ctx, externalId: string, fields: Row = {}): Promise<Row> {
  const find = () => findSession(ctx, externalId)
  const found = must(await find(), 'Finding the session’s run')
  if (found?.status === 'stale') return revive(found)
  if (found) return found
  const { error } = await db.from('runs').upsert(
    { workspace_id: ctx.workspaceId, project_id: ctx.projectId, agent_id: ctx.agentId, token_id: ctx.tokenId, external_session_id: externalId, ...fields },
    { onConflict: 'workspace_id,external_session_id', ignoreDuplicates: true },
  )
  if (error) throw new AgentError(`Starting the run failed: ${error.message}`, 500)
  const run = must(await find(), 'Finding the session’s run')
  await refreshAgentStatus(run.agent_id)
  return run
}

/** A run marked stale (it went quiet) whose agent has spoken again is running again. */
async function revive(run: Row): Promise<Row> {
  const back = must(
    await db.from('runs').update({ status: 'running', ended_at: null }).eq('id', run.id).eq('status', 'stale').select().maybeSingle(),
    'Resuming the run',
  )
  await refreshAgentStatus(run.agent_id)
  return back ?? run
}

/** A sub-agent's run inside a session, nested under the session's run. */
export async function subagentRun(ctx: Ctx, parent: Row, sessionId: string, agentId: string, agentType?: string): Promise<Row> {
  const externalId = `${sessionId}/${agentId}`
  const seen = await existingSessionRun(ctx, externalId)
  if (seen) return seen.status === 'stale' ? revive(seen) : seen

  // The agent may have opened this sub-agent's run itself (start_run) just before launching it.
  // Adopt that run, keeping its name, rather than tracing one sub-agent twice. Oldest first,
  // so sub-agents opened in a row are matched in the order they start.
  const since = new Date(Date.now() - 5 * 60_000).toISOString()
  const opened = must(
    await db.from('runs').select('id').eq('parent_run_id', parent.id).is('external_session_id', null)
      .in('status', ['running', 'waiting']).gte('started_at', since).order('started_at').limit(1).maybeSingle(),
    'Finding the sub-agent’s run',
  )
  if (opened) {
    const { data } = await db.from('runs').update({ external_session_id: externalId }).eq('id', opened.id).is('external_session_id', null).select().maybeSingle()
    if (data) return data
    const raced = await existingSessionRun(ctx, externalId)
    if (raced) return raced
  }

  const actor = await ensureAgent(ctx, agentType || 'Sub-agent')
  return sessionRun(ctx, externalId, { agent_id: actor, parent_run_id: parent.id, task_id: parent.task_id, model: parent.model })
}

export async function endRun(run: Row, status: string, summary?: string) {
  const patch: Row = { status, ended_at: new Date().toISOString() }
  if (summary) patch.summary = clip(summary, 2000)
  must(await db.from('runs').update(patch).eq('id', run.id), 'Ending the run')
  await refreshAgentStatus(run.agent_id)
}

export type EventType = 'tool_call' | 'command' | 'file_edit' | 'message' | 'error' | 'note'

export async function logEvent(
  ctx: Ctx,
  runId: string,
  ev: { type: EventType; name: string; detail?: unknown; durationMs?: number; tokens?: number; spanId?: string; ts?: string },
) {
  must(
    await db.from('run_events').insert({
      workspace_id: ctx.workspaceId,
      run_id: runId,
      type: ev.type,
      name: clip(ev.name, 200),
      duration_ms: ev.durationMs === undefined ? null : Math.max(0, Math.round(ev.durationMs)),
      tokens: ev.tokens ?? null,
      span_id: ev.spanId ?? null,
      ts: ev.ts ?? new Date().toISOString(),
      payload: ev.detail === undefined ? {} : { detail: clip(ev.detail, 4000) },
    }),
    'Logging the step',
  )
}

// ------------------------------------------------------------ feeds

export async function addActivity(ctx: Ctx, actorId: string, text: string) {
  await db.from('activity').insert({ workspace_id: ctx.workspaceId, project_id: ctx.projectId, actor_id: actorId, text: clip(text, 300) })
}

/** Tells every person in the workspace (gate requests, failed runs). */
export async function notifyPeople(ctx: Ctx, from: string, kind: 'gate' | 'failure' | 'update', text: string) {
  const members = must(await db.from('memberships').select('actor_id').eq('workspace_id', ctx.workspaceId), 'Finding people') as Row[]
  if (!members.length) return
  await db.from('notifications').insert(
    members.map((m) => ({ workspace_id: ctx.workspaceId, recipient_id: m.actor_id, from_actor_id: from, kind, text: clip(text, 300) })),
  )
}
