// Claude Code hooks: Claude Code POSTs each hook event here (an "http" hook),
// so runs and their traces appear without the agent calling any tool.
import { clip, db, endRun, existingSessionRun, logEvent, sessionRun, subagentRun, type Ctx, type EventType } from './core.ts'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const EDITS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const COMMANDS = new Set(['Bash', 'PowerShell'])

/** What a tool call was about, kept short. Inputs aren't stored whole: they can hold secrets. */
function describe(e: Row): { type: EventType; name: string; detail?: string } {
  const tool = String(e.tool_name ?? 'tool')
  const input = (e.tool_input ?? {}) as Row
  const rel = (p: unknown) => {
    if (typeof p !== 'string' || !e.cwd) return p
    return p === e.cwd ? '.' : p.startsWith(`${e.cwd}/`) ? p.slice(e.cwd.length + 1) : p
  }
  if (COMMANDS.has(tool)) return { type: 'command', name: clip(input.command ?? tool, 160), detail: input.description }
  if (EDITS.has(tool)) return { type: 'file_edit', name: tool, detail: rel(input.file_path ?? input.notebook_path) as string }
  if (tool === 'Agent' || tool === 'Task') return { type: 'tool_call', name: tool, detail: `Started sub-agent: ${input.subagent_type ?? 'general-purpose'}${input.description ? ` · ${input.description}` : ''}` }
  const mcp = tool.match(/^mcp__(.+?)__(.+)$/)
  const target = input.file_path ?? input.path ?? input.pattern ?? input.url ?? input.query
  return { type: 'tool_call', name: mcp ? `${mcp[1]}.${mcp[2]}` : tool, detail: target === undefined ? undefined : String(rel(target)) }
}

export async function handleHook(ctx: Ctx, e: Row) {
  const event = String(e.hook_event_name ?? '')
  const sid = typeof e.session_id === 'string' ? e.session_id : ''
  if (!event || !sid) return { ok: false, reason: 'Not a Claude Code hook event' }

  // A session that did nothing before ending (Claude Code opens some in the background) isn't worth a run.
  if (event === 'SessionEnd' && !(await existingSessionRun(ctx, sid))) return { ok: true, ignored: true }

  const main = await sessionRun(ctx, sid, e.model ? { model: e.model } : {})
  // Events from inside a sub-agent carry its id; they belong to its own run.
  const run = e.agent_id ? await subagentRun(ctx, main, sid, String(e.agent_id), e.agent_type) : main

  switch (event) {
    case 'SessionStart':
      if (e.model) await db.from('runs').update({ model: e.model }).eq('id', main.id)
      if (main.status !== 'running' && main.status !== 'waiting') await db.from('runs').update({ status: 'running', ended_at: null }).eq('id', main.id)
      await logEvent(ctx, main.id, { type: 'note', name: e.source === 'startup' || !e.source ? 'Session started' : `Session ${e.source}` })
      break
    case 'UserPromptSubmit':
      await logEvent(ctx, run.id, { type: 'message', name: 'Prompt', detail: clip(e.prompt, 2000) })
      break
    case 'PreToolUse': {
      const d = describe(e)
      await logEvent(ctx, run.id, { ...d, spanId: e.tool_use_id })
      break
    }
    case 'PostToolUse':
    case 'PostToolUseFailure': {
      // Close the span PreToolUse opened; if that event was missed, record the call now.
      const span = e.tool_use_id
        ? (await db.from('run_events').select('id, ts').eq('run_id', run.id).eq('span_id', e.tool_use_id).maybeSingle()).data
        : null
      const ms = typeof e.duration_ms === 'number' ? e.duration_ms : span ? Date.now() - new Date(span.ts).getTime() : undefined
      if (span) await db.from('run_events').update({ duration_ms: ms === undefined ? null : Math.round(ms) }).eq('id', span.id)
      else await logEvent(ctx, run.id, { ...describe(e), durationMs: ms, spanId: e.tool_use_id })
      if (event === 'PostToolUseFailure' && !e.is_interrupt) {
        await logEvent(ctx, run.id, { type: 'error', name: `${e.tool_name ?? 'Tool'} failed`, detail: clip(e.error, 2000) })
      }
      break
    }
    case 'SubagentStart':
      await logEvent(ctx, run.id, { type: 'note', name: 'Sub-agent started', detail: e.agent_type })
      break
    case 'SubagentStop':
      await endRun(run, 'succeeded', e.last_assistant_message)
      break
    case 'Stop':
      if (e.last_assistant_message) await db.from('runs').update({ summary: clip(e.last_assistant_message, 2000) }).eq('id', run.id)
      await logEvent(ctx, run.id, { type: 'message', name: 'Turn finished', detail: clip(e.last_assistant_message, 1000) })
      break
    case 'StopFailure':
      await logEvent(ctx, run.id, { type: 'error', name: 'Turn failed', detail: clip(e.error ?? e.reason, 2000) })
      break
    case 'Notification':
      await logEvent(ctx, run.id, { type: 'note', name: e.title ?? 'Notification', detail: e.message })
      break
    case 'SessionEnd': {
      // Sub-agents still open when the session ends were cut short.
      const open = (await db.from('runs').select('*').eq('parent_run_id', main.id).in('status', ['running', 'waiting'])).data ?? []
      for (const child of open) await endRun(child, 'cancelled')
      await logEvent(ctx, main.id, { type: 'note', name: 'Session ended', detail: e.reason })
      if (main.status === 'running' || main.status === 'waiting') await endRun(main, 'succeeded')
      break
    }
    default:
      await logEvent(ctx, run.id, { type: 'note', name: event, detail: e.task_subject ?? e.message })
  }
  return { ok: true, run_id: run.id }
}
