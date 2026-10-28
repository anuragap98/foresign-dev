import { CalendarDays, ChevronRight, Folder, Search, SquareCheck, SquarePen, Timer, type LucideIcon } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { NAV } from '@/components/shell/nav'
import { Avatar } from '@/components/ui/avatar'
import { Kbd } from '@/components/ui/kbd'
import { STATUS_LABEL } from '@/data/types'
import { fmtDate, fmtTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useFocus } from '@/store/focus'
import { useSettings } from '@/store/settings'
import { usePeople } from '@/store/people'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'

interface Result {
  id: string
  group: string
  title: string
  detail?: string
  icon?: LucideIcon
  person?: string
  run: () => void
}

/** Marks the matched part of a label. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] bg-fill-2 px-0.5 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  )
}

function useResults(query: string): Result[] {
  const setPalette = useUi((s) => s.setPalette)
  const newTask = useUi((s) => s.newTask)
  const startFocus = useFocus((s) => s.start)
  const { tasks, projects, events } = useWorkspace(useShallow((s) => ({ tasks: s.tasks, projects: s.projects, events: s.events })))
  const navigate = useNavigate()
  const people = usePeople()
  const sessionMin = useSettings((s) => s.sessionMin)

  return useMemo<Result[]>(() => {
    const go = (path: string) => () => {
      navigate(path)
      setPalette(false)
    }
    const q = query.trim().toLowerCase()
    if (!q) {
      return [
        ...NAV.slice(0, 4).map((n) => ({ id: n.to, group: 'Pages', title: n.label, detail: 'Go to page', icon: n.icon, run: go(n.to) })),
        { id: 'a-task', group: 'Actions', title: 'New task', detail: 'Add to the board', icon: SquarePen, run: () => newTask() },
        {
          id: 'a-focus', group: 'Actions', title: 'Start a focus session', detail: `${sessionMin} minutes`, icon: Timer,
          run: () => {
            startFocus(sessionMin)
            setPalette(false)
          },
        },
      ]
    }
    const has = (s: string) => s.toLowerCase().includes(q)
    const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? ''
    return [
      ...NAV.filter((n) => has(n.label)).map((n) => ({ id: n.to, group: 'Pages', title: n.label, detail: 'Go to page', icon: n.icon, run: go(n.to) })),
      ...tasks
        .filter((t) => has(t.title))
        .slice(0, 5)
        .map((t) => ({
          id: t.id, group: 'Tasks', title: t.title, icon: SquareCheck,
          detail: `${projectName(t.projectId)} · ${STATUS_LABEL[t.status]}`, run: go(`/tasks/${t.id}`),
        })),
      ...projects
        .filter((p) => has(p.name))
        .map((p) => ({ id: p.id, group: 'Projects', title: p.name, detail: p.summary, icon: Folder, run: go(`/projects/${p.id}`) })),
      ...events
        .filter((e) => has(e.title))
        .slice(0, 4)
        .map((e) => ({
          id: e.id, group: 'Calendar', title: e.title, icon: CalendarDays,
          detail: `${fmtDate(e.start, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(e.start)}`, run: go('/calendar'),
        })),
      ...people.filter((p) => has(p.name) || has(p.role)).map((p) => ({
        id: p.id, group: 'People', title: p.name, detail: `${p.role} · ${p.city}`, person: p.id, run: go(`/team/${p.id}`),
      })),
    ]
  }, [query, tasks, projects, events, people, sessionMin, navigate, setPalette, newTask, startFocus])
}

/** Mounted fresh on every open, so the query starts empty. */
function PaletteBody() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const results = useResults(query)

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      results[active]?.run()
    }
  }

  let lastGroup = ''

  return (
    <div onKeyDown={onKeyDown}>
      <div className="glass glass--thick flex h-14 items-center gap-3 rounded-full px-5">
        <Search className="size-5 text-ink-2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          placeholder="Search tasks, projects, people…"
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          className="h-full flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
        />
        <Kbd>esc</Kbd>
      </div>

      <ul
        ref={listRef}
        id="palette-list"
        role="listbox"
        className="glass glass--thick scroll-thin mt-2.5 max-h-[min(440px,60vh)] overflow-y-auto rounded-[26px] p-2"
      >
        {results.length === 0 && <li className="px-4 py-8 text-center text-[14px] text-ink-2">No matches for “{query}”</li>}
        {results.map((r, i) => {
          const header = r.group !== lastGroup
          lastGroup = r.group
          const Icon = r.icon
          const on = i === active
          return (
            <li key={`${r.group}-${r.id}`} role="presentation">
              {header && <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{r.group}</p>}
              <div
                id={`pal-${i}`}
                role="option"
                aria-selected={on}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={r.run}
                className={cn('flex cursor-pointer items-center gap-3 rounded-[16px] px-3 py-2.5 transition-colors', on ? 'gel' : 'text-ink')}
              >
                {r.person ? (
                  <Avatar id={r.person} size={32} />
                ) : (
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-[10px]', on ? 'bg-white/20' : 'bg-fill')}>
                    {Icon && <Icon className="size-[18px]" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    <Highlight text={r.title} query={query.trim()} />
                  </span>
                  {r.detail && <span className={cn('block truncate text-[12px]', on ? 'text-white/75' : 'text-ink-2')}>{r.detail}</span>}
                </span>
                {on && <ChevronRight className="size-4" />}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const setPalette = useUi((s) => s.setPalette)

  return (
    <Dialog.Root open={open} onOpenChange={setPalette}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-fade fixed inset-0 z-40 bg-scrim backdrop-blur-[2px]" />
        <Dialog.Content
          className="anim-pop fixed top-[12vh] left-1/2 z-50 w-[min(620px,calc(100vw-24px))] -translate-x-1/2 outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Search Foresign</Dialog.Title>
          <PaletteBody />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
