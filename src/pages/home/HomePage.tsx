import { Plus, Video } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { ME } from '@/lib/session'
import { eventEnd, eventsOn, todayStats, useNow } from '@/lib/derive'
import { fmtDate, fmtHours, fmtTime, greeting } from '@/lib/time'
import { usePerson } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { FocusCard } from './FocusCard'
import { MyTasksCard } from './MyTasksCard'
import { ProjectsCard } from './ProjectsCard'
import { RightNowCard } from './RightNowCard'
import { RingsCard } from './RingsCard'
import { UpNextCard } from './UpNextCard'
import { WeekCard } from './WeekCard'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function HomePage() {
  const { tasks, events, focusLog } = useWorkspace(useShallow((s) => ({ tasks: s.tasks, events: s.events, focusLog: s.focusLog })))
  const newTask = useUi((s) => s.newTask)
  const navigate = useNavigate()
  const now = useNow(30_000)

  const stats = useMemo(() => todayStats(tasks, events, focusLog, now), [tasks, events, focusLog, now])
  const next = useMemo(
    () => eventsOn(events, now).find((e) => e.people.includes(ME) && e.kind !== 'focus' && eventEnd(e) > now),
    [events, now],
  )
  const firstName = usePerson(ME)!.name.split(' ')[0]

  return (
    <Page>
      <PageHeader
        title={`${greeting(now)}, ${firstName}`}
        subtitle={`${fmtDate(now, { weekday: 'long', month: 'long', day: 'numeric' })} · ${plural(stats.meetingsLeft, 'meeting')} and ${plural(stats.tasksLeft, 'task')} left today`}
        actions={
          <>
            <Button variant="glass" onClick={() => newTask()}>
              <Plus /> New task
            </Button>
            {next && (
              <Button variant="gel" onClick={() => navigate('/calendar')}>
                <Video /> Next: {fmtTime(next.start)}
              </Button>
            )}
          </>
        }
      />

      <StatRow
        stats={[
          { label: 'Done today', value: stats.tasksDone, suffix: `/ ${stats.tasksTotal}` },
          { label: 'Focus today', value: stats.focusMin, format: fmtHours },
          { label: 'Overdue', value: stats.overdue },
        ]}
      />

      <div className="grid grid-cols-1 gap-[var(--gap)] lg:grid-cols-2 xl:grid-cols-12">
        <RingsCard stats={stats} className="xl:col-span-4" />
        <FocusCard focusMin={stats.focusMin} sessions={stats.focusSessions} className="xl:col-span-4" />
        <MyTasksCard className="lg:row-span-2 xl:col-span-4" />
        <UpNextCard className="xl:col-span-4" />
        <WeekCard className="xl:col-span-4" />
        <ProjectsCard className="lg:col-span-2 xl:col-span-7" />
        <RightNowCard className="lg:col-span-2 xl:col-span-5" />
      </div>
    </Page>
  )
}
