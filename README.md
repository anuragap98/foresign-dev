# Pane

A liquid-glass team workspace: Home dashboard, tasks, calendar, projects, insights, team and settings.
The feature reference lives in [docs/pane-reference-spec.md](docs/pane-reference-spec.md).

```bash
npm install
npm run dev
```

## Stack

- React 19 + Vite + TypeScript, Tailwind CSS v4
- Zustand for state (`src/store`), persisted to `localStorage`
- Radix primitives wrapped as shadcn-style components (`src/components/ui`)
- GSAP (+ Flip) for motion, hand-written SVG charts (`src/components/charts`)

## Where things are

| Path | What |
|---|---|
| `src/index.css` | Design tokens, dark/light themes, accents, wallpapers, glass classes |
| `src/lib/liquid.ts`, `src/components/glass/Glass.tsx` | Liquid-glass refraction: per-surface SVG displacement maps (Chromium), CSS blur elsewhere |
| `src/data/seed.ts` | Sample workspace, dated relative to today |
| `src/store/workspace.ts` | Tasks, events, projects, focus log; re-dates the sample data each new day |
| `src/store/focus.ts` | Focus timer state shared by the Home card and the island |
| `src/components/shell` | Sidebar (sliding nav lens), toolbar, tab bar, wallpaper, hotkeys |
| `src/components/overlays` | Command palette, notifications, account menu, shortcuts, focus island |
| `src/pages/home` | Home cards |
| `src/pages/tasks` | Tasks: board (`useBoardDrag.ts` is the drag and drop), list view, filters, task drawer |
| `src/store/tasksView.ts` | Board/list choice, sort, collapsed groups (remembered) and filters (per session) |
| `src/pages/calendar` | Calendar: month view, day panel, week view (click a slot to add), event drawer |
| `src/lib/calendar.ts` | Month/week grids, milestones by day, overlap layout for the week view |
| `src/pages/projects` | Projects list (cards, status filter, pinning) and project detail (timeline, milestones, burn-up, tasks) |
| `src/lib/projects.ts`, `src/components/charts/BurnUp.tsx` | Project health, next milestone, burn-up series and chart |
| `src/pages/team`, `src/lib/team.ts` | Team: person cards (presence, local time, workload), team filter, profile drawer, pending invites |
| `src/components/forms/InviteForm.tsx` | Invite form (rejects people already on the team or already invited) |
| `src/pages/settings` | Settings: profile, notifications, appearance (wallpaper previews), focus lengths, CSV export and reset |
| `src/store/settings.ts` | Profile, notification switches and focus lengths; `usePeople()` / `usePerson()` apply your edited profile |
| `src/components/shell/useReminders.ts` | Meeting, due-today and daily-digest reminders, driven by the notification switches |
| `src/pages/insights`, `src/lib/insights.ts` | Insights: KPIs over 7/30/90 days, throughput, by project, focus, workload, on time, slowest tasks, CSV export |
| `src/components/charts` | Hand-written SVG charts: rings, week bars, burn-up, line, day bars, donut |

All pages in the reference spec are built. Teammates' focus hours are sample figures; everything else is computed from the workspace data.
