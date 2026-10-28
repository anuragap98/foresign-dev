import {
  AtSign,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  Contrast,
  Coffee,
  Database,
  Download,
  Droplet,
  Layers,
  Minus,
  Monitor,
  Moon,
  Newspaper,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/field'
import { Page, PageHeader } from '@/components/ui/page'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { ME } from '@/lib/session'
import type { Hue } from '@/data/types'
import { downloadText, tasksCsv } from '@/lib/csv'
import { dayKey } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useFocus } from '@/store/focus'
import { ACCENTS, resolvedTheme, useLook, WALLS, type ThemePref } from '@/store/look'
import { FOCUS_LIMITS, useSettings, type NotifyPrefs } from '@/store/settings'
import { useActorsById, usePerson } from '@/store/people'
import { useWorkspace } from '@/store/workspace'
import { WallpaperThumb } from './WallpaperThumb'

const SECTIONS: { id: string; label: string; icon: LucideIcon; hue: Hue }[] = [
  { id: 'profile', label: 'Profile', icon: User, hue: 'blue' },
  { id: 'notifications', label: 'Notifications', icon: Bell, hue: 'pink' },
  { id: 'appearance', label: 'Appearance', icon: Palette, hue: 'purple' },
  { id: 'focus', label: 'Focus', icon: Timer, hue: 'orange' },
  { id: 'data', label: 'Data', icon: Database, hue: 'teal' },
]

function IconTile({ icon: Icon, hue, size = 30 }: { icon: LucideIcon; hue: Hue; size?: number }) {
  return (
    <span
      className={cn(`hue-${hue}`, 'inline-flex shrink-0 items-center justify-center text-white')}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'linear-gradient(160deg, color-mix(in srgb, var(--hue) 62%, #fff 38%), var(--hue) 72%)',
        boxShadow: 'inset 0 1px 1px #ffffff80, inset 0 -2px 4px #00000026',
      }}
      aria-hidden
    >
      <Icon style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
    </span>
  )
}

interface RowProps {
  icon: LucideIcon
  hue: Hue
  title: string
  hint?: ReactNode
  /** id of the control the title labels */
  htmlFor?: string
  children?: ReactNode
  below?: ReactNode
}

function Row({ icon, hue, title, hint, htmlFor, children, below }: RowProps) {
  const Title = htmlFor ? 'label' : 'p'
  return (
    <div className="border-b border-sep py-3.5 first:pt-1 last:border-b-0 last:pb-1">
      <div className="flex flex-wrap items-center gap-3">
        <IconTile icon={icon} hue={hue} />
        <div className="min-w-[140px] flex-1">
          <Title htmlFor={htmlFor} className="block text-[15px] font-semibold">
            {title}
          </Title>
          {hint && <p className="text-[13px] text-ink-2">{hint}</p>}
        </div>
        {children}
      </div>
      {below && <div className="mt-3.5">{below}</div>}
    </div>
  )
}

/** Wraps a section card with an anchor the nav can scroll to. */
function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} data-section={id} className="scroll-mt-[90px]">
      {children}
    </section>
  )
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(`settings-${id}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive((hit.target as HTMLElement).dataset.section!)
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return [active, setActive] as const
}

const SECTION_IDS = SECTIONS.map((s) => s.id)
const goTo = (id: string) => document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

function SectionNav({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const me = usePerson(ME)!
  return (
    <nav aria-label="Settings sections" className="glass sticky top-[78px] hidden rounded-card p-2.5 lg:block">
      <div className="mb-2 flex items-center gap-3 border-b border-sep px-2 pt-1 pb-3">
        <Avatar id={ME} size={40} presence />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">{me.name}</span>
          <span className="block truncate text-[12px] text-ink-2">{me.email}</span>
        </span>
      </div>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-current={active === s.id ? 'true' : undefined}
          onClick={() => onPick(s.id)}
          className={cn(
            'flex w-full items-center gap-3 rounded-[16px] px-2 py-2 text-left text-[15px] font-medium transition-[background-color,box-shadow] duration-300',
            active === s.id ? 'lens text-ink' : 'text-ink-2 hover:bg-fill-hover hover:text-ink',
          )}
        >
          <IconTile icon={s.icon} hue={s.hue} size={28} />
          <span className="flex-1">{s.label}</span>
          <ChevronRight className="size-4 text-ink-3" />
        </button>
      ))}
    </nav>
  )
}

const EMAIL = /^\S+@\S+\.\S+$/

/** Edits save to your profile in the database shortly after you stop typing. */
function ProfileSection() {
  const me = usePerson(ME)!
  const updateMe = useWorkspace((s) => s.updateMe)
  const [profile, setDraft] = useState({ name: me.name, email: me.email, role: me.role })
  const [state, setState] = useState<'idle' | 'pending' | 'saved'>('idle')
  const timer = useRef(0)
  const emailBad = profile.email.trim() !== '' && !EMAIL.test(profile.email.trim())

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const setProfile = (patch: Partial<typeof profile>) => {
    const next = { ...profile, ...patch }
    setDraft(next)
    setState('pending')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const name = next.name.trim()
      const email = next.email.trim()
      // Keep what's saved for fields that are empty or not valid yet.
      updateMe({ name: name || me.name, email: EMAIL.test(email) ? email : me.email, role: next.role.trim() || me.role })
      setState('saved')
    }, 600)
  }

  return (
    <Card title="Profile" subtitle="How the team sees you">
      <div className="mb-4 flex items-center gap-4 rounded-[20px] bg-fill p-4">
        <Avatar id={ME} size={60} presence />
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold">{me.name}</p>
          <p className="truncate text-[14px] text-ink-2">{me.role}</p>
          <p className="truncate text-[13px] text-ink-3">{me.email}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={profile.name} autoComplete="name" placeholder={me.name} onChange={(e) => setProfile({ name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={profile.email}
            autoComplete="email"
            placeholder={me.email}
            aria-invalid={emailBad}
            aria-describedby={emailBad ? 'email-hint' : undefined}
            onChange={(e) => setProfile({ email: e.target.value })}
          />
        </Field>
        <Field label="Role" className="sm:col-span-2">
          <Input value={profile.role} placeholder={me.role} onChange={(e) => setProfile({ role: e.target.value })} />
        </Field>
      </div>
      <p id="email-hint" className={cn('mt-2 text-[12px]', emailBad ? 'text-danger' : 'text-ink-3')}>
        {emailBad
          ? 'That email doesn’t look complete yet.'
          : state === 'pending'
            ? 'Saving…'
            : state === 'saved'
              ? 'Saved to your profile.'
              : 'Changes save as you type. An empty field keeps what’s saved.'}
      </p>
    </Card>
  )
}

const NOTIFY_ROWS: { key: keyof NotifyPrefs; title: string; hint: string; icon: LucideIcon; hue: Hue }[] = [
  { key: 'mentions', title: 'Mentions', hint: 'When someone @mentions you', icon: AtSign, hue: 'blue' },
  { key: 'due', title: 'Due dates', hint: 'The morning a task of yours is due', icon: CalendarClock, hue: 'orange' },
  { key: 'meetings', title: 'Meetings', hint: 'Five minutes before they start', icon: CalendarDays, hue: 'green' },
  { key: 'digest', title: 'Daily digest', hint: 'One summary at 9:00 AM', icon: Newspaper, hue: 'purple' },
  { key: 'focusEnd', title: 'Focus finished', hint: 'When a session ends', icon: Timer, hue: 'pink' },
]

function NotificationsSection() {
  const notify = useSettings((s) => s.notify)
  const setNotify = useSettings((s) => s.setNotify)
  return (
    <Card title="Notifications" subtitle="What Foresign taps you on the shoulder for">
      {NOTIFY_ROWS.map((r) => (
        <Row key={r.key} icon={r.icon} hue={r.hue} title={r.title} hint={r.hint} htmlFor={`notify-${r.key}`}>
          <Switch id={`notify-${r.key}`} checked={notify[r.key]} onCheckedChange={(on) => setNotify(r.key, on)} />
        </Row>
      ))}
    </Card>
  )
}

const ACCENT_SWATCH: Record<string, string> = {
  blue: '#1f6fe6',
  purple: '#7b3ff0',
  pink: '#cf2068',
  orange: '#d4580f',
  green: '#167f3d',
  graphite: '#4a4a54',
}

function AppearanceSection() {
  const look = useLook()
  const theme = resolvedTheme(look.theme)
  const wallLabel = WALLS.find((w) => w.id === look.wall)?.label
  const accentLabel = ACCENTS.find((a) => a.id === look.accent)?.label

  return (
    <Card title="Appearance" subtitle="The whole app re-tints through its glass">
      <Row icon={Moon} hue="indigo" title="Theme" hint="Auto follows your system">
        <Segmented
          label="Theme"
          value={look.theme}
          onChange={(v: ThemePref) => look.set({ theme: v })}
          options={[
            { value: 'light', label: <><Sun className="size-3.5" /> Light</> },
            { value: 'dark', label: <><Moon className="size-3.5" /> Dark</> },
            { value: 'auto', label: <><Monitor className="size-3.5" /> Auto</> },
          ]}
        />
      </Row>

      <Row
        icon={Droplet}
        hue="pink"
        title="Wallpaper"
        hint={wallLabel}
        below={
          <div role="radiogroup" aria-label="Wallpaper" className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {WALLS.map((w) => (
              <WallpaperThumb key={w.id} wall={w.id} label={w.label} theme={theme} selected={look.wall === w.id} onSelect={() => look.set({ wall: w.id })} />
            ))}
          </div>
        }
      />

      <Row
        icon={Sparkles}
        hue="orange"
        title="Accent"
        hint={accentLabel}
        below={
          <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={look.accent === a.id}
                aria-label={a.label}
                title={a.label}
                onClick={() => look.set({ accent: a.id })}
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-white transition-transform duration-300 ease-spring hover:scale-110',
                  look.accent === a.id && 'shadow-[0_0_0_2.5px_var(--glass-solid),0_0_0_4.5px_var(--accent-ink)]',
                )}
                style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${ACCENT_SWATCH[a.id]} 70%, #fff 30%), ${ACCENT_SWATCH[a.id]})` }}
              >
                {look.accent === a.id && <Check className="size-4" strokeWidth={3} />}
              </button>
            ))}
          </div>
        }
      />

      <Row icon={Layers} hue="teal" title="Glass" hint="Clear shows more of the wallpaper">
        <Segmented
          label="Glass"
          value={look.glass}
          onChange={(v) => look.set({ glass: v })}
          options={[
            { value: 'clear', label: 'Clear' },
            { value: 'tinted', label: 'Tinted' },
          ]}
        />
      </Row>

      <Row icon={Contrast} hue="yellow" title="Reduce transparency" hint="Solid surfaces, no frost" htmlFor="reduce-transparency">
        <Switch id="reduce-transparency" checked={look.solid} onCheckedChange={(solid) => look.set({ solid })} />
      </Row>
    </Card>
  )
}

function Stepper({ value, unit, onChange, step, limits, label }: { value: number; unit: string; onChange: (n: number) => void; step: number; limits: readonly [number, number]; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-fill p-1" role="group" aria-label={label}>
      <Button variant="ghost" size="icon" className="size-8" aria-label={`Shorter ${label.toLowerCase()}`} disabled={value <= limits[0]} onClick={() => onChange(value - step)}>
        <Minus />
      </Button>
      <span className="tabular w-16 text-center text-[15px] font-semibold" aria-live="polite">
        {value} <span className="text-[13px] font-normal text-ink-2">{unit}</span>
      </span>
      <Button variant="ghost" size="icon" className="size-8" aria-label={`Longer ${label.toLowerCase()}`} disabled={value >= limits[1]} onClick={() => onChange(value + step)}>
        <Plus />
      </Button>
    </div>
  )
}

function FocusSection() {
  const { sessionMin, breakMin, setSessionMin, setBreakMin } = useSettings()
  const phase = useFocus((s) => s.phase)
  const start = useFocus((s) => s.start)
  const setMinutes = useFocus((s) => s.setMinutes)

  return (
    <Card title="Focus" subtitle="The timer the island keeps">
      <Row icon={Timer} hue="orange" title="Session" hint="How long a focus block runs">
        <Stepper
          label="Session"
          value={sessionMin}
          unit="min"
          step={5}
          limits={FOCUS_LIMITS.session}
          onChange={(n) => {
            setSessionMin(n)
            setMinutes(useSettings.getState().sessionMin) // only takes effect while idle
          }}
        />
      </Row>
      <Row icon={Coffee} hue="green" title="Break" hint="Offered when a session ends">
        <Stepper label="Break" value={breakMin} unit="min" step={1} limits={FOCUS_LIMITS.break} onChange={setBreakMin} />
      </Row>
      <Row icon={Play} hue="blue" title="Start a session now" hint={`${sessionMin} minutes, then a ${breakMin}-minute break`}>
        <Button variant="gel" size="sm" disabled={phase !== 'idle'} onClick={() => start(sessionMin, null)}>
          {phase === 'idle' ? (
            <>
              <Play className="fill-current" /> Start
            </>
          ) : (
            'Running'
          )}
        </Button>
      </Row>
    </Card>
  )
}

function DataSection() {
  const { tasks, projects } = useWorkspace()
  const people = useActorsById()
  const [saved, setSaved] = useState<string | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const exportCsv = () => {
    const name = `foresign-tasks-${dayKey()}.csv`
    downloadText(name, tasksCsv(tasks, projects, people))
    setSaved(name)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSaved(null), 4000)
  }

  return (
    <Card title="Data" subtitle="Exports, and where your data lives">
      <Row
        icon={Download}
        hue="blue"
        title="Export tasks as CSV"
        hint={saved ? <span className="text-[var(--delta-up)]">Saved {saved}</span> : `${tasks.length} tasks, one row each`}
      >
        <Button variant="soft" size="sm" onClick={exportCsv}>
          <Download /> Export
        </Button>
      </Row>
      {import.meta.env.DEV && (
        <Row
          icon={RotateCcw}
          hue="pink"
          title="Reset demo data"
          hint={
            <>
              Rebuild the local database and sample workspace with <code className="rounded bg-fill-2 px-1 text-[12px]">npm run db:reset</code>
            </>
          }
        />
      )}
      <Row icon={Database} hue="teal" title="Where things are kept" hint="Your workspace is stored in Foresign’s database and shared with your team. Notification switches, focus lengths and the look stay on this device." />
    </Card>
  )
}

export function SettingsPage() {
  const [active, setActive] = useScrollSpy(SECTION_IDS)
  const pick = (id: string) => {
    setActive(id)
    goTo(id)
  }

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Your profile, the look of Foresign, and when it nudges you" />

      {/* Phones: sections as a scrolling row of chips */}
      <div data-enter className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            className={cn('flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-[14px] font-medium', active === s.id ? 'lens' : 'bg-fill text-ink-2')}
          >
            <IconTile icon={s.icon} hue={s.hue} size={24} /> {s.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-[var(--gap)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <div data-enter className="self-stretch max-lg:hidden">
          <SectionNav active={active} onPick={pick} />
        </div>
        <div className="flex max-w-[860px] flex-col gap-[var(--gap)]">
          <Section id="profile">
            <ProfileSection />
          </Section>
          <Section id="notifications">
            <NotificationsSection />
          </Section>
          <Section id="appearance">
            <AppearanceSection />
          </Section>
          <Section id="focus">
            <FocusSection />
          </Section>
          <Section id="data">
            <DataSection />
          </Section>
        </div>
      </div>
    </Page>
  )
}
