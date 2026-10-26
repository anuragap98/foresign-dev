import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { LiveDot } from '@/components/ui/live-dot'
import type { Run } from '@/data/types'
import { fmtCost, fmtDuration, isLive, RUN_STATUS_LABEL, RUN_STATUS_TONE, runMs, subtree, totals } from '@/lib/runs'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useActorsById } from '@/store/people'
import { useWorkspace } from '@/store/workspace'

interface TreeProps {
  roots: Run[]
  childMap: Map<string, Run[]>
  selected?: string
  now: number
  onSelect: (id: string) => void
}

function RunRow({ run, depth, childMap, selected, now, onSelect, open, onToggle }: {
  run: Run
  depth: number
  childMap: Map<string, Run[]>
  selected?: string
  now: number
  onSelect: (id: string) => void
  open: boolean
  onToggle?: () => void
}) {
  const actors = useActorsById()
  const task = useWorkspace((s) => (run.taskId ? s.tasks.find((t) => t.id === run.taskId) : undefined))
  const agent = actors[run.agentId]
  const kids = childMap.get(run.id) ?? []
  // A top-level row shows what the whole tree cost.
  const cost = depth === 0 ? totals(subtree(run, childMap)).cost : run.costUsd
  const active = selected === run.id

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-[16px] py-2 pr-2.5 transition-colors',
        active ? 'bg-accent-soft' : 'hover:bg-fill-hover',
      )}
      style={{ paddingLeft: 8 + depth * 22 }}
    >
      {depth > 0 && <span aria-hidden className="absolute top-0 bottom-0 w-px bg-sep" style={{ left: 8 + (depth - 1) * 22 + 13 }} />}
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${open ? 'Hide' : 'Show'} ${kids.length} sub-agent run${kids.length === 1 ? '' : 's'}`}
          aria-expanded={open}
          className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-fill-2 hover:text-ink"
        >
          <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
      <Avatar id={run.agentId} size={depth ? 24 : 30} />
      <button
        type="button"
        onClick={() => onSelect(run.id)}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:rounded-[16px] focus-visible:after:shadow-[0_0_0_2px_var(--accent-ink)]"
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold">{agent?.name ?? 'Agent'}</span>
          <LiveDot color={RUN_STATUS_TONE[run.status]} live={isLive(run)} />
          <span className="sr-only">{RUN_STATUS_LABEL[run.status]}</span>
        </span>
        <span className="block truncate text-[12px] text-ink-2">{task?.title ?? (run.summary || RUN_STATUS_LABEL[run.status])}</span>
      </button>
      <span className="tabular shrink-0 text-right text-[12px] leading-tight text-ink-2">
        <span className="block font-semibold text-ink">{fmtCost(cost)}</span>
        <span className="block">{isLive(run) ? fmtDuration(runMs(run, now)) : relTime(run.startedAt, now)}</span>
      </span>
    </div>
  )
}

function Branch({ run, depth, ...rest }: Omit<TreeProps, 'roots'> & { run: Run; depth: number }) {
  const kids = rest.childMap.get(run.id) ?? []
  const holdsSelected = !!rest.selected && kids.some((k) => subtree(k, rest.childMap).some((r) => r.id === rest.selected))
  const [open, setOpen] = useState(depth === 0 ? isLive(run) || holdsSelected : true)
  const shown = open || holdsSelected

  return (
    <li>
      <RunRow run={run} depth={depth} open={shown} onToggle={kids.length ? () => setOpen(!shown) : undefined} {...rest} />
      {kids.length > 0 && shown && (
        <ul>
          {kids.map((k) => (
            <Branch key={k.id} run={k} depth={depth + 1} {...rest} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Top-level runs with their sub-agent runs nested under them. */
export function RunTree({ roots, ...rest }: TreeProps) {
  if (!roots.length) return <p className="py-8 text-center text-[14px] text-ink-3">No runs match. Connect an agent from a project to see its work here.</p>
  return (
    <ul className="-mx-1 flex flex-col gap-0.5">
      {roots.map((r) => (
        <Branch key={r.id} run={r} depth={0} {...rest} />
      ))}
    </ul>
  )
}
