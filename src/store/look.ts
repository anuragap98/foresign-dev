import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePref = 'light' | 'dark' | 'auto'
export type Wall = 'ash' | 'sand' | 'sage' | 'aurora' | 'smoke' | 'tide' | 'bloom' | 'ember' | 'grove' | 'dusk'
export type Accent = 'blue' | 'purple' | 'pink' | 'orange' | 'green' | 'graphite'
export type GlassMode = 'clear' | 'tinted'

export const WALLS: { id: Wall; label: string }[] = [
  { id: 'ash', label: 'Ash' },
  { id: 'sand', label: 'Sand' },
  { id: 'sage', label: 'Sage' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'smoke', label: 'Smoke' },
  { id: 'tide', label: 'Tide' },
  { id: 'bloom', label: 'Bloom' },
  { id: 'ember', label: 'Ember' },
  { id: 'grove', label: 'Grove' },
  { id: 'dusk', label: 'Dusk' },
]

export const ACCENTS: { id: Accent; label: string }[] = [
  { id: 'blue', label: 'Blue' },
  { id: 'purple', label: 'Purple' },
  { id: 'pink', label: 'Pink' },
  { id: 'orange', label: 'Orange' },
  { id: 'green', label: 'Green' },
  { id: 'graphite', label: 'Graphite' },
]

export interface Look {
  theme: ThemePref
  wall: Wall
  accent: Accent
  glass: GlassMode
  solid: boolean
}

interface LookState extends Look {
  set: (patch: Partial<Look>) => void
}

export const DEFAULT_LOOK: Look = { theme: 'dark', wall: 'ash', accent: 'blue', glass: 'tinted', solid: false }

export const useLook = create<LookState>()(
  persist((set) => ({ ...DEFAULT_LOOK, set: (patch) => set(patch) }), {
    name: 'foresign:look',
    partialize: ({ theme, wall, accent, glass, solid }) => ({ theme, wall, accent, glass, solid }),
  }),
)

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function resolvedTheme(theme: ThemePref) {
  return theme === 'auto' ? (systemDark() ? 'dark' : 'light') : theme
}

/** Writes the look onto <html>; `animate` cross-fades colours while it happens. */
export function applyLook(look: Look, animate = false) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 500)
  }
  root.dataset.theme = resolvedTheme(look.theme)
  root.dataset.wall = look.wall
  root.dataset.accent = look.accent
  root.dataset.glass = look.glass
  root.classList.toggle('is-solid', look.solid)
}
