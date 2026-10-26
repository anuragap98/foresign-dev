import { Check, Copy, KeyRound, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import type { Project } from '@/data/types'
import { setupSnippets, useAgentTokens, useCreateToken, useRevokeToken, type Snippet } from '@/lib/api/agents'
import { useNow } from '@/lib/derive'
import { relTime } from '@/lib/time'
import { useActorsById } from '@/store/people'
import { useUi } from '@/store/ui'

type Tool = 'claude' | 'cursor' | 'codex'

const TOOLS: { value: Tool; label: string; runtime: string; agent: string }[] = [
  { value: 'claude', label: 'Claude Code', runtime: 'claude-code', agent: 'Claude Code' },
  { value: 'cursor', label: 'Cursor', runtime: 'cursor', agent: 'Cursor' },
  { value: 'codex', label: 'Codex', runtime: 'codex', agent: 'Codex' },
]

function CopyButton({ text, label }: { text: string; label: string }) {
  const showToast = useUi((s) => s.showToast)
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      showToast('Couldn’t copy. Select the text and copy it yourself.')
    }
  }
  return (
    <Button variant="soft" size="sm" onClick={copy} aria-label={label}>
      {done ? <Check /> : <Copy />} {done ? 'Copied' : 'Copy'}
    </Button>
  )
}

function SnippetBlock({ s, step }: { s: Snippet; step: number }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <span className="tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-bold text-accent-ink">{step}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">{s.title}</h3>
          <p className="text-[13px] text-ink-2">{s.hint}</p>
        </div>
        <CopyButton text={s.code} label={`Copy: ${s.title}`} />
      </div>
      {s.file && <p className="pl-9 font-mono text-[12px] text-ink-3">{s.file}</p>}
      <pre className="ml-9 max-h-56 overflow-auto rounded-[14px] bg-fill p-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all text-ink">{s.code}</pre>
    </section>
  )
}

function TokenList({ projectId }: { projectId: string }) {
  const { data: tokens, isLoading, error } = useAgentTokens(projectId)
  const revoke = useRevokeToken(projectId)
  const actors = useActorsById()
  const showToast = useUi((s) => s.showToast)
  const now = useNow(60_000).getTime()
  const live = tokens?.filter((t) => !t.revokedAt) ?? []

  if (isLoading) return <p className="py-2 text-[13px] text-ink-3">Loading tokens…</p>
  if (error) return <p className="py-2 text-[13px] text-danger">{error.message}</p>
  if (!live.length) return <p className="py-2 text-[13px] text-ink-3">No agents connected yet.</p>
  return (
    <ul className="flex flex-col">
      {live.map((t) => (
        <li key={t.id} className="flex items-center gap-3 border-t border-sep py-2.5 first:border-t-0">
          {t.agentId ? <Avatar id={t.agentId} size={28} /> : <KeyRound className="size-5 text-ink-3" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold">{t.label}</span>
            <span className="block truncate text-[12px] text-ink-2">
              {t.agentId && actors[t.agentId] ? `${actors[t.agentId].name} · ` : ''}
              {t.lastUsedAt ? `last used ${relTime(t.lastUsedAt, now)}` : 'not used yet'}
            </span>
          </span>
          <Button
            variant="danger"
            size="sm"
            disabled={revoke.isPending}
            onClick={() =>
              revoke.mutate(t.id, {
                onSuccess: () => showToast(`Revoked “${t.label}”. Agents using it are cut off now.`),
                onError: (e) => showToast(`Couldn’t revoke: ${e.message}`),
              })
            }
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Creates a per-project token and shows how to plug it into each agent tool. */
export function ConnectAgent({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tool, setTool] = useState<Tool>('claude')
  const [label, setLabel] = useState('')
  const [agentName, setAgentName] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const create = useCreateToken(project.id)
  const meta = TOOLS.find((t) => t.value === tool)!

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(
      { label: label.trim() || `${meta.label} on ${project.name}`, agentName: agentName.trim() || meta.agent, runtime: meta.runtime },
      { onSuccess: (r) => setToken(r.token) },
    )
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      // The token is shown once; closing forgets it.
      setToken(null)
      setLabel('')
      setAgentName('')
      create.reset()
    }
  }

  const snippets = token ? setupSnippets(token)[tool] : null

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Connect an agent"
      description={project.name}
      className="max-h-[calc(100dvh-24px)] w-[min(720px,calc(100vw-24px))] overflow-y-auto"
    >
      <div className="flex flex-col gap-5">
        <Segmented label="Agent tool" value={tool} onChange={setTool} options={TOOLS.map((t) => ({ value: t.value, label: t.label }))} className="self-center" />

        {!snippets ? (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-[14px] text-ink-2">
              A token lets one agent read this project, plan and update its tasks, and ask for approvals. It can’t see other projects or approve
              anything itself.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Agent name">
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder={meta.agent} maxLength={60} />
              </Field>
              <Field label="Token label">
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`${meta.label} on ${project.name}`} maxLength={80} />
              </Field>
            </div>
            {create.error && <p className="text-[13px] text-danger">{create.error.message}</p>}
            <Button type="submit" variant="gel" className="self-end" disabled={create.isPending}>
              <Plus /> {create.isPending ? 'Creating…' : 'Create token'}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--prio-high)_14%,transparent)] p-3.5">
              <div className="flex items-center gap-3">
                <KeyRound className="size-5 shrink-0 text-[var(--prio-high)]" />
                <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{token}</code>
                <CopyButton text={token!} label="Copy token" />
              </div>
              <p className="mt-1.5 pl-8 text-[12px] text-ink-2">Shown once. Pane keeps only a fingerprint of it, so copy what you need now.</p>
            </div>
            {snippets.map((s, i) => (
              <SnippetBlock key={s.title} s={s} step={i + 1} />
            ))}
            {tool !== 'claude' && (
              <p className="text-[13px] text-ink-2">
                Tracing and cost come in automatically from Claude Code only. Other tools report through the MCP tools, including{' '}
                <code className="font-mono">report_usage</code>.
              </p>
            )}
          </div>
        )}

        <section className="border-t border-sep pt-4">
          <h3 className="mb-1 text-[15px] font-semibold">Connected</h3>
          <TokenList projectId={project.id} />
        </section>
      </div>
    </Modal>
  )
}
