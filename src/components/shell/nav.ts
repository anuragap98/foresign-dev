import { CalendarDays, ChartNoAxesColumn, Folder, House, Settings, SquareCheck, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Second key of the "G then …" shortcut. */
  key: string
}

export const NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: House, key: 'h' },
  { to: '/tasks', label: 'Tasks', icon: SquareCheck, key: 't' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, key: 'c' },
  { to: '/projects', label: 'Projects', icon: Folder, key: 'p' },
  { to: '/insights', label: 'Insights', icon: ChartNoAxesColumn, key: 'i' },
  { to: '/team', label: 'Team', icon: Users, key: 'm' },
  { to: '/settings', label: 'Settings', icon: Settings, key: 's' },
]
