import { ChevronsUpDown, Keyboard, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Menu, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { ME } from '@/lib/session'
import { useLook, type ThemePref } from '@/store/look'
import { usePerson } from '@/store/people'
import { supabase } from '@/lib/supabase'
import { useUi } from '@/store/ui'

export function AccountMenu() {
  const navigate = useNavigate()
  const theme = useLook((s) => s.theme)
  const setLook = useLook((s) => s.set)
  const openDialog = useUi((s) => s.openDialog)
  const me = usePerson(ME)!

  return (
    <Menu>
      <MenuTrigger
        aria-label="Account menu"
        className="flex w-full items-center gap-2.5 rounded-[18px] p-1.5 text-left outline-none transition-colors hover:bg-fill-hover data-[state=open]:bg-fill-hover max-lg:justify-center"
      >
        <Avatar id={ME} size={34} presence />
        <span className="min-w-0 flex-1 max-lg:hidden">
          <span className="block truncate text-[14px] font-semibold">{me.name}</span>
          <span className="block truncate text-[12px] text-ink-2">{me.role}</span>
        </span>
        <ChevronsUpDown className="size-4 text-ink-3 max-lg:hidden" />
      </MenuTrigger>
      <MenuContent side="top" align="start" className="w-[232px]">
        <MenuItem onSelect={() => navigate('/settings')} className="justify-between">
          Settings <Settings />
        </MenuItem>
        <MenuItem onSelect={() => openDialog('shortcuts')} className="justify-between">
          Keyboard shortcuts <Keyboard />
        </MenuItem>
        <MenuSeparator />
        <MenuRadioGroup value={theme} onValueChange={(v) => setLook({ theme: v as ThemePref })}>
          <MenuRadioItem value="light">Light</MenuRadioItem>
          <MenuRadioItem value="dark">Dark</MenuRadioItem>
          <MenuRadioItem value="auto">Match system</MenuRadioItem>
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem
          onSelect={async () => {
            await supabase.auth.signOut()
            // A clean reload drops everything cached for this account.
            window.location.assign(window.location.pathname)
          }}
          className="justify-between"
        >
          Sign out <LogOut />
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
