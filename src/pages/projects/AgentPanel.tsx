import { Bot, GitMerge, ListChecks, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import type { Gate, GateKind, Project } from '@/data/types'
import { useNow } from '@/lib/derive'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'

const GATE_ICON: Record<GateKind, LucideIcon> = { plan: ListChecks, merge: GitMerge, deploy: Rocket, custom: ShieldCheck }
const GATE_ASK: Record<GateKind, string> = {
  plan: 'Plan waiting for your approval',
  merge: 'Merge waiting for your approval',
  deploy: 'Deploy waiting for your approval',
  custom: 'Waiting for your approval',
}

function GateCard({ gate, now }: { gate: Gate; now: number }) {
  const decideGate = useWorkspace((s) => s.decideGate)
  const runs = useWorkspace((s) => s.runs)
  const tasks = useWorkspace((s) => s.tasks)
  const actors = useActorsById()
  const [noting, setNoting] = useState<'changes_requested' | 'rejected' | null>(null)
  const [note, setNote] = useState('')
  const [more, setMore] = useState(false)

  const agentId = runs.find((r) => r.id === gate.requestedByRun)?.agentId
  const Icon = GATE_ICON[gate.kind]
  // A plan's tasks are the project's tasks still awaiting approval.
  const planned = gate.kind === 'plan' ? tasks.filter((t) => t.projectId === gate.projectId && t.status === 'awaiting_approval') : []
  const long = gate.summary.length > 280 || planned.length > 6

  return (
    <article className="glass glass--thick rounded-card p-4 sm:p-5" aria-label={GATE_ASK[gate.kind]}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--prio-high)_18%,transparent)] text-[var(--prio-high)]">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-[0.04em] text-[var(--prio-high)] uppercase">{GATE_ASK[gate.kind]}</p>
          <h2 className="text-[17px] font-semibold">{gate.title}</h2>
          <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
            {agentId && <Avatar id={agentId} size={18} />}
            {agentId && actors[agentId] ? `${actors[agentId].name} · ` : ''}
            asked {relTime(gate.requestedAt, now)}
          </p>
        </div>
      </div>

      <div className={cn('mt-3 overflow-hidden', long && !more && 'max-h-40 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]')}>
        {gate.summary && <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{gate.summary}</p>}
        {planned.length > 0 && (
          <ol className="mt-2 flex flex-col gap-1">
            {planned.map((t, i) => (
              <li key={t.id} className="flex gap-2 text-[14px]">
                <span className="tabular w-5 shrink-0 text-right text-ink-3">{i + 1}.</span>
                <span className="min-w-0">
                  <span className="font-medium">{t.title}</span>
                  {t.dependsOn.length > 0 && (
                    <span className="text-[12px] text-ink-3"> · after {t.dependsOn.map((d) => tasks.find((x) => x.id === d)?.title ?? 'another task').join(', ')}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {long && (
        <Button variant="link" size="none" className="mt-1 text-[13px]" onClick={() => setMore((v) => !v)}>
          {more ? 'Show less' : 'Show all'}
        </Button>
      )}

      {noting ? (
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            decideGate(gate.id, noting, note.trim() || undefined)
          }}
        >
          <Textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={noting === 'changes_requested' ? 'What should change? The agent reads this.' : 'Why? (optional)'}
            aria-label="Note for the agent"
            required={noting === 'changes_requested'}
            maxLength={4000}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setNoting(null)}>
              Cancel
            </Button>
            <Button type="submit" variant={noting === 'rejected' ? 'danger' : 'gel'} size="sm">
              {noting === 'rejected' ? 'Reject' : 'Send to agent'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setNoting('rejected')}>
            Reject
          </Button>
          <Button variant="soft" size="sm" onClick={() => setNoting('changes_requested')}>
            Request changes
          </Button>
          <Button variant="gel" size="sm" onClick={() => decideGate(gate.id, 'approved')}>
            Approve
          </Button>
        </div>
      )}
    </article>
  )
}

/** Gates on this project waiting for a person. Agents pause until one is decided. */
export function GateBanner({ project }: { project: Project }) {
  const gates = useWorkspace((s) => s.gates)
  const now = useNow(60_000).getTime()
  const pending = gates.filter((g) => g.projectId === project.id && g.status === 'pending')
  if (!pending.length) return null
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      {pending.map((g) => (
        <GateCard key={g.id} gate={g} now={now} />
      ))}
    </div>
  )
}

const GATE_ROWS: { key: keyof Project['gates']; title: string; hint: string }[] = [
  { key: 'plan', title: 'Approve the plan', hint: 'Agents wait for you before starting on the tasks they propose' },
  { key: 'merge', title: 'Approve merges', hint: 'A task with a pull request can’t be done until you approve the merge' },
  { key: 'deploy', title: 'Approve deploys', hint: 'Agents ask before deploying' },
]

/** What agents read (goal, repo), what they need approval for, and what they may spend. */
export function AgentSetupCard({ project: p, onConnect }: { project: Project; onConnect: () => void }) {
  const updateProject = useWorkspace((s) => s.updateProject)
  const runs = useWorkspace((s) => s.runs)
  const [goal, setGoal] = useState(p.goal)
  const [repo, setRepo] = useState(p.repoUrl ?? '')
  const [budget, setBudget] = useState(p.budgetUsd === undefined ? '' : String(p.budgetUsd))

  const mine = useMemo(() => runs.filter((r) => r.projectId === p.id), [runs, p.id])
  const spent = mine.reduce((s, r) => s + r.costUsd, 0)
  const working = new Set(mine.filter((r) => r.status === 'running' || r.status === 'waiting').map((r) => r.agentId))

  const saveBudget = () => {
    const n = budget.trim() === '' ? undefined : Number(budget)
    if (n !== undefined && (!Number.isFinite(n) || n < 0)) return setBudget(p.budgetUsd === undefined ? '' : String(p.budgetUsd))
    if (n !== p.budgetUsd) updateProject(p.id, { budgetUsd: n })
  }

  return (
    <Card
      title="Agents"
      subtitle={working.size ? `${working.size} working now` : 'What agents read and what needs you'}
      action={
        <Button variant="gel" size="sm" onClick={onConnect}>
          <Bot /> Connect
        </Button>
      }
    >
      {working.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[...working].map((id) => (
            <span key={id} className="flex items-center gap-1.5 rounded-full bg-fill py-1 pr-3 pl-1 text-[13px] font-medium">
              <Avatar id={id} size={22} presence />
              <AgentName id={id} />
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3">
        <Field label="Goal">
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onBlur={() => goal !== p.goal && updateProject(p.id, { goal })}
            placeholder="What should agents build? Must-haves, constraints, what done looks like. Markdown is fine."
            className="min-h-28 font-mono text-[13px]"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <Field label="Repository">
            <Input
              type="url"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              onBlur={() => repo.trim() !== (p.repoUrl ?? '') && updateProject(p.id, { repoUrl: repo.trim() || undefined })}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field label="Budget (USD)">
            <Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} onBlur={saveBudget} placeholder="No limit" />
          </Field>
        </div>
        <p className="tabular px-1 text-[13px] text-ink-2">
          Spent ${spent.toFixed(2)}
          {p.budgetUsd !== undefined && ` of $${p.budgetUsd.toFixed(2)}`} across {mine.length} run{mine.length === 1 ? '' : 's'}.
          {p.budgetUsd !== undefined && spent >= p.budgetUsd && <span className="font-semibold text-danger"> Agents can’t start new work.</span>}
        </p>
      </div>

      <h3 className="mt-4 mb-1 text-[15px] font-semibold">Approval gates</h3>
      <ul>
        {GATE_ROWS.map((g) => (
          <li key={g.key} className="flex items-center gap-3 border-t border-sep py-2.5 first:border-t-0">
            <label htmlFor={`gate-${p.id}-${g.key}`} className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{g.title}</span>
              <span className="block text-[12px] text-ink-2">{g.hint}</span>
            </label>
            <Switch
              id={`gate-${p.id}-${g.key}`}
              checked={p.gates[g.key]}
              onCheckedChange={(on) => updateProject(p.id, { gates: { ...p.gates, [g.key]: on } })}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function AgentName({ id }: { id: string }) {
  const actors = useActorsById()
  return <>{actors[id]?.name ?? 'Agent'}</>
}
