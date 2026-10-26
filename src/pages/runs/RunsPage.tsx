import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { Card } from '@/components/ui/card'
import { Drawer } from '@/components/ui/dialog'
import { Select } from '@/components/ui/field'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import type { Run } from '@/data/types'
import { useNow } from '@/lib/derive'
import { childrenOf, fmtCost, isLive, subtree } from '@/lib/runs'
import { DAY } from '@/lib/time'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useWorkspace } from '@/store/workspace'
import { RunDetail } from './RunDetail'
import { RunTree } from './RunTree'

type Show = 'all' | 'live' | 'failed'

export function RunsPage() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const { runs, projects } = useWorkspace(useShallow((s) => ({ runs: s.runs, projects: s.projects })))
  const wide = useMediaQuery('(min-width: 1280px)')
  const [project, setProject] = useState('all')
  const [show, setShow] = useState<Show>('all')
  const nowDate = useNow(runs.some(isLive) ? 2000 : 60_000)
  const now = nowDate.getTime()

  const children = useMemo(() => childrenOf(runs), [runs])
  const byId = useMemo(() => new Map(runs.map((r) => [r.id, r])), [runs])

  const roots = useMemo(() => {
    const keep = (r: Run) => {
      const tree = subtree(r, children)
      if (show === 'live') return tree.some(isLive)
      if (show === 'failed') return tree.some((x) => x.status === 'failed')
      return true
    }
    return runs
      .filter((r) => !r.parentRunId || !byId.has(r.parentRunId))
      .filter((r) => project === 'all' || r.projectId === project)
      .filter(keep)
      .sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || b.startedAt.localeCompare(a.startedAt))
  }, [runs, children, byId, project, show])

  const week = runs.filter((r) => now - new Date(r.startedAt).getTime() < 7 * DAY)
  const ended = week.filter((r) => r.status === 'succeeded' || r.status === 'failed')
  const success = ended.length ? Math.round((ended.filter((r) => r.status === 'succeeded').length / ended.length) * 100) : 0

  const selected = runId ? byId.get(runId) : undefined
  const select = (id: string) => navigate(`/runs/${id}`)
  const withRuns = projects.filter((p) => runs.some((r) => r.projectId === p.id))

  return (
    <Page>
      <PageHeader
        title="Runs"
        subtitle="What agents did, step by step, and what it cost"
        actions={
          <>
            <Select
              aria-label="Project"
              value={project}
              onValueChange={setProject}
              className="h-10 w-48 rounded-full"
              options={[{ value: 'all', label: 'All projects' }, ...withRuns.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Segmented
              label="Show"
              size="md"
              value={show}
              onChange={setShow}
              options={[
                { value: 'all', label: 'All' },
                { value: 'live', label: 'Live' },
                { value: 'failed', label: 'Failed' },
              ]}
            />
          </>
        }
      />

      <StatRow
        stats={[
          { label: 'Live now', value: runs.filter(isLive).length },
          { label: 'Runs, 7 days', value: week.length },
          { label: 'Spend, 7 days', value: week.reduce((s, r) => s + r.costUsd, 0), format: fmtCost },
          { label: 'Success rate', value: success, format: (n) => (ended.length ? `${Math.round(n)}%` : '–') },
        ]}
      />

      <div className="grid items-start gap-[var(--gap)] xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <Card title="Run tree" subtitle={`${roots.length} top-level run${roots.length === 1 ? '' : 's'}`}>
            <RunTree roots={roots} childMap={children} selected={runId} now={now} onSelect={select} />
          </Card>
        </div>
        {wide && (
          <div className="min-w-0 xl:sticky xl:top-4 xl:col-span-7">
            <Card title={selected ? 'Run' : 'Pick a run'}>
              {selected ? (
                <RunDetail run={selected} now={now} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-12 text-center text-ink-3">
                  <Activity className="size-8" />
                  <p className="text-[14px]">Choose a run to see its trace, cost and artifacts.</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {!wide && (
        <Drawer
          open={!!selected}
          onOpenChange={(o) => !o && navigate('/runs')}
          title="Run details"
          className="w-[min(640px,calc(100vw-24px))]"
        >
          {selected && <RunDetail run={selected} now={now} />}
        </Drawer>
      )}
    </Page>
  )
}
