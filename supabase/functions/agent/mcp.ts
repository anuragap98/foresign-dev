// A stateless MCP server over Streamable HTTP: each POST carries JSON-RPC and
// gets a plain JSON reply (no sessions, no server-sent events).
import { z } from 'zod'
import { AgentError, db, type Ctx } from './core.ts'
import { INSTRUCTIONS, TOOLS, type Tool } from './tools.ts'

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

interface Message {
  jsonrpc: '2.0'
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

const idempotency = z.string().min(1).max(200).optional()
  .describe('Any unique string. Retrying with the same key returns the first result instead of repeating the change.')

const listed = TOOLS.map((t) => {
  const input = t.write ? t.input.extend({ idempotency_key: idempotency }) : t.input
  const { $schema: _, ...schema } = z.toJSONSchema(input) as Record<string, unknown>
  return {
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: schema,
    annotations: { readOnlyHint: !t.write, destructiveHint: false, idempotentHint: !t.write, openWorldHint: false },
  }
})
const byName = new Map(TOOLS.map((t) => [t.name, t]))

const text = (value: unknown, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : { structuredContent: value as Record<string, unknown> }),
})

function readable(err: z.ZodError) {
  return err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')
}

async function callTool(ctx: Ctx, t: Tool, raw: Record<string, unknown>) {
  const { idempotency_key, ...rest } = raw
  const key = t.write ? idempotency.safeParse(idempotency_key) : null
  if (key && !key.success) return text(`Invalid input: idempotency_key: ${readable(key.error)}`, true)

  const parsed = t.input.safeParse(rest)
  if (!parsed.success) return text(`Invalid input for ${t.name}: ${readable(parsed.error)}`, true)

  const k = key?.data
  if (k) {
    const { data: seen } = await db.from('agent_requests').select('response').eq('token_id', ctx.tokenId).eq('key', `${t.name}:${k}`).maybeSingle()
    if (seen) return text(seen.response)
  }
  try {
    const result = await t.run(ctx, parsed.data)
    if (k) {
      await db.from('agent_requests').upsert({ token_id: ctx.tokenId, key: `${t.name}:${k}`, response: result }, { onConflict: 'token_id,key', ignoreDuplicates: true })
    }
    return text(result)
  } catch (e) {
    if (e instanceof AgentError) return text(e.message, true)
    console.error(`${t.name} failed`, e)
    return text(`${t.name} failed unexpectedly. Try again; if it keeps failing, tell the person.`, true)
  }
}

async function handle(ctx: Ctx, m: Message): Promise<unknown | null> {
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: m.id, result })
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: m.id ?? null, error: { code, message } })

  if (m?.jsonrpc !== '2.0' || typeof m.method !== 'string') return fail(-32600, 'Not a JSON-RPC 2.0 request')
  // Notifications (no id) get no reply.
  if (m.id === undefined || m.id === null) return null

  switch (m.method) {
    case 'initialize': {
      const asked = String(m.params?.protocolVersion ?? '')
      return reply({
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'pane', title: 'Pane', version: '0.2.0' },
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return reply({})
    case 'tools/list':
      return reply({ tools: listed })
    case 'tools/call': {
      const name = String(m.params?.name ?? '')
      const t = byName.get(name)
      if (!t) return fail(-32602, `Unknown tool: ${name}`)
      const args = m.params?.arguments
      if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) return fail(-32602, 'arguments must be an object')
      return reply(await callTool(ctx, t, (args ?? {}) as Record<string, unknown>))
    }
    default:
      return fail(-32601, `Method not found: ${m.method}`)
  }
}

export async function handleMcp(ctx: Ctx, req: Request): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 })
  }
  const batch = Array.isArray(body)
  const messages = (batch ? body : [body]) as Message[]
  const replies = (await Promise.all(messages.map((m) => handle(ctx, m)))).filter((r) => r !== null)
  if (!replies.length) return new Response(null, { status: 202 })
  return Response.json(batch ? replies : replies[0])
}
