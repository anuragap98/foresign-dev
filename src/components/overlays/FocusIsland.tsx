import { Pause, Play, Plus, Square } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNow } from '@/lib/derive'
import { gsap, prefersReducedMotion } from '@/lib/gsap'
import { fmtClock, MIN } from '@/lib/time'
import { cn } from '@/lib/utils'
import { focusLeft, useFocus } from '@/store/focus'
import { useSettings } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'

const SIZE = {
  hidden: { width: 120, height: 36, borderRadius: 18 },
  compact: { width: 196, height: 38, borderRadius: 19 },
  open: { width: 372, height: 150, borderRadius: 34 },
}

function MiniRing({ progress, size = 18 }: { progress: number; size?: number }) {
  const r = size / 2 - 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff26" strokeWidth="2.5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--timer)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
      />
    </svg>
  )
}

/**
 * Dynamic-Island-style focus timer pinned to the top of the window. It pops
 * open when a session starts, changes or ends, then tucks into a pill.
 */
export function FocusIsland() {
  const focus = useFocus()
  const task = useWorkspace((s) => s.tasks.find((t) => t.id === focus.taskId))
  const announceEnd = useSettings((s) => s.notify.focusEnd)
  const breakMin = useSettings((s) => s.breakMin)
  const now = useNow(500)
  const [open, setOpen] = useState(false)
  const [showFinished, setShowFinished] = useState(false)
  const island = useRef<HTMLDivElement>(null)
  const lastPulse = useRef(focus.pulse)

  const active = focus.phase !== 'idle'
  const left = focusLeft(focus, now.getTime())
  const progress = 1 - left / (focus.minutes * MIN)
  const state = active || showFinished ? (open ? 'open' : 'compact') : 'hidden'

  // A finished block is logged and announced.
  useEffect(() => {
    if (focus.phase === 'running' && left <= 0) focus.complete()
  }, [focus, left])

  // Pop open on start / +5 / finish, then tuck away.
  useEffect(() => {
    if (focus.pulse === lastPulse.current) return
    lastPulse.current = focus.pulse
    // With "Focus finished" switched off, a session ends quietly.
    if (focus.finishedAt && !announceEnd) return
    setOpen(true)
    if (focus.finishedAt) setShowFinished(true)
    // Both timers belong to this pulse; a newer pulse cancels them.
    let hide = 0
    const collapse = window.setTimeout(() => {
      setOpen(false)
      if (focus.finishedAt) hide = window.setTimeout(() => setShowFinished(false), 900)
    }, focus.finishedAt ? 4200 : 3200)
    return () => {
      window.clearTimeout(collapse)
      window.clearTimeout(hide)
    }
  }, [focus.pulse, focus.finishedAt, announceEnd])

  useLayoutEffect(() => {
    const el = island.current
    if (!el) return
    const target = { ...SIZE[state], width: Math.min(SIZE[state].width, window.innerWidth - 24) }
    const fast = prefersReducedMotion()
    if (state === 'hidden') {
      gsap.to(el, { ...target, autoAlpha: 0, y: -14, scale: 0.85, duration: fast ? 0 : 0.35, ease: 'power3.in' })
    } else {
      gsap.to(el, { ...target, autoAlpha: 1, y: 0, scale: 1, duration: fast ? 0 : 0.75, ease: 'elastic.out(1, 0.72)' })
    }
    gsap.fromTo(
      el.querySelectorAll(`[data-face="${state}"] > *`),
      { autoAlpha: 0, y: 6, filter: 'blur(4px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.35, stagger: 0.04, delay: 0.12, ease: 'power2.out' },
    )
  }, [state])

  const label = task ? task.title : `${focus.minutes}-minute block`
  const clock = fmtClock(left)

  return (
    <div className="pointer-events-none fixed top-[14px] left-1/2 z-[45] -translate-x-1/2">
      <div
        ref={island}
        role="status"
        aria-live="polite"
        className="pointer-events-auto invisible relative overflow-hidden text-white opacity-0"
        style={{
          ...SIZE.hidden,
          background: 'var(--island)',
          boxShadow: '0 18px 40px -16px #000c, inset 0 1px 1px #ffffff1f, inset 0 0 0 0.5px #ffffff14',
        }}
      >
        {state === 'compact' && (
          <button
            type="button"
            data-face="compact"
            onClick={() => setOpen(true)}
            aria-label={`Focus session, ${clock} left. Show controls`}
            className="flex size-full items-center justify-between gap-2 px-3.5 text-[13px] font-semibold"
          >
            <span className="flex items-center gap-2">
              <MiniRing progress={active ? progress : 1} />
              {active ? 'Focus' : 'Done'}
            </span>
            <span className="tabular" style={{ color: 'var(--timer)' }}>
              {active ? clock : '✓'}
            </span>
          </button>
        )}

        {state === 'open' && (
          <div data-face="open" className="flex size-full flex-col justify-between p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <MiniRing progress={active ? progress : 1} size={34} />
                <div className="min-w-0">
                  <p className="text-[12px] text-white/55">
                    {active ? (focus.phase === 'paused' ? 'Paused' : 'Notifications are held') : 'Session complete'}
                  </p>
                  <p className="truncate text-[15px] font-semibold">{active ? label : 'Nice work. It is in your log.'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="tabular display shrink-0 text-[30px] leading-none font-semibold"
                style={{ color: 'var(--timer)' }}
                aria-label="Collapse"
              >
                {active ? clock : '00:00'}
              </button>
            </div>

            {active ? (
              <div className="flex items-center gap-2">
                <IslandButton onClick={focus.phase === 'paused' ? focus.resume : focus.pause}>
                  {focus.phase === 'paused' ? <Play /> : <Pause />}
                  {focus.phase === 'paused' ? 'Resume' : 'Pause'}
                </IslandButton>
                <IslandButton onClick={focus.end}>
                  <Square /> End
                </IslandButton>
                <IslandButton onClick={focus.addFive} className="ml-auto bg-[color-mix(in_srgb,var(--timer)_22%,transparent)] text-[var(--timer)]">
                  <Plus /> 5 min
                </IslandButton>
              </div>
            ) : (
              <div className="flex gap-2">
                <IslandButton onClick={() => focus.start(breakMin, null)}>
                  <Play /> Take a {breakMin}-minute break
                </IslandButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function IslandButton({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full bg-white/12 px-3.5 text-[13px] font-semibold transition-colors hover:bg-white/20 [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  )
}
