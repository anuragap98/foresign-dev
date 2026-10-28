import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MIN } from '@/lib/time'
import { useSettings } from './settings'
import { useWorkspace } from './workspace'

export type FocusPhase = 'idle' | 'running' | 'paused'

interface FocusState {
  phase: FocusPhase
  /** Planned length of the current block, in minutes (also the idle preset). */
  minutes: number
  /** Wall-clock end while running. */
  endsAt: number | null
  /** Time left while paused. */
  leftMs: number | null
  startedAt: number | null
  taskId: string | null
  /** Bumped whenever the island should pop open (start, +5, finish). */
  pulse: number
  finishedAt: number | null

  setMinutes: (m: number) => void
  setTask: (id: string | null) => void
  start: (minutes?: number, taskId?: string | null) => void
  pause: () => void
  resume: () => void
  addFive: () => void
  end: () => void
  complete: () => void
}

export const useFocus = create<FocusState>()(
  persist(
    (set, get) => {
      const log = (finished = false) => {
        const { startedAt, taskId, phase, endsAt, leftMs, minutes } = get()
        if (!startedAt) return
        const left = phase === 'running' && endsAt ? Math.max(0, endsAt - Date.now()) : (leftMs ?? 0)
        const spent = Math.round((minutes * MIN - left) / MIN)
        if (spent >= 1) {
          if (finished && useSettings.getState().notify.focusEnd)
            useWorkspace.getState().notify({ from: 'foresign', kind: 'update', text: `Focus session finished · ${spent} minutes logged` })
          useWorkspace.getState().logFocus({
            start: new Date(startedAt).toISOString(),
            minutes: spent,
            taskId: taskId ?? undefined,
          })
        }
      }

      return {
        phase: 'idle',
        minutes: 25,
        endsAt: null,
        leftMs: null,
        startedAt: null,
        taskId: null,
        pulse: 0,
        finishedAt: null,

        setMinutes: (minutes) => get().phase === 'idle' && set({ minutes }),
        setTask: (taskId) => set({ taskId }),

        start: (minutes = get().minutes, taskId = get().taskId) =>
          set((s) => ({
            phase: 'running',
            minutes,
            taskId,
            startedAt: Date.now(),
            endsAt: Date.now() + minutes * MIN,
            leftMs: null,
            finishedAt: null,
            pulse: s.pulse + 1,
          })),

        pause: () => {
          const { endsAt } = get()
          if (get().phase !== 'running' || !endsAt) return
          set({ phase: 'paused', leftMs: Math.max(0, endsAt - Date.now()), endsAt: null })
        },

        resume: () => {
          const { leftMs } = get()
          if (get().phase !== 'paused' || leftMs === null) return
          set({ phase: 'running', endsAt: Date.now() + leftMs, leftMs: null })
        },

        addFive: () =>
          set((s) => ({
            minutes: s.minutes + 5,
            endsAt: s.endsAt ? s.endsAt + 5 * MIN : null,
            leftMs: s.leftMs !== null ? s.leftMs + 5 * MIN : null,
            pulse: s.pulse + 1,
          })),

        end: () => {
          log()
          set({ phase: 'idle', endsAt: null, leftMs: null, startedAt: null, minutes: useSettings.getState().sessionMin })
        },

        complete: () => {
          log(true)
          set((s) => ({
            phase: 'idle',
            endsAt: null,
            leftMs: null,
            startedAt: null,
            finishedAt: Date.now(),
            minutes: useSettings.getState().sessionMin,
            pulse: s.pulse + 1,
          }))
        },
      }
    },
    {
      name: 'foresign:focus',
      partialize: ({ phase, minutes, endsAt, leftMs, startedAt, taskId }) => ({
        phase, minutes, endsAt, leftMs, startedAt, taskId,
      }),
    },
  ),
)

/** Milliseconds left in the current block. */
export function focusLeft(s: Pick<FocusState, 'phase' | 'endsAt' | 'leftMs' | 'minutes'>, now = Date.now()) {
  if (s.phase === 'running' && s.endsAt) return Math.max(0, s.endsAt - now)
  if (s.phase === 'paused' && s.leftMs !== null) return s.leftMs
  return s.minutes * MIN
}
