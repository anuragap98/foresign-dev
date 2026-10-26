import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { DayBars } from '@/components/charts/DayBars'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { agentInsights, type AgentInsights, type RangeDays } from '@/lib/insights'
import { fmtCost, fmtDuration, fmtTokens } from '@/lib/runs'
import { useActors } from '@/store/people'
import { useWorkspace } from '@/store/workspace'
import { Delta, Kpi } from './kpi'

function SpendCard({ data, labels, fullLabels }: { data: AgentInsights; labels: string[]; fullLabels: string[] }) {
  // Small budgets read better in cents than as bars stuck at the floor.
  const cents = Math.max(...data.spendPerDay) < 5
  const values = data.spendPerDay.map((v) => (cents ? Math.round(v * 100) : Math.round(v * 100) / 100))
  const format = (v: number) => (cents ? `${v}¢` : `$${v}`)
  return (
    <Card title="Agent spend" subtitle={`What model calls cost each day, across ${data.runs} run${data.runs === 1 ? '' : 's'}`}>
      <p className="mb-3 flex flex-wrap items-baseline gap-2">
        <span className="display tabular text-[28px] leading-none font-bold">{fmtCost(data.spend)}</span>
        <span className="text-[13px] text-ink-2">{data.perTask ? `${fmtCost(data.perTask)} per finished task` : 'no tasks finished yet'}</span>
      </p>
      <DayBars labels={labels} values={values} color="var(--orange)" format={format} tooltipLabel={(i) => fullLabels[i]} />
    </Card>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-t border-sep py-2 first:border-t-0">
      <span className="text-[14px]">
        {label}
        {hint && <span className="block text-[12px] text-ink-3">{hint}</span>}
      </span>
      <span className="tabular shrink-0 text-[15px] font-semibold">{value}</span>
    </li>
  )
}

function ApprovalsCard({ data }: { data: AgentInsights }) {
  const g = data.gates
  return (
    <Card title="Approvals" subtitle="Where people stepped in">
      <ul>
        <Row label="Waiting for you now" value={String(g.pending)} />
        <Row label="Decided" value={String(g.decided)} hint={`${g.approved} approved · ${g.changes} sent back · ${g.rejected} rejected`} />
        <Row label="People stepped in" value={g.decided ? `${g.steppedInRate}%` : '–'} hint="Decisions that asked for changes or rejected" />
        <Row label="Typical wait for a decision" value={g.decided ? fmtDuration(g.waitMs) : '–'} hint="Median, request to decision" />
        <Row label="Lead time, agent-planned tasks" value={data.leadDays ? `${data.leadDays}d` : '–'} hint="Median, planned to done" />
      </ul>
    </Card>
  )
}

function ByAgentCard({ data }: { data: AgentInsights }) {
  return (
    <Card title="By agent" subtitle="Orchestrators and sub-agents">
      {data.byAgent.length ? (
        <div className="scroll-thin -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[560px] text-[13px]">
            <caption className="sr-only">Work and cost per agent</caption>
            <thead className="text-left text-[12px] text-ink-2">
              <tr>
                <th className="py-1.5 font-medium">Agent</th>
                <th className="py-1.5 text-right font-medium">Finished</th>
                <th className="py-1.5 text-right font-medium">Runs</th>
                <th className="py-1.5 text-right font-medium">Success</th>
                <th className="py-1.5 text-right font-medium">Retried</th>
                <th className="py-1.5 text-right font-medium">Spend</th>
                <th className="py-1.5 text-right font-medium">Per task</th>
                <th className="py-1.5 text-right font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.byAgent.map((r) => (
                <tr key={r.agent.id} className="border-t border-sep">
                  <td className="py-2">
                    <Link to={`/team/${r.agent.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                      <Avatar id={r.agent.id} size={24} />
                      <span className="truncate">{r.agent.name}</span>
                    </Link>
                  </td>
                  <td className="py-2 text-right font-semibold">{r.finished}</td>
                  <td className="py-2 text-right">{r.runs}</td>
                  <td className="py-2 text-right">{r.ended ? `${r.success}%` : '–'}</td>
                  <td className="py-2 text-right">{r.retries}</td>
                  <td className="py-2 text-right font-semibold">{fmtCost(r.cost)}</td>
                  <td className="py-2 text-right text-ink-2">{r.perTask === null ? '–' : fmtCost(r.perTask)}</td>
                  <td className="py-2 text-right text-ink-2">{fmtTokens(r.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-4 text-center text-[14px] text-ink-3">No agent work in this range.</p>
      )}
    </Card>
  )
}

/** Agent metrics for the Insights page; hidden until any agent has reported a run. */
export function AgentSection({ range, labels, fullLabels, now }: { range: RangeDays; labels: string[]; fullLabels: string[]; now: Date }) {
  const { runs, tasks, gates } = useWorkspace(useShallow((s) => ({ runs: s.runs, tasks: s.tasks, gates: s.gates })))
  const actors = useActors()
  const data = useMemo(() => agentInsights(range, runs, tasks, gates, actors, now), [range, runs, tasks, gates, actors, now])
  if (!data.any) return null
  // Against a period with no agent runs, any change would be meaningless.
  const compare = (delta: ReactNode) =>
    data.hadPrev ? delta : <span className="text-[12px] text-ink-3">No runs in the {range} days before</span>

  return (
    <>
      <h2 data-enter className="mt-2 text-[22px] font-bold">Agents</h2>
      <div className="grid gap-[var(--gap)] sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Tasks finished by agents" value={data.finished} delta={compare(<Delta value={data.finishedDelta} unit="%" />)} />
        <Kpi label="Run success rate" value={data.success} format={(n) => `${Math.round(n)}%`} delta={compare(<Delta value={data.successDelta} unit=" pts" />)} />
        <Kpi label="Agent spend" value={data.spend} format={fmtCost} delta={compare(<Delta value={data.spendDelta} unit="%" goodWhenUp={false} />)} />
        <Kpi
          label="Cost per finished task"
          value={data.perTask}
          format={fmtCost}
          delta={<span className="text-[12px] text-ink-3">{data.finished} finished in {range} days</span>}
        />
      </div>
      <div className="grid gap-[var(--gap)] xl:grid-cols-12 [&>div>div]:h-full">
        <div className="min-w-0 xl:col-span-7">
          <SpendCard data={data} labels={labels} fullLabels={fullLabels} />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <ApprovalsCard data={data} />
        </div>
        <div className="min-w-0 xl:col-span-12">
          <ByAgentCard data={data} />
        </div>
      </div>
    </>
  )
}
