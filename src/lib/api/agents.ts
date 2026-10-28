import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Where agents send MCP calls, hooks and telemetry (the `agent` Edge Function). */
export const AGENT_API = `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'http://127.0.0.1:54321'}/functions/v1/agent`

export interface AgentToken {
  id: string
  label: string
  agentId?: string
  createdAt: string
  lastUsedAt?: string
  revokedAt?: string
}

const key = (projectId: string) => ['agent-tokens', projectId]

/** A project's tokens. Only safe columns: the hash is never readable from the browser. */
export function useAgentTokens(projectId: string) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: async (): Promise<AgentToken[]> => {
      const { data, error } = await supabase
        .from('agent_tokens')
        .select('id, label, agent_id, created_at, last_used_at, revoked_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(`Loading tokens failed: ${error.message}`)
      return data.map((r) => ({
        id: r.id,
        label: r.label,
        agentId: r.agent_id ?? undefined,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at ?? undefined,
        revokedAt: r.revoked_at ?? undefined,
      }))
    },
    refetchInterval: 30_000,
  })
}

export function useCreateToken(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; agentName: string; runtime: string }) => {
      const { data, error } = await supabase.rpc('create_agent_token', {
        p_project: projectId,
        p_label: input.label,
        p_agent_name: input.agentName,
        p_runtime: input.runtime,
      })
      if (error) throw new Error(error.message)
      return data as { id: string; token: string; agent_id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

export function useRevokeToken(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('revoke_agent_token', { p_token: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(projectId) }),
  })
}

// ------------------------------------------------------------- set-up snippets

const HOOK_EVENTS = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'SubagentStart', 'SubagentStop', 'Stop', 'Notification', 'SessionEnd',
]

export interface Snippet {
  title: string
  hint: string
  file?: string
  code: string
}

/** Copy-paste set-up for each agent tool, with the token filled in. */
export function setupSnippets(token: string): Record<'claude' | 'cursor' | 'codex', Snippet[]> {
  const auth = `Bearer ${token}`
  const hook = { type: 'http', url: `${AGENT_API}/hooks`, headers: { Authorization: auth }, timeout: 5 }
  const claudeSettings = { hooks: Object.fromEntries(HOOK_EVENTS.map((e) => [e, [{ hooks: [hook] }]])) }
  // Claude Code reads telemetry settings from the shell it starts in, not from settings files.
  const telemetry = {
    CLAUDE_CODE_ENABLE_TELEMETRY: '1',
    OTEL_LOGS_EXPORTER: 'otlp',
    OTEL_EXPORTER_OTLP_PROTOCOL: 'http/json',
    OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: `${AGENT_API}/otlp/v1/logs`,
    OTEL_EXPORTER_OTLP_HEADERS: `Authorization=${auth}`,
  }
  const mcp = {
    title: 'Tools for planning and reporting',
    hint: 'Gives the agent Foresign’s tools: read the project, propose a plan, claim tasks, ask for approval.',
  }
  return {
    claude: [
      {
        ...mcp,
        hint: `${mcp.hint} Run it in the repo; it’s saved for you only.`,
        code: `claude mcp add --transport http foresign ${AGENT_API}/mcp --header "Authorization: ${auth}"`,
      },
      {
        title: 'Automatic tracing',
        hint: 'Hooks send every prompt, tool call and sub-agent to Foresign, with no effort from the agent. Merge into this file, and keep it out of git.',
        file: '.claude/settings.local.json',
        code: JSON.stringify(claudeSettings, null, 2),
      },
      {
        title: 'Tokens and cost',
        hint: 'Telemetry reports what every model call cost. Run these in the shell you start claude from (or add them to your shell profile).',
        code: Object.entries(telemetry).map(([k, v]) => `export ${k}="${v}"`).join('\n'),
      },
      {
        title: 'Then ask it to start',
        hint: 'A first prompt that follows Foresign’s flow.',
        code: 'Use the foresign tools: read the project, propose a plan with dependencies, and wait for my approval before you start. Use sub-agents for independent tasks.',
      },
    ],
    cursor: [
      {
        ...mcp,
        file: '.cursor/mcp.json',
        code: JSON.stringify({ mcpServers: { foresign: { url: `${AGENT_API}/mcp`, headers: { Authorization: auth } } } }, null, 2),
      },
    ],
    codex: [
      {
        ...mcp,
        file: '~/.codex/config.toml',
        code: [`[mcp_servers.foresign]`, `url = "${AGENT_API}/mcp"`, `http_headers = { Authorization = "${auth}" }`].join('\n'),
      },
    ],
  }
}
