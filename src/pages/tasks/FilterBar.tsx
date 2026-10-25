import { ChevronDown, Flag, Folder, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { Glass } from '@/components/glass/Glass'
import { Avatar } from '@/components/ui/avatar'
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu'
import { ME } from '@/data/seed'
import { PRIORITY_LABEL, type Priority } from '@/data/types'
import { filtersActive } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { useTasksView } from '@/store/tasksView'
import { useWorkspace } from '@/store/workspace'

const pill =
  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[14px] font-medium outline-none transition-colors [&_svg]:size-4'
const pillTone = (on: boolean) => (on ? 'bg-accent-soft text-accent-ink' : 'bg-fill text-ink hover:bg-fill-2')

export function FilterBar() {
  const filters = useTasksView((s) => s.filters)
  const setFilters = useTasksView((s) => s.setFilters)
  const clearFilters = useTasksView((s) => s.clearFilters)
  const projects = useWorkspace((s) => s.projects)
  const tasks = useWorkspace((s) => s.tasks)

  const openBy = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) if (t.status !== 'done') counts[t.projectId] = (counts[t.projectId] ?? 0) + 1
    return counts
  }, [tasks])
  const openTotal = Object.values(openBy).reduce((a, b) => a + b, 0)
  const project = projects.find((p) => p.id === filters.project)

  return (
    <Glass data-enter variant="chrome" className="flex flex-wrap items-center gap-1.5 rounded-[26px] p-1.5">
      <Menu>
        <MenuTrigger className={cn(pill, pillTone(!!project))}>
          {project ? <i className={`hue-${project.hue} size-2 rounded-full bg-[var(--hue)]`} /> : <Folder />}
          <span className="max-w-[160px] truncate">{project?.name ?? 'All projects'}</span>
          <ChevronDown className="opacity-60" />
        </MenuTrigger>
        <MenuContent align="start" className="w-[270px]">
          <MenuRadioGroup value={filters.project} onValueChange={(v) => setFilters({ project: v })}>
            <MenuRadioItem value="all">
              <span className="flex-1">All projects</span>
              <span className="text-[12px] text-ink-3">{openTotal} open</span>
            </MenuRadioItem>
            <MenuSeparator />
            {projects.map((p) => (
              <MenuRadioItem key={p.id} value={p.id}>
                <i className={`hue-${p.hue} size-2 shrink-0 rounded-full bg-[var(--hue)]`} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-[12px] text-ink-3">{openBy[p.id] ?? 0} open</span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <button
        type="button"
        aria-pressed={filters.mine}
        onClick={() => setFilters({ mine: !filters.mine })}
        className={cn(pill, 'pl-1.5', pillTone(filters.mine))}
      >
        <Avatar id={ME} size={24} />
        Mine only
      </button>

      <Menu>
        <MenuTrigger className={cn(pill, pillTone(filters.priority !== 'any'))}>
          <Flag />
          {filters.priority === 'any' ? 'Any priority' : PRIORITY_LABEL[filters.priority]}
          <ChevronDown className="opacity-60" />
        </MenuTrigger>
        <MenuContent align="start" className="w-[200px]">
          <MenuRadioGroup value={filters.priority} onValueChange={(v) => setFilters({ priority: v as Priority | 'any' })}>
            <MenuRadioItem value="any">Any priority</MenuRadioItem>
            <MenuSeparator />
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <MenuRadioItem key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <label className="relative flex h-9 min-w-[200px] flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-ink-3" />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value })}
          placeholder="Filter by title, project or person"
          aria-label="Filter tasks by text"
          className="h-full w-full rounded-full bg-fill pr-3 pl-9 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:bg-fill-2 focus:shadow-[0_0_0_2px_var(--accent)] [&::-webkit-search-cancel-button]:hidden"
        />
      </label>

      {filtersActive(filters) && (
        <button type="button" onClick={clearFilters} className={cn(pill, 'text-ink-2 hover:bg-fill-hover hover:text-ink')}>
          <X /> Clear
        </button>
      )}
    </Glass>
  )
}
