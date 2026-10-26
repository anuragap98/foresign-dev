// OpenTelemetry intake (OTLP/HTTP with JSON). Claude Code's log events carry
// each API request's tokens and cost, which land on the session's run.
import { db, logEvent, sessionRun, subagentRun, type Ctx } from './core.ts'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

interface Usage {
  run: Row
  tokensIn: number
  tokensOut: number
  cost: number
  model?: string
}

function value(v: Row | undefined): unknown {
  if (!v) return undefined
  if ('stringValue' in v) return v.stringValue
  if ('intValue' in v) return Number(v.intValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('boolValue' in v) return v.boolValue
  return undefined
}

function attrs(list: Row[] | undefined): Row {
  const out: Row = {}
  for (const a of list ?? []) out[a.key] = value(a.value)
  return out
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)

export async function handleLogs(ctx: Ctx, body: Row) {
  const usage = new Map<string, Usage>()
  let records = 0

  for (const rl of body.resourceLogs ?? []) {
    const resource = attrs(rl.resource?.attributes)
    for (const sl of rl.scopeLogs ?? []) {
      for (const rec of sl.logRecords ?? []) {
        records++
        const a = { ...resource, ...attrs(rec.attributes) }
        const name = String(a['event.name'] ?? value(rec.body) ?? '').replace(/^claude_code\./, '')
        const sid = a['session.id']
        if (!sid || (name !== 'api_request' && name !== 'api_error')) continue

        const main = await sessionRun(ctx, String(sid))
        const run = a.agent_id ? await subagentRun(ctx, main, String(sid), String(a.agent_id), a['agent.name']) : main

        if (name === 'api_error') {
          await logEvent(ctx, run.id, {
            type: 'error',
            name: `API error${a.status_code ? ` ${a.status_code}` : ''}`,
            detail: a.error,
            durationMs: num(a.duration_ms),
          })
          continue
        }
        const u = usage.get(run.id) ?? { run, tokensIn: 0, tokensOut: 0, cost: 0 }
        u.tokensIn += num(a.input_tokens) + num(a.cache_read_tokens) + num(a.cache_creation_tokens)
        u.tokensOut += num(a.output_tokens)
        u.cost += num(a.cost_usd)
        if (a.model) u.model = String(a.model)
        usage.set(run.id, u)
      }
    }
  }

  for (const u of usage.values()) {
    await db.rpc('add_run_usage', { p_run: u.run.id, p_in: u.tokensIn, p_out: u.tokensOut, p_cost: u.cost, p_model: u.model ?? null, p_telemetry: true })
  }
  return { records, runs: usage.size }
}
