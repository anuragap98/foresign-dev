import { useMemo, useState } from 'react'
import { Segmented } from '@/components/ui/segmented'
import type { Run, RunEvent } from '@/data/types'
import { EVENT_LIMIT, useRunEvents } from '@/lib/api/runs'
import { EVENT_LABEL, EVENT_TONE, fmtDuration, isLive, runEnd } from '@/lib/runs'
import { fmtTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useActorsById } from '@/store/people'

type View = 'timeline' | 'log'

const ms = (iso: string) => new Date(iso).getTime()

function Detail({ e, lane }: { e: RunEvent; lane?: string }) {
  return (
    <div className="mt-1 mb-2 rounded-[12px] bg-fill px-3 py-2 text-[12px] text-ink-2">
      <p>
        {EVENT_LABEL[e.type]} · {fmtTime(e.ts)}
        {e.durationMs !== undefined && ` · took ${fmtDuration(e.durationMs)}`}
        {e.tokens ? ` · ${e.tokens.toLocaleString()} tokens` : ''}
        {lane && ` · ${lane}`}
      </p>
      {e.detail && <p className="mt-1 font-mono text-[12px] break-all whitespace-pre-wrap text-ink">{e.detail}</p>}
    </div>
  )
}

/** Waterfall: one row per step, placed on the run's clock; sub-agents get their own lane. */
function Timeline({ events, runs, now }: { events: RunEvent[]; runs: Run[]; now: number }) {
  const actors = useActorsById()
  const [open, setOpen] = useState<number | null>(null)
  const start = Math.min(ms(runs[0].startedAt), ...events.map((e) => ms(e.ts)))
  const end = Math.max(runEnd(runs[0], now), ...events.map((e) => ms(e.ts) + (e.durationMs ?? 0)), start + 1000)
  const span = end - start
  const at = (t: number) => ((t - start) / span) * 100
  const lanes = runs.filter((r) => events.some((e) => e.runId === r.id))
  const many = lanes.length > 1

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,38%)_1fr] gap-3 border-b border-sep pb-1.5 text-[11px] text-ink-3 sm:grid-cols-[220px_1fr]">
        <span>Step</span>
        <span className="relative h-4">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f} className="tabular absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full" style={{ left: `${f * 100}%` }}>
              {f ? `+${fmtDuration(span * f)}` : 'Start'}
            </span>
          ))}
        </span>
      </div>
      {lanes.map((lane) => (
        <section key={lane.id} aria-label={`Steps by ${actors[lane.agentId]?.name ?? 'agent'}`}>
          {many && <h4 className="pt-2.5 pb-1 text-[12px] font-semibold text-ink-2">{actors[lane.agentId]?.name ?? 'Agent'}</h4>}
          <ul>
            {events
              .filter((e) => e.runId === lane.id)
              .map((e) => {
                const left = at(ms(e.ts))
                const width = e.durationMs ? Math.max(0.6, (e.durationMs / span) * 100) : 0
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(open === e.id ? null : e.id)}
                      aria-expanded={open === e.id}
                      className="grid w-full grid-cols-[minmax(0,38%)_1fr] items-center gap-3 rounded-[8px] py-[3px] text-left hover:bg-fill-hover sm:grid-cols-[220px_1fr]"
                    >
                      <span className={cn('flex min-w-0 items-center gap-1.5 text-[12px]', e.type === 'error' && 'font-semibold text-danger')}>
                        <i className="size-2 shrink-0 rounded-[3px]" style={{ background: EVENT_TONE[e.type] }} />
                        <span className="truncate">{e.name}</span>
                      </span>
                      <span className="relative h-3.5 rounded-full bg-fill">
                        {width ? (
                          <span
                            className="absolute top-0 h-full rounded-full"
                            style={{ left: `${Math.min(left, 100 - width)}%`, width: `${width}%`, background: EVENT_TONE[e.type] }}
                          />
                        ) : (
                          <span
                            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]"
                            style={{ left: `${left}%`, background: EVENT_TONE[e.type] }}
                          />
                        )}
                      </span>
                    </button>
                    {open === e.id && <Detail e={e} lane={many ? actors[lane.agentId]?.name : undefined} />}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Log({ events, runs }: { events: RunEvent[]; runs: Run[] }) {
  const actors = useActorsById()
  const [open, setOpen] = useState<number | null>(null)
  const agentOf = useMemo(() => new Map(runs.map((r) => [r.id, actors[r.agentId]?.name ?? 'Agent'])), [runs, actors])
  const many = runs.length > 1
  return (
    <ol className="flex flex-col">
      {events.map((e) => (
        <li key={e.id} className="border-b border-sep last:border-b-0">
          <button
            type="button"
            onClick={() => setOpen(open === e.id ? null : e.id)}
            aria-expanded={open === e.id}
            className="grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-3 py-2 text-left hover:bg-fill-hover"
          >
            <span className="tabular pt-px text-[12px] text-ink-3">{fmtTime(e.ts)}</span>
            <span className="min-w-0">
              <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', e.type === 'error' && 'text-danger')}>
                <i className="size-2 shrink-0 rounded-[3px]" style={{ background: EVENT_TONE[e.type] }} />
                <span className="truncate">{e.name}</span>
              </span>
              <span className="block truncate text-[12px] text-ink-2">
                {many && `${agentOf.get(e.runId)} · `}
                {e.detail ?? EVENT_LABEL[e.type]}
              </span>
            </span>
            <span className="tabular pt-px text-[12px] text-ink-2">{e.durationMs !== undefined ? fmtDuration(e.durationMs) : ''}</span>
          </button>
          {open === e.id && <Detail e={e} />}
        </li>
      ))}
    </ol>
  )
}

/** A run's steps (and its sub-agents'), as a waterfall or a log. Live while the run is. */
export function Trace({ runs, now }: { runs: Run[]; now: number }) {
  const [view, setView] = useState<View>('timeline')
  const live = runs.some(isLive)
  const { data: events, isLoading, error } = useRunEvents(runs.map((r) => r.id), live)

  return (
    <section aria-label="Trace">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold">
          Trace
          {events && <span className="tabular ml-2 rounded-full bg-fill-2 px-2 py-px text-[12px] text-ink-2">{events.length}</span>}
        </h3>
        <Segmented
          label="Trace view"
          value={view}
          onChange={setView}
          options={[
            { value: 'timeline', label: 'Timeline' },
            { value: 'log', label: 'Log' },
          ]}
        />
      </div>
      {isLoading ? (
        <p className="py-6 text-center text-[13px] text-ink-3">Loading steps…</p>
      ) : error ? (
        <p className="py-6 text-center text-[13px] text-danger">{error.message}</p>
      ) : !events?.length ? (
        <p className="py-6 text-center text-[13px] text-ink-3">No steps recorded. Claude Code hooks trace them automatically; other agents can use log_step.</p>
      ) : (
        <>
          {events.length >= EVENT_LIMIT && <p className="mb-2 text-[12px] text-ink-3">Showing the latest {EVENT_LIMIT} steps.</p>}
          {view === 'timeline' ? <Timeline events={events} runs={runs} now={now} /> : <Log events={events} runs={runs} />}
        </>
      )}
    </section>
  )
}
