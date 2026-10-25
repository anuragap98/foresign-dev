import { Drawer } from '@/components/ui/dialog'
import { isMac, Kbd } from '@/components/ui/kbd'
import { useUi } from '@/store/ui'

const ROWS: [label: string, keys: string[][]][] = [
  ['Search', [[isMac ? '⌘' : 'Ctrl', 'K'], ['/']]],
  ['Create…', [['N']]],
  ['New task', [['T']]],
  ['Start a focus session', [['F']]],
  ['Go to a page', [['G'], ['H / T / C / P / I / M / S']]],
  ['Close', [['Esc']]],
  ['This list', [['?']]],
]

export function ShortcutsDrawer() {
  const open = useUi((s) => s.dialog === 'shortcuts')
  const closeDialog = useUi((s) => s.closeDialog)

  return (
    <Drawer open={open} onOpenChange={(o) => !o && closeDialog()} title="Keyboard shortcuts" description="Work without leaving the keyboard">
      <ul className="divide-y divide-sep rounded-[20px] bg-fill px-4">
        {ROWS.map(([label, combos]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-3 text-[14px]">
            <span>{label}</span>
            <span className="flex flex-wrap items-center justify-end gap-1.5 text-[12px] text-ink-3">
              {combos.map((keys, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="px-0.5">{label === 'Go to a page' ? 'then' : 'or'}</span>}
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Drawer>
  )
}
