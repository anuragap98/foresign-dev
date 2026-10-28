import { ChartLine, Download, Table2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { DayBars } from '@/components/charts/DayBars'
import { Donut } from '@/components/charts/Donut'
import { LineChart } from '@/components/charts/LineChart'
import { ProgressRing } from '@/components/charts/Rings'
import { Avatar } from '@/components/ui/avatar'
import { ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CountUp } from '@/components/ui/count-up'
import { Page, PageHeader } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { downloadText, toCsv } from '@/lib/csv'
import { useNow } from '@/lib/derive'
import { insights, type Insights, type RangeDays } from '@/lib/insights'
import { dayKey, fmtDate } from '@/lib/time'
import { cn } from '@/lib/utils'
import { usePeople } from '@/store/people'
import { useWorkspace } from '@/store/workspace'
import { AgentSection } from './AgentSection'
import { Delta, Kpi } from './kpi'

const RANGES: { value: string; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
]

function ThroughputCard({ data, range, labels, fullLabels }: { data: Insights; range: RangeDays; labels: string[]; fullLabels: string[] }) {
  const [table, setTable] = useState(false)
  return (
    <Card
      id="insights-throughput"
      expandable
      title="Throughput"
      subtitle="Tasks finished each day"
      action={
        <Button variant="soft" size="sm" aria-pressed={table} onClick={() => setTable((t) => !t)}>
          {table ? <ChartLine /> : <Table2 />} {table ? 'Chart' : 'Table'}
        </Button>
      }
    >
      <p className="mb-3 flex flex-wrap items-baseline gap-2">
        <span className="display tabular text-[28px] leading-none font-bold">
          <CountUp value={data.cur.completed} />
        </span>
        <span className="text-[13px] text-ink-2">finished</span>
        <Delta value={data.deltas.completed} unit="%" suffix={`vs previous ${range} days`} />
      </p>
      {table ? (
        <div className="scroll-thin max-h-[260px] overflow-y-auto rounded-[16px] bg-fill">
          <table className="w-full text-[13px]">
            <caption className="sr-only">Tasks finished per day</caption>
            <thead className="sticky top-0 bg-[var(--glass-solid)] text-left text-ink-2">
              <tr>
                <th className="px-3.5 py-2 font-medium">Day</th>
                <th className="px-3.5 py-2 text-right font-medium">This period</th>
                <th className="px-3.5 py-2 text-right font-medium">Previous</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {fullLabels.map((l, i) => (
                <tr key={l} className="border-t border-sep">
                  <td className="px-3.5 py-1.5">{l}</td>
                  <td className="px-3.5 py-1.5 text-right font-semibold">{data.cur.perDay[i]}</td>
                  <td className="px-3.5 py-1.5 text-right text-ink-2">{data.prev.perDay[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <LineChart
          labels={labels}
          tooltipLabel={(i) => fullLabels[i]}
          series={[
            { label: `Last ${range} days`, values: data.cur.perDay, color: 'var(--accent-ink)', fill: true },
            { label: `Previous ${range} days`, values: data.prev.perDay, color: 'var(--text-3)', dashed: true },
          ]}
        />
      )}
    </Card>
  )
}

function ByProjectCard({ data }: { data: Insights }) {
  const hue = (h: string) => `var(--${h})`
  return (
    <Card title="By project" subtitle="Where the finished work went">
      <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
        <Donut
          slices={data.byProject.map((r) => ({ key: r.project.id, value: r.count, color: hue(r.project.hue), label: r.project.name }))}
          center={
            <>
              <span className="display tabular text-[26px] leading-none font-bold">{data.cur.completed}</span>
              <span className="text-[12px] text-ink-2">finished</span>
            </>
          }
        />
        <table className="w-full text-[13px]">
          <caption className="sr-only">Completed tasks by project</caption>
          <thead className="sr-only">
            <tr>
              <th>Project</th>
              <th>Completed</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {data.byProject.map((r) => (
              <tr key={r.project.id}>
                <td className="py-1.5">
                  <Link to={`/projects/${r.project.id}`} className="flex items-center gap-2 hover:underline">
                    <i className="size-2.5 shrink-0 rounded-full" style={{ background: hue(r.project.hue) }} />
                    <span className="truncate">{r.project.name}</span>
                  </Link>
                </td>
                <td className="tabular py-1.5 text-right font-semibold">{r.count}</td>
                <td className="tabular w-12 py-1.5 text-right text-ink-2">{r.share}%</td>
              </tr>
            ))}
            {!data.byProject.length && (
              <tr>
                <td className="py-4 text-center text-ink-3">Nothing finished in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function FocusCard({ data, range, labels, fullLabels }: { data: Insights; range: RangeDays; labels: string[]; fullLabels: string[] }) {
  return (
    <Card title="Focus" subtitle="Team focus hours each day">
      <p className="mb-3 flex flex-wrap items-baseline gap-2">
        <span className="display tabular text-[28px] leading-none font-bold">
          <CountUp value={data.cur.focusH} />
        </span>
        <span className="text-[13px] text-ink-2">hours · about {(data.cur.focusH / range).toFixed(1).replace(/\.0$/, '')}h a day</span>
      </p>
      <DayBars labels={labels} values={data.cur.focusPerDay} color="var(--purple)" unit="h" tooltipLabel={(i) => fullLabels[i]} />
    </Card>
  )
}

function WorkloadCard({ data }: { data: Insights }) {
  const max = Math.max(...data.load.map((l) => Math.max(l.hours, l.person.capacityH)))
  return (
    <Card
      title="Workload"
      subtitle="Open task hours against weekly capacity"
      action={
        <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', data.over ? 'bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-danger' : 'bg-[color-mix(in_srgb,var(--green)_16%,transparent)] text-[var(--delta-up)]')}>
          {data.over ? `${data.over} over capacity` : 'All within capacity'}
        </span>
      }
    >
      <div className="mb-2 flex gap-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-3 rounded-full bg-[var(--green)]" /> Open work
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-3 rounded-full bg-fill-2" /> Capacity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-3 rounded-full bg-danger" /> Over capacity
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {data.load.map((l) => (
          <li key={l.person.id}>
            <Link to={`/team/${l.person.id}`} className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 rounded-[12px] px-1 py-1 transition-colors hover:bg-fill-hover">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar id={l.person.id} size={24} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{l.person.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">{l.person.role}</span>
                </span>
              </span>
              <span className="relative h-2.5 overflow-hidden rounded-full" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded-full bg-fill-2" style={{ width: `${(l.person.capacityH / max) * 100}%` }} />
                <span
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-glass"
                  style={{ width: `${(Math.min(l.hours, l.person.capacityH) / max) * 100}%`, background: l.ratio > 1 ? 'var(--orange)' : 'var(--green)' }}
                />
                {l.ratio > 1 && (
                  <span
                    className="absolute inset-y-0 rounded-r-full bg-danger"
                    style={{ left: `${(l.person.capacityH / max) * 100}%`, width: `${((l.hours - l.person.capacityH) / max) * 100}%` }}
                  />
                )}
              </span>
              <span className="tabular w-[68px] text-right text-[13px] font-semibold">
                {l.hours}h <span className="font-normal text-ink-3">/ {l.person.capacityH}h</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function OnTimeCard({ data, range }: { data: Insights; range: RangeDays }) {
  return (
    <Card title="On time" subtitle={`Tasks finished in the last ${range} days`}>
      <div className="flex items-center gap-5">
        <ProgressRing value={data.cur.rate / 100} size={124} stroke={11} color="var(--green)">
          <span className="text-center">
            <span className="display tabular block text-[30px] leading-none font-bold">
              {data.cur.rate}
              <span className="text-[16px] text-ink-3">%</span>
            </span>
          </span>
        </ProgressRing>
        <div>
          <p className="text-[13px] text-ink-2">finished on or before the due day</p>
          <p className="mt-3 text-[15px]">
            <span className="tabular font-bold">{data.cur.onTime}</span> <span className="text-ink-2">on time</span>
          </p>
          <p className="text-[15px]">
            <span className="tabular font-bold text-[var(--delta-down)]">{data.cur.late}</span> <span className="text-ink-2">late</span>
          </p>
          <p className="mt-2">
            <Delta value={data.deltas.rate} unit=" pts" suffix="vs previous" />
          </p>
        </div>
      </div>
    </Card>
  )
}

function SlowestCard({ data }: { data: Insights }) {
  const people = usePeople()
  const first = (id: string) => people.find((p) => p.id === id)?.name.split(' ')[0]
  return (
    <Card title="Slowest open tasks" subtitle="Open the longest, oldest first">
      <ul>
        {data.slowest.map(({ task, ageDays }) => (
          <li key={task.id}>
            <Link to={`/tasks/${task.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-fill-hover">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{task.title}</span>
                <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-2">
                  <ProjectChip id={task.projectId} />
                  <Avatar id={task.assignee} size={18} /> {first(task.assignee)}
                </span>
              </span>
              <span
                className={cn(
                  'tabular shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold',
                  ageDays > 40 ? 'bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--prio-urgent)]' : 'bg-fill-2 text-ink-2',
                )}
              >
                {ageDays}d open
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function InsightsPage() {
  const [range, setRange] = useState<RangeDays>(30)
  const { tasks, projects, focusLog } = useWorkspace(useShallow((s) => ({ tasks: s.tasks, projects: s.projects, focusLog: s.focusLog })))
  const people = usePeople()
  const now = useNow(60_000)
  const today = dayKey(now)

  const data = useMemo(() => insights(range, tasks, projects, people, focusLog, now), [range, tasks, projects, people, focusLog, now])
  const labels = data.days.map((d) => fmtDate(d, range === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }))
  const fullLabels = data.days.map((d) => fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' }))

  const exportCsv = () => {
    const rows = data.days.map((d, i) => {
      const key = dayKey(d)
      const doneThatDay = data.cur.done.filter((t) => t.doneAt && dayKey(new Date(t.doneAt)) === key)
      return [key, data.cur.perDay[i], doneThatDay.filter((t) => key <= t.due).length, data.prev.perDay[i], data.cur.focusPerDay[i]]
    })
    downloadText(
      `foresign-insights-${range}d-${today}.csv`,
      toCsv([['Date', 'Tasks completed', 'Completed on time', `Completed ${range} days earlier`, 'Team focus hours'], ...rows]),
    )
  }

  return (
    <Page>
      <PageHeader
        title="Insights"
        subtitle={`How the team worked over the last ${range} days`}
        actions={
          <>
            <Segmented label="Range" size="md" value={String(range)} onChange={(v) => setRange(Number(v) as RangeDays)} options={RANGES} />
            <Button variant="glass" onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-[var(--gap)] sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Completed" value={data.cur.completed} delta={<Delta value={data.deltas.completed} unit="%" />} />
        <Kpi label="On-time rate" value={data.cur.rate} format={(n) => `${Math.round(n)}%`} delta={<Delta value={data.deltas.rate} unit=" pts" />} />
        <Kpi label="Focus hours" value={data.cur.focusH} unit="h" delta={<Delta value={data.deltas.focus} unit="%" />} />
        <Kpi
          label="Avg cycle time"
          value={data.cur.cycleDays}
          format={(n) => n.toFixed(1)}
          unit="d"
          delta={<Delta value={data.deltas.cycle} unit="d" goodWhenUp={false} />}
        />
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-12 [&>div>div]:h-full">
        <div className="min-w-0 xl:col-span-8">
          <ThroughputCard data={data} range={range} labels={labels} fullLabels={fullLabels} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <ByProjectCard data={data} />
        </div>
        <div className="min-w-0 xl:col-span-6">
          <FocusCard data={data} range={range} labels={labels} fullLabels={fullLabels} />
        </div>
        <div className="min-w-0 xl:col-span-6">
          <WorkloadCard data={data} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <OnTimeCard data={data} range={range} />
        </div>
        <div className="min-w-0 xl:col-span-8">
          <SlowestCard data={data} />
        </div>
      </div>

      <AgentSection range={range} labels={labels} fullLabels={fullLabels} now={now} />
    </Page>
  )
}
