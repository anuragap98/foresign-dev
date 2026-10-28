// Foresign's agent API. Every route takes "Authorization: Bearer <agent token>".
//   POST /agent/mcp             MCP over Streamable HTTP (JSON replies)
//   POST /agent/hooks           Claude Code hook events
//   POST /agent/otlp/v1/logs    OpenTelemetry logs (OTLP/HTTP JSON)
//   POST /agent/otlp/v1/metrics accepted and ignored, so exporters stay quiet
import { AgentError, authenticate } from './core.ts'
import { handleHook } from './hooks.ts'
import { handleMcp } from './mcp.ts'
import { handleLogs } from './otlp.ts'

const MAX_BODY = 1_000_000

function problem(e: unknown, mcp: boolean) {
  const status = e instanceof AgentError ? e.status : 500
  const message = e instanceof AgentError ? e.message : 'Foresign hit an unexpected error.'
  if (!(e instanceof AgentError)) console.error(e)
  return mcp
    ? Response.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message } }, { status })
    : Response.json({ error: message }, { status })
}

async function json(req: Request) {
  const size = Number(req.headers.get('content-length') ?? 0)
  if (size > MAX_BODY) throw new AgentError('Request body is too large.', 413)
  if (!(req.headers.get('content-type') ?? '').includes('json')) {
    throw new AgentError('Send JSON. For OpenTelemetry, set OTEL_EXPORTER_OTLP_PROTOCOL=http/json.', 415)
  }
  try {
    return await req.json()
  } catch {
    throw new AgentError('The body isn’t valid JSON.', 400)
  }
}

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname.replace(/^.*?\/agent(?=\/|$)/, '').replace(/\/+$/, '') || '/'
  const mcp = path === '/mcp'

  if (req.method === 'GET' && path === '/') {
    return Response.json({ name: 'foresign-agent-api', routes: ['/mcp', '/hooks', '/otlp/v1/logs', '/otlp/v1/metrics'] })
  }
  if (req.method !== 'POST') {
    // Stateless MCP: there is no event stream to open and no session to delete.
    return new Response(null, { status: 405, headers: { allow: 'POST' } })
  }

  try {
    const ctx = await authenticate(req)
    switch (path) {
      case '/mcp':
        return await handleMcp(ctx, req)
      case '/hooks':
        // An empty JSON object tells Claude Code to carry on as normal.
        await handleHook(ctx, await json(req))
        return Response.json({})
      case '/otlp/v1/logs':
        await handleLogs(ctx, await json(req))
        return Response.json({})
      case '/otlp/v1/metrics':
        return Response.json({})
      default:
        return Response.json({ error: `No route ${path}` }, { status: 404 })
    }
  } catch (e) {
    return problem(e, mcp)
  }
})
