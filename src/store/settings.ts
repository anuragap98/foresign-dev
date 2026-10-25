import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ME, PEOPLE, PEOPLE_BY_ID } from '@/data/seed'
import type { Person } from '@/data/types'

export interface Profile {
  name: string
  email: string
  role: string
}

export interface NotifyPrefs {
  mentions: boolean
  due: boolean
  meetings: boolean
  digest: boolean
  focusEnd: boolean
}

export const FOCUS_LIMITS = { session: [5, 90], break: [1, 30] } as const

interface SettingsState {
  profile: Profile
  notify: NotifyPrefs
  sessionMin: number
  breakMin: number
  setProfile: (patch: Partial<Profile>) => void
  setNotify: (key: keyof NotifyPrefs, on: boolean) => void
  setSessionMin: (n: number) => void
  setBreakMin: (n: number) => void
}

const me = PEOPLE_BY_ID[ME]
export const DEFAULT_PROFILE: Profile = { name: me.name, email: me.email, role: me.role }
export const DEFAULT_NOTIFY: NotifyPrefs = { mentions: true, due: true, meetings: true, digest: false, focusEnd: true }

const clampTo = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(n)))

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      notify: DEFAULT_NOTIFY,
      sessionMin: 25,
      breakMin: 5,
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setNotify: (key, on) => set((s) => ({ notify: { ...s.notify, [key]: on } })),
      setSessionMin: (n) => set({ sessionMin: clampTo(n, FOCUS_LIMITS.session) }),
      setBreakMin: (n) => set({ breakMin: clampTo(n, FOCUS_LIMITS.break) }),
    }),
    {
      name: 'agent-panel:settings',
      partialize: ({ profile, notify, sessionMin, breakMin }) => ({ profile, notify, sessionMin, breakMin }),
    },
  ),
)

/** Everyone, with your own entry reflecting the profile you edited in Settings. */
export function usePeople(): Person[] {
  const profile = useSettings((s) => s.profile)
  return useMemo(
    () =>
      PEOPLE.map((p) =>
        p.id === ME
          ? {
              ...p,
              name: profile.name.trim() || DEFAULT_PROFILE.name,
              email: profile.email.trim() || DEFAULT_PROFILE.email,
              role: profile.role.trim() || DEFAULT_PROFILE.role,
            }
          : p,
      ),
    [profile],
  )
}

export function usePeopleById(): Record<string, Person> {
  const people = usePeople()
  return useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
}

export const usePerson = (id: string): Person | undefined => usePeopleById()[id]
