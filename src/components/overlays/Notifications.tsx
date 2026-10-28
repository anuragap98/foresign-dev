import { Bell, BellOff } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { useNow } from '@/lib/derive'
import { relTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useSettings } from '@/store/settings'
import { useWorkspace } from '@/store/workspace'

export function NotificationsPopover() {
  const all = useWorkspace((s) => s.notices)
  const markAllRead = useWorkspace((s) => s.markAllRead)
  const showMentions = useSettings((s) => s.notify.mentions)
  const now = useNow(60_000)
  // Mentions are hidden, not deleted, when switched off in Settings.
  const notices = showMentions ? all : all.filter((n) => n.kind !== 'mention')
  const unread = notices.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Bell />
          {unread > 0 && (
            <span className="absolute top-[7px] right-[8px] size-2 rounded-full bg-danger shadow-[0_0_0_2px_var(--glass-thick)]" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(360px,calc(100vw-24px))]">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <h2 className="text-[15px] font-semibold">Notifications</h2>
          <Button variant="link" size="none" className="text-[13px]" disabled={!unread} onClick={markAllRead}>
            Mark all read
          </Button>
        </div>
        {notices.length ? (
          <ul className="scroll-thin max-h-[min(420px,60vh)] overflow-y-auto px-1.5 pb-1.5">
            {notices.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-[16px] px-2.5 py-2.5 transition-colors hover:bg-fill-hover">
                <span className={cn('mt-3.5 size-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-accent-ink')} />
                {n.from === 'foresign' ? (
                  <span className="gel flex size-[30px] shrink-0 items-center justify-center rounded-full">
                    <Bell className="size-4" />
                  </span>
                ) : (
                  <Avatar id={n.from} size={30} />
                )}
                <div className="min-w-0 text-[14px]">
                  <p className={cn('leading-snug', n.read ? 'text-ink-2' : 'text-ink')}>{n.text}</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">{relTime(n.at, now.getTime())}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center justify-center gap-2 px-4 pt-4 pb-6 text-[14px] text-ink-3">
            <BellOff className="size-4" /> You’re all caught up
          </p>
        )}
        <div className="border-t border-sep px-4 py-2.5">
          <Link to="/settings" className="text-[13px] font-medium text-accent-ink hover:underline">
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
