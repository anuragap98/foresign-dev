import { Pause, Play, Square } from 'lucide-react'
import { useMemo } from 'react'
import { ProgressRing } from '@/components/charts/Rings'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { ME } from '@/lib/session'
import { FOCUS_GOAL_MIN, useNow } from '@/lib/derive'
import { fmtClock, fmtHours, MIN } from '@/lib/time'
import { cn } from '@/lib/utils'
import { focusLeft, useFocus } from '@/store/focus'
import { useSettings } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'


export function FocusCard({ focusMin, sessions, className }: { focusMin: number; sessions: number; className?: string }) {
  const focus = useFocus()
  const tasks = useWorkspace((s) => s.tasks)
  const now = useNow(500)
  const sessionMin = useSettings((s) => s.sessionMin)
  // The usual presets plus your own session length from Settings.
  const presets = [...new Set([15, 25, 50, sessionMin])].sort((a, b) => a - b).map(String)
  const myOpen = useMemo(() => tasks.filter((t) => t.assignee === ME && t.status !== 'done'), [tasks])

  const idle = focus.phase === 'idle'
  const left = focusLeft(focus, now.getTime())
  const progress = idle ? 0 : 1 - left / (focus.minutes * MIN)
  const taskTitle = tasks.find((t) => t.id === focus.taskId)?.title
  const preset = presets.find((p) => Number(p) === focus.minutes) ?? String(sessionMin)

  return (
    <Card
      title="Focus"
      subtitle="The island keeps the time"
      className={className}
      action={
        <Segmented
          label="Session length"
          value={preset}
          onChange={(v) => focus.setMinutes(Number(v))}
          options={presets.map((p) => ({ value: p, label: `${p}m` }))}
          className={cn(!idle && 'pointer-events-none opacity-50')}
        />
      }
      bodyClassName="flex flex-col gap-4"
    >
      <div className="flex items-center gap-5">
        <ProgressRing value={progress} size={116} stroke={7} color="var(--timer)">
          <span className="text-center">
            <span className={cn('display tabular block text-[28px] leading-none font-bold', !idle && 'text-[var(--timer)]')}>
              {fmtClock(left)}
            </span>
            <span className="mt-1 block text-[12px] text-ink-2">
              {idle ? 'Ready' : focus.phase === 'paused' ? 'Paused' : 'Focusing'}
            </span>
          </span>
        </ProgressRing>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {idle ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-ink-2">Focus on</span>
                <Select
                  aria-label="Focus on"
                  value={focus.taskId ?? 'none'}
                  onValueChange={(v) => focus.setTask(v === 'none' ? null : v)}
                  options={[{ value: 'none', label: 'No task — just focus' }, ...myOpen.map((t) => ({ value: t.id, label: t.title }))]}
                />
              </label>
              <Button variant="gel" size="lg" className="w-full" onClick={() => focus.start()}>
                <Play className="fill-current" /> Start focus
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-[13px] text-ink-2">Focusing on</p>
                <p className="truncate text-[16px] font-semibold">{taskTitle ?? `${focus.minutes}-minute block`}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={focus.phase === 'paused' ? focus.resume : focus.pause}>
                  {focus.phase === 'paused' ? <Play /> : <Pause />}
                  {focus.phase === 'paused' ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={focus.end}>
                  <Square /> End
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[18px] bg-fill px-4 py-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-2">Focused today</span>
          <span className="tabular font-semibold">
            {fmtHours(focusMin)} · {sessions} {sessions === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill-2">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-glass"
            style={{ width: `${Math.min(100, (focusMin / FOCUS_GOAL_MIN) * 100)}%`, background: 'var(--timer)' }}
          />
        </div>
      </div>
    </Card>
  )
}
