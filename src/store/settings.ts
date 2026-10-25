import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotifyPrefs {
  mentions: boolean
  due: boolean
  meetings: boolean
  digest: boolean
  focusEnd: boolean
}

export const FOCUS_LIMITS = { session: [5, 90], break: [1, 30] } as const

/** Per-device preferences. Your profile lives on your actor in the database (see `updateMe`). */
interface SettingsState {
  notify: NotifyPrefs
  sessionMin: number
  breakMin: number
  setNotify: (key: keyof NotifyPrefs, on: boolean) => void
  setSessionMin: (n: number) => void
  setBreakMin: (n: number) => void
}

export const DEFAULT_NOTIFY: NotifyPrefs = { mentions: true, due: true, meetings: true, digest: false, focusEnd: true }

const clampTo = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(n)))

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      notify: DEFAULT_NOTIFY,
      sessionMin: 25,
      breakMin: 5,
      setNotify: (key, on) => set((s) => ({ notify: { ...s.notify, [key]: on } })),
      setSessionMin: (n) => set({ sessionMin: clampTo(n, FOCUS_LIMITS.session) }),
      setBreakMin: (n) => set({ breakMin: clampTo(n, FOCUS_LIMITS.break) }),
    }),
    {
      name: 'agent-panel:settings',
      version: 2,
      // v1 also stored a profile override; that now lives in the database.
      migrate: (old) => {
        const { notify = DEFAULT_NOTIFY, sessionMin = 25, breakMin = 5 } = (old ?? {}) as Partial<SettingsState>
        return { notify, sessionMin, breakMin }
      },
      partialize: ({ notify, sessionMin, breakMin }) => ({ notify, sessionMin, breakMin }),
    },
  ),
)
