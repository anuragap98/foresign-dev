import { useMemo } from 'react'
import { WeekBars } from '@/components/charts/WeekBars'
import { Card } from '@/components/ui/card'
import { CountUp } from '@/components/ui/count-up'
import { useNow, weekThroughput } from '@/lib/derive'
import { fmtDate } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'

export function WeekCard({ className }: { className?: string }) {
  const tasks = useWorkspace((s) => s.tasks)
  const now = useNow(60_000)
  const week = useMemo(() => weekThroughput(tasks, now), [tasks, now])

  return (
    <Card id="home-week" expandable title="This week" subtitle="Tasks the team finished" className={className} bodyClassName="flex flex-col gap-3">
      <p className="flex items-baseline gap-2">
        <span className="display tabular text-[28px] leading-none font-bold">
          <CountUp value={week.total} />
        </span>
        <span className="text-[13px] text-ink-2">finished so far</span>
        <span className={cn('text-[13px] font-semibold', week.delta >= 0 ? 'text-[var(--delta-up)]' : 'text-[var(--delta-down)]')}>
          {week.delta >= 0 ? '+' : ''}
          {week.delta}% vs last week
        </span>
      </p>
      <WeekBars
        className="flex-1"
        labels={week.days.map((d) => fmtDate(d, { weekday: 'short' }))}
        values={week.counts}
        highlight={week.todayIndex}
      />
    </Card>
  )
}
