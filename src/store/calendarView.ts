import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dayKey } from '@/lib/time'

export type CalendarLayout = 'month' | 'week'

interface CalendarViewState {
  layout: CalendarLayout
  /** Any day inside the month/week on screen. */
  cursor: string
  /** Day shown in the side panel. */
  selected: string
  setLayout: (layout: CalendarLayout) => void
  setCursor: (day: string) => void
  select: (day: string) => void
  today: () => void
}

/** Month/week is remembered; the date on screen starts at today each visit. */
export const useCalendarView = create<CalendarViewState>()(
  persist(
    (set) => ({
      layout: 'month',
      cursor: dayKey(),
      selected: dayKey(),
      setLayout: (layout) => set({ layout }),
      setCursor: (cursor) => set({ cursor }),
      select: (selected) => set({ selected }),
      today: () => set({ cursor: dayKey(), selected: dayKey() }),
    }),
    { name: 'agent-panel:calendar-view', partialize: ({ layout }) => ({ layout }) },
  ),
)
