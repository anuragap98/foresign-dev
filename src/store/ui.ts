import { create } from 'zustand'
import type { NewEvent, NewTask } from './workspace'

export type DialogName = 'task' | 'event' | 'project' | 'invite' | 'shortcuts' | 'reset' | null

interface UiState {
  paletteOpen: boolean
  dialog: DialogName
  taskDefaults: Partial<NewTask>
  eventDefaults: Partial<NewEvent>
  /** Card id currently blown up into the focus overlay. */
  expanded: string | null

  setPalette: (open: boolean) => void
  openDialog: (name: Exclude<DialogName, null>) => void
  newTask: (defaults?: Partial<NewTask>) => void
  newEvent: (defaults?: Partial<NewEvent>) => void
  closeDialog: () => void
  setExpanded: (id: string | null) => void
}

export const useUi = create<UiState>()((set) => ({
  paletteOpen: false,
  dialog: null,
  taskDefaults: {},
  eventDefaults: {},
  expanded: null,

  setPalette: (paletteOpen) => set({ paletteOpen }),
  openDialog: (dialog) => set({ dialog, paletteOpen: false }),
  newTask: (taskDefaults = {}) => set({ dialog: 'task', taskDefaults, paletteOpen: false }),
  newEvent: (eventDefaults = {}) => set({ dialog: 'event', eventDefaults, paletteOpen: false }),
  closeDialog: () => set({ dialog: null }),
  setExpanded: (expanded) => set({ expanded }),
}))
