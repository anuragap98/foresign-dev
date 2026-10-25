import { Search } from 'lucide-react'
import { NavLink } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import { cn } from '@/lib/utils'
import { useUi } from '@/store/ui'
import { NAV } from './nav'

/** Phone navigation: the sidebar collapses into a floating glass tab bar. */
export function TabBar() {
  const setPalette = useUi((s) => s.setPalette)
  const cls = 'flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] font-medium transition-colors'

  return (
    <Glass
      as="nav"
      variant="chrome"
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 flex rounded-full p-1.5 md:hidden"
    >
      {NAV.slice(0, 4).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => cn(cls, isActive ? 'lens text-ink' : 'text-ink-2')}>
          <Icon className="size-5" strokeWidth={1.9} />
          {label}
        </NavLink>
      ))}
      <button type="button" onClick={() => setPalette(true)} className={cn(cls, 'text-ink-2')}>
        <Search className="size-5" strokeWidth={1.9} />
        Search
      </button>
    </Glass>
  )
}
