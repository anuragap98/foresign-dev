import { useLayoutEffect, useMemo, useRef } from 'react'
import { NavLink, useLocation } from 'react-router'
import { Glass } from '@/components/glass/Glass'
import { AccountMenu } from '@/components/overlays/AccountMenu'
import { ME } from '@/data/seed'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'
import { LogoMark } from './Logo'
import { NAV } from './nav'

const itemCls =
  'relative z-10 flex h-10 items-center gap-3 rounded-full px-3 text-[15px] font-medium transition-colors duration-200 max-lg:justify-center max-lg:px-0'

/** The selected item's glass pill slides and squashes to the new item on navigation. */
function useNavLens(activeKey: string | undefined) {
  const list = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLSpanElement>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const el = lens.current
    const target = activeKey ? list.current?.querySelector<HTMLElement>(`[data-nav="${activeKey}"]`) : null
    if (!el) return
    gsap.killTweensOf(el)
    if (!target) {
      gsap.to(el, { opacity: 0, duration: 0.2 })
      return
    }
    const to = { y: target.offsetTop, height: target.offsetHeight, opacity: 1 }
    const still = gsap.getProperty(el, 'y') === to.y
    if (!placed.current || still || gsap.getProperty(el, 'opacity') === 0) {
      gsap.set(el, to)
      placed.current = true
      return
    }
    gsap.to(el, { ...to, duration: 0.6, ease: 'elastic.out(1, 0.78)' })
    gsap.fromTo(el, { scaleX: 0.92, scaleY: 1.12 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.5)' })
  }, [activeKey])

  return { list, lens }
}

export function Sidebar() {
  const { pathname } = useLocation()
  const projects = useWorkspace((s) => s.projects)
  const tasks = useWorkspace((s) => s.tasks)
  const pinned = projects.filter((p) => p.pinned)
  const myOpen = useMemo(() => tasks.filter((t) => t.assignee === ME && t.status !== 'done').length, [tasks])

  const pinnedActive = pinned.find((p) => pathname === `/projects/${p.id}`)
  const activeKey = pinnedActive ? `pin-${pinnedActive.id}` : NAV.find((n) => pathname.startsWith(n.to))?.to
  const { list, lens } = useNavLens(activeKey)

  return (
    <Glass
      as="aside"
      variant="chrome"
      className="fixed top-[14px] bottom-[14px] left-[14px] z-30 hidden w-[76px] flex-col rounded-card p-3 md:flex lg:w-[var(--side-w)]"
    >
      <NavLink to="/home" className="mb-4 flex items-center gap-2.5 px-1.5 pt-1 max-lg:justify-center" aria-label="Pane, home">
        <LogoMark />
        <span className="display text-[20px] font-semibold max-lg:hidden">Pane</span>
      </NavLink>

      <div ref={list} className="relative flex-1">
        <span ref={lens} aria-hidden className="lens absolute inset-x-0 top-0 rounded-full opacity-0" />

        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              data-nav={to}
              title={label}
              className={({ isActive }) => cn(itemCls, isActive ? 'text-ink' : 'text-ink-2 hover:text-ink')}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
              <span className="flex-1 max-lg:sr-only">{label}</span>
              {to === '/tasks' && myOpen > 0 && (
                <span className="rounded-full bg-fill-2 px-2 py-px text-[12px] font-semibold text-ink-2 max-lg:absolute max-lg:top-0.5 max-lg:right-1 max-lg:px-1.5 max-lg:text-[10px]">
                  {myOpen}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {pinned.length > 0 && (
          <div className="mt-5 max-lg:hidden">
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Pinned</p>
            <div className="flex flex-col gap-1">
              {pinned.map((p) => (
                <NavLink
                  key={p.id}
                  to={`/projects/${p.id}`}
                  data-nav={`pin-${p.id}`}
                  className={({ isActive }) => cn(itemCls, 'text-[14px]', isActive ? 'text-ink' : 'text-ink-2 hover:text-ink')}
                >
                  <i className={cn(`hue-${p.hue}`, 'size-2 shrink-0 rounded-full bg-[var(--hue)]')} />
                  <span className="truncate">{p.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccountMenu />
    </Glass>
  )
}
