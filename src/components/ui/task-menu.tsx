import { ArrowRight, Ellipsis, PanelRightOpen } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Task } from '@/data/types'
import { STATUS_LABEL } from '@/data/types'
import { STATUSES } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/workspace'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './menu'

/** "⋯" menu on a task: the keyboard-friendly way to move it between columns. */
export function TaskMenu({ task, className }: { task: Task; className?: string }) {
  const moveTask = useWorkspace((s) => s.moveTask)
  const navigate = useNavigate()

  return (
    <Menu>
      <MenuTrigger
        data-no-drag
        aria-label={`Move or open “${task.title}”`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex size-7 items-center justify-center rounded-full text-ink-2 outline-none transition-colors hover:bg-fill-2 hover:text-ink data-[state=open]:bg-fill-2',
          className,
        )}
      >
        <Ellipsis className="size-[18px]" />
      </MenuTrigger>
      <MenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {STATUSES.filter((s) => s !== task.status).map((s) => (
          <MenuItem key={s} onSelect={() => moveTask(task.id, s, null)}>
            <ArrowRight /> Move to {STATUS_LABEL[s]}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onSelect={() => navigate(`/tasks/${task.id}`)}>
          <PanelRightOpen /> Open task
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
