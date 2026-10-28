// The local stack, as the tests see it: keys from `supabase status`, the demo
// person, and throwaway projects created through the same APIs the app uses.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
)

export const AGENT_API = `${env.API_URL}/functions/v1/agent`
export const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const DEMO = { email: 'lin@foresign.dev', password: 'foresign-local-demo' }

/** Signs in through the app's own button. */
export async function signIn(page: Page, path = '/home') {
  await page.goto(`/#${path}`)
  await page.getByRole('button', { name: 'Use the local demo account' }).click()
  await expect(page.getByRole('navigation').first()).toBeVisible()
}

export interface TestProject {
  id: string
  name: string
  token: string
  remove: () => Promise<void>
}

/** A fresh project (plan and merge gates on) with an agent token, made as the demo person. */
export async function testProject(label: string): Promise<TestProject> {
  const person = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false } })
  const { error } = await person.auth.signInWithPassword(DEMO)
  if (error) throw error
  const { data: m } = await person.from('memberships').select('workspace_id, actor_id').single()
  const name = `E2E ${label} ${randomUUID().slice(0, 6)}`
  const due = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10)
  const { data: p, error: pe } = await person
    .from('projects')
    .insert({ workspace_id: m!.workspace_id, name, lead_id: m!.actor_id, due, status: 'progress', gates: { plan: true, merge: true, deploy: false } })
    .select()
    .single()
  if (pe) throw pe
  await person.from('project_members').insert({ workspace_id: m!.workspace_id, project_id: p!.id, actor_id: m!.actor_id })
  const { data: t, error: te } = await person.rpc('create_agent_token', { p_project: p!.id, p_label: `e2e ${label}` })
  if (te) throw te
  return { id: p!.id, name, token: t.token, remove: async () => void (await admin.from('projects').delete().eq('id', p!.id)) }
}

let rpcId = 0
/** Calls one of Foresign's MCP tools as the project's agent. */
export async function agentCall(token: string, name: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${AGENT_API}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  })
  const body = await res.json()
  if (body.result?.isError) throw new Error(body.result.content[0].text)
  return body.result.structuredContent
}

/** Sends one Claude Code hook event, as Claude Code would. */
export async function agentHook(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${AGENT_API}/hooks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(200)
}
