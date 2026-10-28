import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Priority, Status } from '@/data/types'

export type TasksLayout = 'board' | 'list'
export type TasksSort = 'due' | 'prio'

export interface TaskFilters {
  project: string // 'all' or a project id
  mine: boolean
  priority: Priority | 'any'
  q: string
}

export const NO_FILTERS: TaskFilters = { project: 'all', mine: false, priority: 'any', q: '' }

interface TasksViewState {
  layout: TasksLayout
  sort: TasksSort
  collapsed: Status[]
  filters: TaskFilters
  setLayout: (layout: TasksLayout) => void
  setSort: (sort: TasksSort) => void
  toggleCollapsed: (status: Status) => void
  setFilters: (patch: Partial<TaskFilters>) => void
  clearFilters: () => void
}

/** Layout and sort are remembered; filters last for the session. */
export const useTasksView = create<TasksViewState>()(
  persist(
    (set) => ({
      layout: 'board',
      sort: 'due',
      collapsed: ['done'],
      filters: NO_FILTERS,
      setLayout: (layout) => set({ layout }),
      setSort: (sort) => set({ sort }),
      toggleCollapsed: (status) =>
        set((s) => ({
          collapsed: s.collapsed.includes(status) ? s.collapsed.filter((c) => c !== status) : [...s.collapsed, status],
        })),
      setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
      clearFilters: () => set({ filters: NO_FILTERS }),
    }),
    {
      name: 'foresign:tasks-view',
      partialize: ({ layout, sort, collapsed }) => ({ layout, sort, collapsed }),
    },
  ),
)
