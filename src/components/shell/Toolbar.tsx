import { CalendarPlus, FolderPlus, Moon, Plus, Search, SquarePen, Sun, Timer } from 'lucide-react'
import { Glass } from '@/components/glass/Glass'
import { NotificationsPopover } from '@/components/overlays/Notifications'
import { Button } from '@/components/ui/button'
import { isMac, Kbd } from '@/components/ui/kbd'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu'
import { resolvedTheme, useLook } from '@/store/look'
import { useFocus } from '@/store/focus'
import { useSettings } from '@/store/settings'
import { useUi } from '@/store/ui'

export function Toolbar() {
  const theme = useLook((s) => s.theme)
  const setLook = useLook((s) => s.set)
  const setPalette = useUi((s) => s.setPalette)
  const newTask = useUi((s) => s.newTask)
  const newEvent = useUi((s) => s.newEvent)
  const openDialog = useUi((s) => s.openDialog)
  const startFocus = useFocus((s) => s.start)
  const sessionMin = useSettings((s) => s.sessionMin)
  const dark = resolvedTheme(theme) === 'dark'

  return (
    <Glass
      as="header"
      variant="chrome"
      className="fixed top-[14px] right-[var(--gutter)] z-30 flex items-center gap-1 rounded-full p-1.5"
    >
      <button
        type="button"
        onClick={() => setPalette(true)}
        aria-label={`Search (${isMac ? '⌘' : 'Ctrl+'}K)`}
        className="flex h-9 items-center gap-2 rounded-full bg-fill px-3 text-[14px] text-ink-2 transition-colors hover:bg-fill-2 hover:text-ink sm:w-[190px]"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left max-sm:sr-only">Search</span>
        <span className="max-sm:hidden">
          <Kbd>{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
        </span>
      </button>

      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Create new">
            <Plus />
          </Button>
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={() => newTask()}>
            <SquarePen /> New task
          </MenuItem>
          <MenuItem onSelect={() => newEvent()}>
            <CalendarPlus /> New event
          </MenuItem>
          <MenuItem onSelect={() => openDialog('project')}>
            <FolderPlus /> New project
          </MenuItem>
          <MenuItem onSelect={() => startFocus(sessionMin)}>
            <Timer /> Focus for {sessionMin} min
          </MenuItem>
        </MenuContent>
      </Menu>

      <Button
        variant="ghost"
        size="icon"
        aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => setLook({ theme: dark ? 'light' : 'dark' })}
      >
        {dark ? <Sun /> : <Moon />}
      </Button>

      <NotificationsPopover />
    </Glass>
  )
}
