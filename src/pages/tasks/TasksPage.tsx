import { Columns3, List, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Page, PageHeader, StatRow } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { useNow } from '@/lib/derive'
import { matchesFilters, taskStats } from '@/lib/tasks'
import { useTasksView } from '@/store/tasksView'
import { useUi } from '@/store/ui'
import { useWorkspace } from '@/store/workspace'
import { Board } from './Board'
import { FilterBar } from './FilterBar'
import { ListView } from './ListView'
import { TaskDrawer } from './TaskDrawer'

export function TasksPage() {
  const { taskId } = useParams()
  const tasks = useWorkspace((s) => s.tasks)
  const projects = useWorkspace((s) => s.projects)
  const { layout, setLayout, filters } = useTasksView()
  const newTask = useUi((s) => s.newTask)
  const now = useNow(60_000)

  const stats = useMemo(() => taskStats(tasks, now), [tasks, now])
  const visible = useMemo(() => tasks.filter((t) => matchesFilters(t, filters, projects)), [tasks, filters, projects])

  return (
    <Page>
      <PageHeader
        title="Tasks"
        subtitle={`${stats.open} open across ${stats.projects} projects`}
        actions={
          <>
            <Segmented
              label="Layout"
              size="md"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'board', label: <><Columns3 className="size-4" /> Board</> },
                { value: 'list', label: <><List className="size-4" /> List</> },
              ]}
            />
            <Button variant="gel" onClick={() => newTask()}>
              <Plus /> New task
            </Button>
          </>
        }
      />

      <StatRow
        stats={[
          { label: 'Open', value: stats.open },
          { label: 'Due this week', value: stats.dueThisWeek },
          { label: 'Overdue', value: stats.overdue },
          { label: 'Done this week', value: stats.doneThisWeek },
        ]}
      />

      <FilterBar />

      {layout === 'board' ? <Board tasks={visible} now={now} /> : <div data-enter><ListView tasks={visible} now={now} /></div>}

      <TaskDrawer taskId={taskId} />
    </Page>
  )
}
