import { Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { EventForm } from '@/components/forms/EventForm'
import { InviteForm } from '@/components/forms/InviteForm'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { CommandPalette } from '@/components/overlays/CommandPalette'
import { FocusIsland } from '@/components/overlays/FocusIsland'
import { ShortcutsDrawer } from '@/components/overlays/Shortcuts'
import { useWorkspace } from '@/store/workspace'
import { NAV } from './nav'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { Toolbar } from './Toolbar'
import { useHotkeys } from './useHotkeys'
import { useReminders } from './useReminders'
import { Wallpaper } from './Wallpaper'

const DRAWER_SECTIONS = new Set(['tasks', 'calendar', 'team', 'runs'])


export function AppShell() {
  const { pathname } = useLocation()
  useHotkeys()
  useReminders()

  // On pages whose sub-routes open a drawer (#/tasks/:id), keep the page mounted.
  const section = pathname.split('/')[1] ?? ''
  const pageKey = DRAWER_SECTIONS.has(section) ? section : pathname

  const projectName = useWorkspace((s) => s.projects.find((p) => pathname === `/projects/${p.id}`)?.name)

  useEffect(() => {
    const page = NAV.find((n) => pathname.startsWith(n.to))
    document.title = projectName ? `${projectName} · Pane` : page ? `${page.label} · Pane` : 'Pane'
  }, [pathname, projectName])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pageKey])

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Wallpaper />
      <Sidebar />
      <Toolbar />
      <FocusIsland />

      <main
        id="main"
        className="min-h-dvh px-[var(--gutter)] pt-[78px] pb-28 md:pb-10 md:pl-[calc(14px+76px+var(--gutter))] lg:pl-[calc(14px+var(--side-w)+var(--gutter))]"
      >
        <div className="mx-auto max-w-[1560px]">
          <Outlet key={pageKey} />
        </div>
      </main>

      <TabBar />
      <CommandPalette />
      <TaskForm />
      <EventForm />
      <ProjectForm />
      <InviteForm />
      <ShortcutsDrawer />
    </>
  )
}
