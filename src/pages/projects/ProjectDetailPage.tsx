import { ArrowLeft, CalendarPlus, Check, ChevronDown, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BurnUp } from '@/components/charts/BurnUp'
import { Avatar, AvatarStack, PRESENCE_LABEL } from '@/components/ui/avatar'
import { PriorityBadge } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { PinButton, StatusPill } from '@/components/ui/project-bits'
import { ProjectIcon } from '@/components/ui/project-icon'
import { TaskCheck } from '@/components/ui/task-check'
import { STATUS_LABEL, type Project, type Status, type Task } from '@/data/types'
import { eventEnd, useNow } from '@/lib/derive'
import { burnup, projectHealth, relDays, sortedMilestones } from '@/lib/projects'
import { STATUS_TONE } from '@/lib/tasks'
import { dayKey, fmtDate, fmtDue, fmtTime, parseDay, relTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useActorsById } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { ProjectTimeline } from './ProjectTimeline'

function OverviewCard({ project: p, now }: { project: Project; now: Date }) {
  const peopleById = useActorsById()
  const lead = peopleById[p.lead]
  const members = [p.lead, ...p.members.filter((m) => m !== p.lead)]
  return (
    <Card title="Overview">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-tile bg-fill px-3.5 py-2.5">
          <p className="text-[12px] text-ink-2">Lead</p>
          <Link to={`/team/${p.lead}`} className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-accent-ink hover:underline">
            <Avatar id={p.lead} size={24} presence /> <span className="truncate">{lead?.name}</span>
          </Link>
        </div>
        <div className="rounded-tile bg-fill px-3.5 py-2.5">
          <p className="text-[12px] text-ink-2">Status</p>
          <div className="mt-1.5">
            <StatusPill status={p.status} />
          </div>
        </div>
      </div>

      <ProjectTimeline project={p} now={now} />

      <div className="mt-5 mb-1 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">People</h3>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{members.length}</span>
      </div>
      <ul>
        {members.map((id) => {
          const person = peopleById[id]
          if (!person) return null
          return (
            <li key={id}>
              <Link to={`/team/${id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-fill-hover">
                <Avatar id={id} size={32} presence />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{person.name}</span>
                  <span className="block truncate text-[12px] text-ink-2">
                    {id === p.lead ? 'Lead · ' : ''}
                    {PRESENCE_LABEL[person.presence]}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function MilestonesCard({ project: p, now }: { project: Project; now: Date }) {
  const toggleMilestone = useWorkspace((s) => s.toggleMilestone)
  const ms = sortedMilestones(p)
  const reached = ms.filter((m) => m.done).length
  const nextId = ms.find((m) => !m.done)?.id

  return (
    <Card title="Milestones" subtitle={ms.length ? `${reached} of ${ms.length} reached` : 'None yet'}>
      <ol className="relative">
        {ms.map((m, i) => (
          <li key={m.id} className="relative flex gap-3 pb-3 last:pb-0">
            {i < ms.length - 1 && (
              <span aria-hidden className={cn('absolute top-7 bottom-0 left-[11px] w-[2px] rounded-full', m.done ? 'bg-accent-ink' : 'bg-fill-2')} />
            )}
            <TaskCheck
              checked={m.done}
              onToggle={() => toggleMilestone(p.id, m.id)}
              label={`${m.done ? 'Reopen' : 'Complete'} milestone: ${m.title}`}
              size={24}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className={cn('text-[15px] font-semibold', m.done && 'text-ink-2')}>{m.title}</p>
              <p className="text-[12px] text-ink-3">
                {fmtDate(parseDay(m.date))} · {m.done ? 'Done' : relDays(m.date, now)}
              </p>
            </div>
            {m.id === nextId && (
              <span className="h-fit shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent-ink">Next</span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}

function ComingUpCard({ project: p, now }: { project: Project; now: Date }) {
  const events = useWorkspace((s) => s.events)
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.projectId === p.id && eventEnd(e) > now)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 4),
    [events, p.id, now],
  )

  return (
    <Card
      title="Coming up"
      action={
        <Button asChild variant="link" size="none" className="text-[14px]">
          <Link to="/calendar">Calendar</Link>
        </Button>
      }
    >
      {upcoming.length ? (
        <ul className="-mx-1">
          {upcoming.map((e) => {
            const d = new Date(e.start)
            return (
              <li key={e.id}>
                <Link to={`/calendar/${e.id}`} className="flex items-center gap-3 rounded-[16px] px-1 py-2 transition-colors hover:bg-fill-hover">
                  <span className={cn(`hue-${p.hue}`, 'flex w-12 shrink-0 flex-col items-center rounded-[12px] bg-[color-mix(in_srgb,var(--hue)_18%,transparent)] py-1.5')}>
                    <span className="text-[10px] font-bold tracking-[0.08em] text-[var(--hue)] uppercase">{fmtDate(d, { month: 'short' })}</span>
                    <span className="tabular text-[18px] leading-none font-bold">{d.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                    <span className="block truncate text-[12px] text-ink-2">
                      {dayKey(d) === dayKey(now) ? 'Today' : fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtTime(d)}
                      {e.place && ` · ${e.place}`}
                    </span>
                  </span>
                  {e.people.length > 1 && <AvatarStack ids={e.people} max={2} size={22} />}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="py-4 text-[14px] text-ink-3">Nothing on the calendar for this project.</p>
      )}
    </Card>
  )
}

function ActivityCard({ project: p, now }: { project: Project; now: Date }) {
  const activity = useWorkspace((s) => s.activity)
  const peopleById = useActorsById()
  const list = activity.filter((a) => a.projectId === p.id)
  return (
    <Card title="Recent activity">
      {list.length ? (
        <ul className="flex flex-col gap-3">
          {list.map((a) => (
            <li key={a.id} className="flex items-start gap-3">
              <Avatar id={a.who} size={30} />
              <span className="min-w-0 text-[14px] leading-snug">
                <span className="font-semibold">{peopleById[a.who]?.name.split(' ')[0]}</span> {a.text}
                <span className="block text-[12px] text-ink-3">{relTime(a.at, now.getTime())}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-4 text-[14px] text-ink-3">No activity yet.</p>
      )}
    </Card>
  )
}

const GROUPS: Status[] = ['todo', 'doing', 'review', 'done']

function TaskRow({ task, now }: { task: Task; now: Date }) {
  const toggleDone = useWorkspace((s) => s.toggleDone)
  const done = task.status === 'done'
  const late = !done && task.due < dayKey(now)
  return (
    <li className="flex items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-fill-hover">
      <TaskCheck checked={done} onToggle={() => toggleDone(task.id)} label={`Mark “${task.title}” ${done ? 'not done' : 'done'}`} size={20} />
      <Link to={`/tasks/${task.id}`} className={cn('min-w-0 flex-1 truncate text-[14px] font-medium hover:underline', done && 'text-ink-2 line-through')}>
        {task.title}
      </Link>
      {!done && <PriorityBadge priority={task.priority} />}
      <span className={cn('w-16 shrink-0 text-right text-[12px]', late ? 'font-semibold text-danger' : 'text-ink-2')}>{fmtDue(task.due, now)}</span>
      <Avatar id={task.assignee} size={22} />
    </li>
  )
}

function ProjectTasksCard({ project: p, now }: { project: Project; now: Date }) {
  const tasks = useWorkspace((s) => s.tasks)
  const newTask = useUi((s) => s.newTask)
  const [showDone, setShowDone] = useState(false)
  const mine = tasks.filter((t) => t.projectId === p.id)
  const open = mine.filter((t) => t.status !== 'done').length

  return (
    <Card
      title="Tasks"
      subtitle={`${open} open · ${mine.length - open} done`}
      action={
        <Button variant="gel" size="sm" onClick={() => newTask({ projectId: p.id })}>
          <Plus /> Add task
        </Button>
      }
    >
      {GROUPS.map((status) => {
        const list = mine.filter((t) => t.status === status).sort((a, b) => a.due.localeCompare(b.due))
        const isDone = status === 'done'
        if (!list.length && isDone) return null
        return (
          <section key={status} className="border-t border-sep py-2 first:border-t-0 first:pt-0">
            <h3 className="flex items-center gap-2 px-1 py-1.5 text-[14px] font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: STATUS_TONE[status] }} />
              {STATUS_LABEL[status]}
              <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] text-ink-2">{list.length}</span>
              {isDone && (
                <Button variant="ghost" size="sm" className="ml-auto h-7" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
                  {showDone ? 'Hide' : 'Show'}
                  <ChevronDown className={cn('transition-transform', showDone && 'rotate-180')} />
                </Button>
              )}
            </h3>
            {(!isDone || showDone) &&
              (list.length ? (
                <ul>
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} />
                  ))}
                </ul>
              ) : (
                <p className="px-1 pb-1 text-[13px] text-ink-3">Nothing here.</p>
              ))}
          </section>
        )
      })}
    </Card>
  )
}

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const project = useWorkspace((s) => s.projects.find((p) => p.id === projectId))
  const tasks = useWorkspace((s) => s.tasks)
  const newEvent = useUi((s) => s.newEvent)
  const now = useNow(60_000)

  const health = useMemo(() => project && projectHealth(project, tasks, now), [project, tasks, now])
  const points = useMemo(() => (project ? burnup(project, tasks, now) : []), [project, tasks, now])

  if (!project || !health) {
    return (
      <Page>
        <PageHeader title="Project not found" subtitle="It may have been removed or the link is wrong." />
        <Button asChild variant="glass" className="w-fit">
          <Link to="/projects">
            <ArrowLeft /> All projects
          </Link>
        </Button>
      </Page>
    )
  }

  const shipped = project.status === 'shipped'

  return (
    <Page>
      <div className="flex flex-wrap items-start gap-4">
        <Button asChild variant="glass" size="icon" className="mt-2 size-10 shrink-0">
          <Link to="/projects" aria-label="Back to projects">
            <ArrowLeft />
          </Link>
        </Button>
        <span data-enter>
          <ProjectIcon icon={project.icon} hue={project.hue} size={60} />
        </span>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={project.name}
            subtitle={project.summary}
            actions={
              <>
                <PinButton project={project} withLabel />
                <Button variant="glass" onClick={() => newEvent({ projectId: project.id })}>
                  <CalendarPlus /> New event
                </Button>
              </>
            }
          />
        </div>
      </div>

      <StatRow
        stats={[
          { label: 'Progress', value: health.pct, format: (n) => `${Math.round(n)}%` },
          { label: 'Open tasks', value: health.total - health.done },
          { label: 'Done', value: health.done },
          shipped ? { label: 'Shipped', value: 0, format: () => fmtDate(parseDay(project.due)) } : { label: 'Days left', value: health.daysLeft },
        ]}
      />

      <div className="grid items-start gap-[var(--gap)] xl:grid-cols-12">
        <div className="flex flex-col gap-[var(--gap)] xl:col-span-5">
          <OverviewCard project={project} now={now} />
          <MilestonesCard project={project} now={now} />
          <ComingUpCard project={project} now={now} />
          <ActivityCard project={project} now={now} />
        </div>
        <div className="flex flex-col gap-[var(--gap)] xl:col-span-7">
          <Card id={`burnup-${project.id}`} expandable title="Burn-up" subtitle="Tasks done against the total, over the project’s life">
            <BurnUp points={points} />
            {!shipped && (
              <p className={cn('mt-2 flex items-center gap-1.5 text-[13px]', health.onTrack ? 'text-[var(--delta-up)]' : 'text-[var(--prio-high)]')}>
                {health.onTrack && <Check className="size-4" />}
                {health.onTrack
                  ? `On track: ${health.pct}% done with ${Math.round(health.expected * 100)}% of the time used`
                  : `Behind: ${health.pct}% done with ${Math.round(health.expected * 100)}% of the time used`}
              </p>
            )}
          </Card>
          <ProjectTasksCard project={project} now={now} />
        </div>
      </div>
    </Page>
  )
}
