import { Mail, Moon, SquarePen, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ProgressRing } from '@/components/charts/Rings'
import { Avatar, PRESENCE_LABEL } from '@/components/ui/avatar'
import { HueChip, PriorityBadge, ProjectChip } from '@/components/ui/badges'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/dialog'
import { ProjectIcon } from '@/components/ui/project-icon'
import { ME } from '@/data/seed'
import type { Person } from '@/data/types'
import { isToday, useNow } from '@/lib/derive'
import { addDays, dayKey, fmtDate, fmtDue, fmtTime, startOfWeek } from '@/lib/time'
import { localClock, PRESENCE_TONE, TEAM_HUE, workload } from '@/lib/team'
import { usePerson } from '@/store/settings'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <span className="tabular rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2">{count}</span>
      </div>
      {children}
    </section>
  )
}

function ProfileBody({ person: p }: { person: Person }) {
  const { tasks, events, projects, focusLog } = useWorkspace()
  const now = useNow(30_000)
  const clock = localClock(p, now)
  const load = workload(p, tasks)

  const week = useMemo(() => {
    const from = startOfWeek(now)
    const to = addDays(from, 7)
    return events
      .filter((e) => e.people.includes(p.id) && new Date(e.start) >= from && new Date(e.start) < to)
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [events, p.id, now])

  const theirProjects = projects.filter((pr) => pr.lead === p.id || pr.members.includes(p.id))
  const focusH =
    p.id === ME
      ? Math.round(focusLog.filter((f) => new Date(f.start) >= startOfWeek(now)).reduce((s, f) => s + f.minutes, 0) / 6) / 10
      : p.focusWeekH

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar id={p.id} size={72} presence />
        <div className="min-w-0">
          <p className="text-[15px] text-ink-2">{p.role}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <HueChip hue={TEAM_HUE[p.team]}>{p.team}</HueChip>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
              <i className="size-2 rounded-full" style={{ background: PRESENCE_TONE[p.presence] }} />
              {PRESENCE_LABEL[p.presence]}
              {p.presenceNote && p.presence !== 'online' && ` · ${p.presenceNote}`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <div className="min-w-0 rounded-tile bg-fill px-3.5 py-2.5">
          <p className="text-[12px] text-ink-2">Email</p>
          <a href={`mailto:${p.email}`} className="mt-1 flex items-center gap-1.5 truncate text-[14px] font-semibold text-accent-ink hover:underline">
            <Mail className="size-4 shrink-0" /> {p.email}
          </a>
        </div>
        <div className="rounded-tile bg-fill px-3.5 py-2.5">
          <p className="text-[12px] text-ink-2">Local time</p>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold">
            {clock.daytime ? <Sun className="size-4 text-[var(--yellow)]" /> : <Moon className="size-4 text-[var(--indigo)]" />}
            <span className="tabular">{clock.time}</span> · {p.city}
          </p>
          <p className="text-[12px] text-ink-3">{clock.relative}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-5 rounded-[20px] bg-fill p-4">
        <ProgressRing value={load.ratio} size={84} stroke={8} color={load.tone}>
          <span className="text-center leading-tight">
            <span className="tabular block text-[18px] font-bold">{load.pct}%</span>
            <span className="block text-[11px] text-ink-2">load</span>
          </span>
        </ProgressRing>
        <dl className="grid flex-1 grid-cols-[1fr_auto] gap-y-1.5 text-[14px]">
          <dt className="text-ink-2">Workload</dt>
          <dd className="tabular text-right font-semibold">
            {load.hours}h <span className="font-normal text-ink-3">of {p.capacityH}h</span>
          </dd>
          <dt className="text-ink-2">Focus this week</dt>
          <dd className="tabular text-right font-semibold">{focusH}h</dd>
          <dt className="text-ink-2">Open tasks</dt>
          <dd className="tabular text-right font-semibold">{load.open.length}</dd>
        </dl>
      </div>

      <Section title="Open tasks" count={load.open.length}>
        {load.open.length ? (
          <ul>
            {load.open
              .sort((a, b) => a.due.localeCompare(b.due))
              .map((t) => (
                <li key={t.id}>
                  <Link to={`/tasks/${t.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-2 transition-colors hover:bg-fill-hover">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{t.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        {fmtDue(t.due, now)} <ProjectChip id={t.projectId} />
                      </span>
                    </span>
                    <PriorityBadge priority={t.priority} />
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">Nothing open. A good time to hand them something.</p>
        )}
      </Section>

      <Section title="This week" count={week.length}>
        {week.length ? (
          <ul>
            {week.map((e) => {
              const d = new Date(e.start)
              return (
                <li key={e.id}>
                  <Link to={`/calendar/${e.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-fill-hover">
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-[11px] bg-fill py-1">
                      <span className="text-[10px] font-bold text-ink-3 uppercase">{fmtDate(d, { weekday: 'short' })}</span>
                      <span className="tabular text-[16px] leading-none font-bold">{d.getDate()}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{e.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {isToday(e.start, now) ? 'Today' : fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtTime(d)}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">No meetings this week.</p>
        )}
      </Section>

      <Section title="Projects" count={theirProjects.length}>
        <ul>
          {theirProjects.map((pr) => (
            <li key={pr.id}>
              <Link to={`/projects/${pr.id}`} className="flex items-center gap-3 rounded-[14px] px-1 py-1.5 transition-colors hover:bg-fill-hover">
                <ProjectIcon icon={pr.icon} hue={pr.hue} size={30} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{pr.name}</span>
                <span className="text-[12px] text-ink-3">{pr.lead === p.id ? 'Lead' : 'Member'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

export function ProfileDrawer({ personId }: { personId?: string }) {
  const person = usePerson(personId ?? '')
  const newTask = useUi((s) => s.newTask)
  const navigate = useNavigate()

  // Keep showing the last person while the drawer slides out.
  const [shown, setShown] = useState<Person | undefined>(person)
  if (person && person !== shown) setShown(person)
  if (!shown) return null

  const first = shown.name.split(' ')[0]

  return (
    <Drawer
      open={!!person}
      onOpenChange={(o) => !o && navigate('/team')}
      title={shown.name}
      footer={
        <>
          <Button asChild variant="soft">
            <a href={`mailto:${shown.email}`}>
              <Mail /> Email {shown.id === ME ? '' : first}
            </a>
          </Button>
          <Button variant="gel" className="ml-auto" onClick={() => newTask({ assignee: shown.id, due: dayKey(addDays(new Date(), 2)) })}>
            <SquarePen /> {shown.id === ME ? 'New task' : `Assign to ${first}`}
          </Button>
        </>
      }
    >
      <ProfileBody person={shown} />
    </Drawer>
  )
}
