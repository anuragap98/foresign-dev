import { useEffect, useLayoutEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const TABLES = [
  'tasks', 'subtasks', 'comments', 'projects', 'milestones', 'project_pins', 'events', 'event_attendees',
  'notifications', 'activity', 'invites', 'runs', 'artifacts', 'gates', 'actors', 'focus_sessions',
]

/**
 * Calls `onChange` (debounced) whenever anything in the workspace changes:
 * your own saves echoing back, a teammate's edit, or an agent's update.
 */
export function useRealtime(workspaceId: string | undefined, onChange: () => void) {
  const latest = useRef(onChange)
  useLayoutEffect(() => {
    latest.current = onChange
  })

  useEffect(() => {
    if (!workspaceId) return
    let timer = 0
    const bump = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => latest.current(), 400)
    }
    const channel = supabase.channel(`workspace:${workspaceId}`)
    for (const table of TABLES)
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `workspace_id=eq.${workspaceId}` }, bump)
    channel.subscribe()
    return () => {
      window.clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [workspaceId])
}
