import { Plus } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { useNow } from '@/lib/derive'
import { Flip, gsap, prefersReducedMotion } from '@/lib/gsap'
import { matchesProjectFilter, projectHealth, type ProjectFilter } from '@/lib/projects'
import { parseDay } from '@/lib/time'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { ProjectCard } from './ProjectCard'

export function ProjectsPage() {
  const projects = useWorkspace((s) => s.projects)
  const tasks = useWorkspace((s) => s.tasks)
  const openDialog = useUi((s) => s.openDialog)
  const now = useNow(60_000)
  const [filter, setFilter] = useState<ProjectFilter>('all')
  const grid = useRef<HTMLDivElement>(null)
  const flip = useRef<Flip.FlipState | null>(null)

  const stats = useMemo(() => {
    const live = projects.filter((p) => p.status !== 'shipped')
    const active = projects.filter((p) => matchesProjectFilter(p, 'active'))
    const onTrack = active.filter((p) => projectHealth(p, tasks, now).onTrack).length
    const dueThisMonth = live.filter((p) => {
      const d = parseDay(p.due)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    return {
      active: active.length,
      planning: projects.filter((p) => p.status === 'planning').length,
      shipped: projects.filter((p) => p.status === 'shipped').length,
      onTrack: active.length ? Math.round((onTrack / active.length) * 100) : 0,
      dueThisMonth,
    }
  }, [projects, tasks, now])

  // Pinned first, shipped last, otherwise soonest due.
  const shippedLast = (p: (typeof projects)[number]) => Number(p.status === 'shipped')
  const visible = projects
    .filter((p) => matchesProjectFilter(p, filter))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || shippedLast(a) - shippedLast(b) || a.due.localeCompare(b.due))

  const changeFilter = (f: ProjectFilter) => {
    if (grid.current && !prefersReducedMotion()) flip.current = Flip.getState(grid.current.children)
    setFilter(f)
  }

  // Cards that stay glide to their new spots; new ones fade up.
  useLayoutEffect(() => {
    const state = flip.current
    if (!state || !grid.current) return
    flip.current = null
    Flip.from(state, {
      targets: grid.current.children,
      duration: 0.5,
      ease: 'power3.inOut',
      onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.4, delay: 0.1, ease: 'power2.out' }),
    })
  }, [filter])

  return (
    <Page>
      <PageHeader
        title="Projects"
        subtitle={`${stats.active + stats.planning} in flight · ${stats.shipped} shipped`}
        actions={
          <>
            <Segmented
              label="Show"
              size="md"
              value={filter}
              onChange={changeFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'planning', label: 'Planning' },
                { value: 'shipped', label: 'Shipped' },
              ]}
            />
            <Button variant="gel" onClick={() => openDialog('project')}>
              <Plus /> New project
            </Button>
          </>
        }
      />

      <StatRow
        stats={[
          { label: 'Active', value: stats.active },
          { label: 'Shipped', value: stats.shipped },
          { label: 'On track', value: stats.onTrack, format: (n) => `${Math.round(n)}%` },
          { label: 'Due this month', value: stats.dueThisMonth },
        ]}
      />

      <div ref={grid} className="grid gap-[var(--gap)] md:grid-cols-2 2xl:grid-cols-3">
        {visible.map((p) => (
          <ProjectCard key={p.id} project={p} tasks={tasks} now={now} />
        ))}
      </div>
      {visible.length === 0 && <p className="py-12 text-center text-[15px] text-ink-2">No projects here yet.</p>}
    </Page>
  )
}
