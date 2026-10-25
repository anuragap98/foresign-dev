import { useEffect } from 'react'
import { ME } from '@/data/seed'
import { eventsOn } from '@/lib/derive'
import { addDays, dayKey, MIN } from '@/lib/time'
import { useSettings } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

/**
 * Sends the reminders switched on in Settings into the notifications list:
 * meetings five minutes ahead, the morning due-today nudge and the 9:00
 * digest. Each fires once (keyed by event or day).
 */
export function useReminders() {
  useEffect(() => {
    const check = () => {
      const { notify: prefs } = useSettings.getState()
      const { events, tasks, notify } = useWorkspace.getState()
      const now = new Date()
      const today = dayKey(now)

      if (prefs.meetings) {
        for (const e of eventsOn(events, now)) {
          if (e.kind === 'focus' || !e.people.includes(ME)) continue
          const mins = Math.ceil((new Date(e.start).getTime() - now.getTime()) / MIN)
          if (mins > 0 && mins <= 5)
            notify({ from: 'pane', kind: 'reminder', text: `${e.title} starts in ${plural(mins, 'minute')}${e.place ? ` · ${e.place}` : ''}` }, `meet:${e.id}`)
        }
      }

      if (prefs.due && now.getHours() >= 8) {
        const due = tasks.filter((t) => t.assignee === ME && t.status !== 'done' && t.due === today).length
        if (due) notify({ from: 'pane', kind: 'reminder', text: `${plural(due, 'task')} of yours ${due === 1 ? 'is' : 'are'} due today` }, `due:${today}`)
      }

      if (prefs.digest && now.getHours() >= 9) {
        const yesterday = dayKey(addDays(now, -1))
        const doneYesterday = tasks.filter((t) => t.doneAt && dayKey(new Date(t.doneAt)) === yesterday).length
        const meetings = eventsOn(events, now).filter((e) => e.kind !== 'focus' && e.people.includes(ME)).length
        notify(
          { from: 'pane', kind: 'update', text: `Daily digest: the team finished ${plural(doneYesterday, 'task')} yesterday, and you have ${plural(meetings, 'meeting')} today` },
          `digest:${today}`,
        )
      }
    }

    check()
    const t = window.setInterval(check, 30_000)
    // Re-check straight away when a switch is turned on.
    const unsub = useSettings.subscribe((s, prev) => s.notify !== prev.notify && check())
    return () => {
      window.clearInterval(t)
      unsub()
    }
  }, [])
}
