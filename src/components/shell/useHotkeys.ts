import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useFocus } from '@/store/focus'
import { useUi } from '@/store/ui'
import { NAV } from './nav'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/** Global shortcuts: ⌘K or /, N, T, F, ?, and "G then <letter>" page jumps. */
export function useHotkeys() {
  const navigate = useNavigate()

  useEffect(() => {
    let gAt = 0

    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.setPalette(!ui.paletteOpen)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (ui.paletteOpen || ui.dialog || document.querySelector('[role="dialog"], [role="menu"]')) return

      const key = e.key.toLowerCase()
      if (Date.now() - gAt < 1200) {
        gAt = 0
        const item = NAV.find((n) => n.key === key)
        if (item) {
          e.preventDefault()
          navigate(item.to)
        }
        return
      }

      switch (key) {
        case '/':
          e.preventDefault()
          ui.setPalette(true)
          break
        case 'g':
          gAt = Date.now()
          break
        case 'n':
          e.preventDefault()
          document.querySelector<HTMLButtonElement>('[aria-label="Create new"]')?.click()
          break
        case 't':
          e.preventDefault()
          ui.newTask()
          break
        case 'f': {
          const focus = useFocus.getState()
          if (focus.phase === 'idle') focus.start()
          break
        }
        case '?':
          ui.openDialog('shortcuts')
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
