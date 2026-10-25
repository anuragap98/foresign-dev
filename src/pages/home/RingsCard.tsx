import { Rings } from '@/components/charts/Rings'
import { Card } from '@/components/ui/card'
import { FOCUS_GOAL_MIN, type todayStats } from '@/lib/derive'
import { fmtHours } from '@/lib/time'

type Stats = ReturnType<typeof todayStats>

export function RingsCard({ stats, className }: { stats: Stats; className?: string }) {
  const rows = [
    { label: 'Tasks', color: 'var(--ring-tasks)', value: String(stats.tasksDone), of: String(stats.tasksTotal), ratio: stats.tasksDone / (stats.tasksTotal || 1) },
    { label: 'Focus', color: 'var(--ring-focus)', value: fmtHours(stats.focusMin), of: fmtHours(FOCUS_GOAL_MIN), ratio: stats.focusMin / FOCUS_GOAL_MIN },
    { label: 'Meetings', color: 'var(--ring-meet)', value: String(stats.meetingsDone), of: String(stats.meetingsTotal), ratio: stats.meetingsDone / (stats.meetingsTotal || 1) },
  ]

  return (
    <Card title="Today" subtitle="Close your rings" className={className} bodyClassName="flex items-center justify-center gap-8 py-2">
      <Rings rings={rows.map((r) => ({ label: r.label, value: r.ratio, color: r.color }))} />
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-stretch gap-3">
            <span className="w-[3px] rounded-full" style={{ background: r.color }} />
            <span>
              <span className="block text-[13px] text-ink-2">{r.label}</span>
              <span className="display tabular text-[22px] leading-tight font-bold">
                {r.value}
                <span className="ml-0.5 text-[13px] font-medium text-ink-3">/ {r.of}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
