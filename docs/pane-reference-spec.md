# Pane: reference feature spec

Source: https://demo.codeandchill.store/pane/ (captured 2026-10-24, dark theme, "Ash" wallpaper, blue accent).
Pane is a single-page team workspace ("management panel") with a liquid-glass UI. This document lists every
feature, screen, form, interaction and design token observed, so it can be rebuilt from scratch.

> The reference is a paid template ("Buy this template"). Use this as a functional and visual reference only;
> write our own code, copy and assets rather than lifting theirs.

---

## 1. Tech observations

| Area | What they use |
|---|---|
| App type | Vanilla SPA (no React), hash router (`#/home`, `#/tasks/:id` …), code-split per page (`home-*.js`, `charts-*.js`) |
| Animation | GSAP 3.15 |
| Glass | Per-element SVG `<filter>`: `feImage` (a displacement map generated on canvas → blob URL) → `feDisplacementMap scale≈52` → `feGaussianBlur σ≈5.5` → `feColorMatrix saturate 1.7`, applied as `backdrop-filter: url(#lgN)`. ~117 filters on the page, one per glass surface, so the refraction matches each element's size |
| Wallpaper | Full-screen inline SVG (`.wall__svg`, 1600×1000, `slice`) with gradient blobs + glass "bubbles"; colours come from CSS vars (`--wbg1/2`, `--wa1/2` …) switched by `html[data-wall]` |
| Theming | Attributes on `<html>`: `data-theme` (dark/light), `data-wall`, `data-accent`, `data-glass` (clear/tinted), class `is-solid` (reduce transparency) |
| Persistence | `localStorage`: `pane:look` (appearance), `pane:tasks-view` (board/list) and the workspace data (tasks, events, edits). "Reset demo data" restores the seed |
| Dialogs | Native `<dialog>`: `#modal` (centred forms), `#drawer` (right-side sheet), `#finder` (command palette). `html:has(dialog[open]) {overflow:hidden}` |
| Fonts | System stack: `-apple-system, "SF Pro Text/Display", Inter, "Segoe UI", system-ui` |

---

## 2. Design system

### 2.1 Tokens (`:root`)
```css
--fs-xs:12px; --fs-sm:13px; --fs-md:15px; --fs-lg:17px; --fs-xl:22px;
--fs-title: clamp(34px, 2.2vw + 14px, 58px);
--r-xl:30px; --r-lg:24px; --r-md:18px; --r-sm:12px;           /* cards use 30px */
--gap: clamp(12px, .6vw + 8px, 20px);
--gutter: clamp(14px, 1.4vw + 6px, 32px);
--side-w:252px; --frame:1840px;                                  /* max content frame */
--ease:   cubic-bezier(.22,.8,.24,1);
--spring: cubic-bezier(.34,1.45,.55,1);
--ring-tasks:#f0145a; --ring-focus:#2fbf4f; --ring-meet:#0aa6d8;
--accent-soft: color-mix(in srgb, var(--accent) 14%, transparent);
```

### 2.2 Dark theme (default)
```css
--bg:#0a0a0c; --text:#f5f5f7; --text-2:#ebebf5b3; --text-3:#ebebf58c;
--glass: rgb(26 26 36 / .42); --glass-chrome: rgb(28 28 38 / .36);
--glass-thick:#1a1a1edb; --glass-solid:#1c1c20;
--blur:14px; --blur-thick:30px; --sat:175%;
--depth: inset 0 1px 1px #ffffff4d, inset 0 -1px 1px #ffffff1a,
         inset 3px 4px 12px -6px #ffffff3d, inset -4px -6px 14px -8px #ffffff1f,
         inset 0 -16px 28px -18px #00000073;              /* the "glass rim" */
--shadow: 0 1px 2px #0000004d, 0 24px 48px -22px #000000bf;
--fill:#9696af29; --fill-2:#9696af42; --sep:#ffffff1a;
--lens: linear-gradient(180deg,#ffffff4d,#ffffff1a);      /* selected nav pill / segmented thumb */
--lens-glow: inset 0 1px 1px #ffffff8c, inset 0 -2px 5px #ffffff1f, inset 0 0 0 .5px #ffffff4d, 0 8px 18px -8px #0009;
--blue:#4b8eff; --purple:#a07cff; --pink:#f2649f; --orange:#ff8a3d;
--green:#34c46b; --teal:#22c3c0; --indigo:#7a7af0; --yellow:#f5b82e; --danger:#ff5a64;
--ring-tasks:#ff2d6f; --ring-focus:#4ade6b; --ring-meet:#22c3f0;
```
Priority text colours (dark): urgent `#ff8b92`, high `#ffb27a`, medium `#8fb8ff`. Delta up `#5fd88a`, down `#ff8189`. Running focus timer `#ffb340`.

### 2.3 Light theme
```css
--bg:#e4e9f4; --text:#0f1017; --text-2:#161826b3; --text-3:#1618268f;
--glass: rgb(255 255 255 / .32); --glass-thick:#fafcffc2; --glass-solid:#f3f5fa;
--blur:12px; --blur-thick:28px; --sat:190%;
--depth: inset 0 1px 1px #ffffffe6, inset 0 -1px 1px #fff6, inset 3px 4px 12px -6px #ffffffd9,
         inset -4px -6px 14px -8px #ffffff8c, inset 0 -14px 26px -18px #14286e33;
--shadow: 0 1px 2px #101e5a14, 0 22px 44px -22px #101e5a73;
--lens: linear-gradient(180deg,#fffffff2,#ffffff8c);
```

### 2.4 Accents (`data-accent`, dark values: `--accent` / `--accent-ink`)
blue `#1f6fe6/#7db4ff` · purple `#7b3ff0/#c0a2ff` · pink `#cf2068/#ff8fbb` · orange `#c4500f/#ffad72` · green `#167f3d/#72dc98` · graphite `#4a4a54/#f4f4f7` (switches go green `#30c158`).

### 2.5 Wallpapers (`data-wall`, base gradient 135°)
Ash `#232428` (default, flat) · Sand `#3a2a1e` · Sage `#1f2c23` · Aurora `#090b1c→#0c0f24` · Smoke `#070708→#0f0f12` · Tide `#03112a→#0d0a2c` · Bloom `#130a2b→#2a0c22` · Ember `#200a04→#2a0a12` · Grove `#04170e→#041a1e` · Dusk `#0f1016→#17121c`.
The vivid ones (Aurora, Tide, Bloom, Ember, Grove) add large flowing colour bands and glass bubbles behind the UI; this is where the refraction is most visible.

### 2.6 Glass variants
- `.glass`: cards (radius 30px, `--glass` fill, `--depth` rim, `--shadow`, displacement filter)
- `.glass--thick`: popovers, palette, drawers (`--glass-thick`, stronger blur)
- `.glass-chrome`: sidebar + top toolbar
- Glass mode **Clear** (more wallpaper shows through) vs **Tinted** (default)
- **Reduce transparency** → `html.is-solid`: all glass vars become `--glass-solid`, no frost

### 2.7 Recurring components
- **Stat chip**: small glass tile with label + big number (e.g. `Done today 2 / 8`)
- **Segmented control** (`.seg`, `.seg__btn[aria-pressed]`) with a sliding lens thumb
- **Project chip** (`.pchip.hue--X`): coloured dot + project name
- **Priority badge** (`.prio--urgent|high|medium|low`): urgent has a flag icon, tinted background
- **Avatar** with status dot (green online, purple focus, orange meeting, grey away) and avatar stacks with `+N`
- **Progress ring** / **progress bar** / subtask meter (`tk-meter`, scaleX)
- **Ripple** on buttons (`.ripple-wrap/.ripple`), primary buttons are gel-style blue pills with glow
- Icon tiles: rounded-square gradient tiles for project icons and settings sections

---

## 3. Motion inventory
- **Page enter**: cards start as blurred, slightly scaled glass blobs and settle into place, staggered. The title reveals with a mask. Stat numbers count up.
- **Sidebar nav lens**: the selected-item glass pill slides/morphs between items on route change (it travels from the old item to the new one).
- **Segmented controls**: thumb slides with `--spring`.
- **Theme / wallpaper / accent change**: whole app re-tints live through the glass (animated).
- **Popovers / menus**: scale + fade from their trigger.
- **Drawer**: slides in from the right; backdrop fades (`@keyframes backdrop-in`).
- **Card expand** ("Expand" ↗ on a card): the card grows into a large focus overlay (`.is-focus`), with other cards dimmed and blurred behind; Esc collapses.
- **Kanban drag**: pointer-based drag (`html.tk-dragging`, `.tk-board.is-dragging`, target column `.tk-col.is-over` glow).
- **Focus "island"**: Dynamic-Island-style black pill at top centre; it expands to show the session and collapses to a mini timer.
- `@keyframes flash`: highlight on a newly added or moved item.

---

## 4. App shell (all pages)

### 4.1 Layout
- Left **sidebar** (252px, floating glass, full height, inset 14px):
  - Logo tile + "Pane"
  - Nav: Home, Tasks (badge = my open count, `7`), Calendar, Projects, Insights, Team, Settings
  - **PINNED** section: pinned projects with colour dot (Tide mobile app, Orbit 2.0 launch), linking to `#/projects/:id`
  - Footer: avatar, "Lin Zhao", "Product Lead", chevron → **Account menu**
- Top-right floating **toolbar** pill: Search field (`⌘K` hint), `+` Create, theme toggle (sun/moon), bell with red dot (unread count)
- Main content max frame 1840px, fluid gutters.
- **Mobile**: sidebar becomes a bottom **tab bar** (Home, Tasks, Calendar, Projects, Search).

### 4.2 Search / command palette (`⌘K` or `/`)
- Centred glass input "Search tasks, projects, people…" with `esc` hint; result list below.
- Empty query shows **PAGES** (Home, Tasks, Calendar, Projects, each "Go to page") and **ACTIONS** (New task "Add to the board", Start a focus session "25 minutes").
- Typing groups results under **TASKS** (title + "Project · Status"), **PROJECTS** (name + summary), **CALENDAR** (title + "Today · 11:00 AM"), presumably **PEOPLE**. Matches are highlighted; the first row is selected (accent fill, chevron); arrow keys + Enter.

### 4.3 Create menu (`+`, shortcut `N`)
New task · New event · New project · Focus for 25 min.

### 4.4 Notifications (bell)
Popover "Notifications" + **Mark all read**. Rows: avatar, text, relative time, unread blue dot.
Seed: Nia mentioned you on "Glass material tokens" (19 min) · Kwame asked for your review on "Accessibility audit: Dynamic Type" (1 h) · Orbit launch film cut is ready to watch (3 h) · Peter moved your 1:1 to tomorrow, 1:00 PM (1 d).

### 4.5 Account menu
Settings (gear) · Keyboard shortcuts · Light / Dark / Match system (check on active) · **Reset demo data** (red).

### 4.6 Keyboard shortcuts (drawer, also `?`)
| Action | Keys |
|---|---|
| Search | `⌘K` or `/` |
| Create… | `N` |
| New task | `T` |
| Start a focus session | `F` |
| Go to a page | `G` then `H`/`T`/`C`/`P`/`I`/`M`/`S` (Home, Tasks, Calendar, Projects, Insights, teaM, Settings) |
| Close | `Esc` |
| This list | `?` |

### 4.7 Focus island (global)
Starting focus anywhere opens the island: "Focus · 24:58", a toast-like line "Focus started — notifications are held", expanded card "Focus session · 25-minute block · timer · **+5 min**". Collapsed it shows a ring + "Focus" + time. Ending the session logs it to "Focused today".

### 4.8 Shared forms (modal, header: ✕ · title · primary button)
**New task** (Add): Title* ("What needs doing?") · Project (select) · Assignee (12 people) · Priority (Low/Medium/High/Urgent, default Medium) · Due (date, default today) · Status (To do/In progress/In review/Done) · Estimate (hours, default 2).

**New event** (Add): Title ("Design review") · Date · Starts (time, default 12:00) · Length (15/30/45 min, 1 h, 1½ h, 2 h; default 30) · Type (Meeting, Focus block, Review, Deadline, Team) · Project (None + projects) · Where ("Video call").

**New project** (Create): Name ("Spring launch") · What is it for? (textarea, "One or two sentences the whole team can repeat.") · Lead · Colour (Blue, Purple, Pink, Orange, Green, Teal, Indigo, Yellow) · Target date (default +30 days) · Icon (Folder, Rocket, Leaf, Flame, Phone, Grid, Chart, Sparkle).

---

## 5. Home (`#/home`)
Header: **"Good morning, Lin"** (greeting by time of day) + "Friday, October 23 · 4 meetings and 6 tasks left today". Buttons: **+ New task**, **Next: 11:00 AM** (blue, video icon; jumps to next event). Stat chips: Done today `2/8` · Focus today `1.1h` · Overdue `0`.

Bento grid of glass cards:

1. **Today: "Close your rings"**: Apple-Activity-style triple concentric rings (Tasks pink, Focus green, Meetings cyan) + legend: Tasks `2/8`, Focus `1.1h/2h`, Meetings `1/4`.
2. **Up next** (link → Calendar): highlighted next-event card ("in 20 min", title, "11:00 AM – 11:45 AM · Video call", avatar stack, **Join** button), then a compact list with coloured left bar + time (Lunch & learn 12:30 PM, Deep work 2:00 PM, Orbit launch film cut 4:00 PM). The countdown updates live.
3. **Focus: "The island keeps the time"**: segmented 15m/25m/50m; circular timer `25:00 Ready`; "Focus on" select (No task — just focus / my open tasks); **Start focus**. Running state: orange timer "Focusing", "Focusing on 25-minute block", **Pause** / **End**. Footer: "Focused today 1.1h · 2 sessions" + progress bar.
4. **My tasks: "Due today and late"** (link "All tasks" → Tasks): rows with round checkbox, title, project chip, due label, priority badge. Checking strikes it through (completed stays in the list, faded).
5. **This week: "Tasks the team finished"**: big `25 finished so far`, delta `-4% vs last week`, 7 vertical glass bars Mon–Sun (bar label e.g. "Thu: 8 done"; today highlighted). **Expand ↗** turns it into the focused overlay.
6. **Projects** (See all): rows with icon tile, name, "In progress · due Dec 2", coloured progress bar, %, avatar stack `+N`. Row → project page.
7. **Right now**: segmented **Team | Activity**.
   - Team: avatar + status dot, name, "In focus · until 11:30 AM" / "In a meeting · Tide sync review" / "Online · Product Designer". Row → `#/team/:id`.
   - Activity: "Kwame moved "Accessibility audit: Dynamic Type" to In review · 26 min ago · Tide mobile app", etc.

---

## 6. Tasks (`#/tasks`, detail `#/tasks/:id`)
Header: "Tasks · 32 open across 5 projects"; segmented **Board | List** (remembered); **+ New task**.
Stats: Open 32 · Due this week 12 · Overdue 0 · Done this week 25.

**Filter bar** (one glass pill): **All projects ▾** (menu with open counts per project: All 32, Tide 9, Facet 7, Orbit 6, Sprout 4, Q4 brand 6, Northstar 0) · **Mine only** (toggle with avatar) · **Any priority ▾** (Any/Urgent/High/Medium/Low) · text filter "Filter by title, project or person".

### 6.1 Board view (Kanban)
Columns with status dot, name, count and `+` (opens New task with that status): **To do (14) · In progress (10) · In review (8) · Done (30)**. Done is capped at 8 with **"Show all 30"**.
Card (`article.tk-card.hue--X`): project chip + priority badge, `⋯` menu, title, optional subtask meter `2/3`, footer: due (calendar icon; "Today" in accent), comment count, assignee avatar. Done cards show a check and struck-through title.
- `⋯` menu: Move to To do / In progress / In review / Done · Open task.
- Drag and drop between columns (pointer-based, column highlights on hover).

### 6.2 List view
Card "All tasks · 62 on the board" with sort segmented **Due | Priority**. Collapsible groups per status (`▾ To do 14`). Row: checkbox, title, project chip, due, priority pill (Medium/Low shown too), avatar.

### 6.3 Task drawer (right sheet, deep-linkable)
Project chip + priority · title · status segmented (To do/In progress/In review/Done) · tiles: Assignee (avatar), Due, Estimate (`6 h`), Project (link) · **Subtasks** `2/3` with checkboxes + "Add a subtask" + Add · **Comments** ("No comments yet.", "Write a comment" + Post) · footer: **Focus on this** (starts the island on this task), **Mark done**, **Delete task**.

---

## 7. Calendar (`#/calendar`)
Header: "October 2026 · 8 events this week"; `‹ Today ›`; segmented **Month | Week**; **New event**.

### 7.1 Month view
Mon–Sun grid; leading/trailing days dimmed; each day is a glass tile. Event pills (coloured left bar, truncated title); "+2" overflow; project **milestone badges** (coloured `P` square, e.g. "Saturday, October 3, milestone: Navigation prototype…"). Today circled in accent; the selected day has an accent outline. Clicking a day updates the side panel.

### 7.2 Day side panel
"Today / Tuesday · October 27 · 3 events" + **Add event**. Milestone banner at the top (e.g. "Launch film final cut · Orbit 2.0 launch milestone"). Timeline rows: time + duration, coloured bar, title, place (pin/video icon), avatar stack, type chip (Meeting / Review / Team / Focus block). A red **now line** ("10:43 AM") on today. Below: **Due today / Due this day** task list + "6 more in Tasks".

### 7.3 Week view
"Oct 26 – Nov 1 · 12 events", hint "Click an empty slot to add". Day headers `MON 26`…, hours 8 AM–6 PM, weekend columns shaded. Event blocks are coloured by type/project with title + "10:00 AM · Studio A"; short events render as slim pills. Clicking an empty slot opens New event pre-filled with that date and time.

### 7.4 Event drawer
Type chip (Review) · title · tiles: When ("Tue, Oct 27 · 11:00 AM – 12:00 PM"), Where, Project (chip), People (avatars + count) · **Join call** (blue) · **Remove**.

---

## 8. Projects (`#/projects`)
Header "Projects · 5 in flight · 1 shipped"; segmented **All | Active | Planning | Shipped**; **+ New project**.
Stats: Active 4 · Shipped 1 · On track 50% · Due this month 1.

Two-column grid of project cards: gradient icon tile, name, status pill (In progress green / In review orange / Planning / Shipped), **star = pin to sidebar** (toggle), summary, inner "Next milestone" panel (progress ring with %, milestone name, "Oct 27 · in 4 days"), footer: avatar stack `+N`, `5/11 tasks`, due date.

### 8.1 Project detail (`#/projects/:id`)
Header: back button, large icon tile, name, summary; **Pinned** toggle (star) + **New event**. Stats: Progress 47% · Open tasks 9 · Done 8 · Days left 41.
- **Overview**: Lead (avatar link), Status pill; a **timeline bar** from Started (Sep 23) to Due (Dec 2) with milestone dots and a "Today" marker.
- **People (6)**: avatar, name, role/status ("Lead · In a meeting", "Online", "In focus", "Away").
- **Milestones: "1 of 4 reached"**: checkable rows (Complete/Reopen milestone): Navigation prototype signed off (Oct 3 · Done) · Offline sync in beta (Oct 29 · in 6 days · **Next**) · TestFlight to 500 users · App Store release.
- **Coming up** (→ Calendar): date tiles (OCT 23) + event title/time/place + avatars.
- **Recent activity** feed for the project.
- **Burn-up chart**: "Tasks done against the total, over the project's life": solid accent "Done" line + dashed "Total" line, y-axis 0/10/20 tasks, x dates. Expandable.
- **Tasks: "9 open · 8 done"** + **Add task**: grouped To do / In progress / In review / Done (collapsed, "Show"), rows with priority + due.

---

## 9. Team (`#/team`, profile `#/team/:id`)
Header "Team · 12 people · 4 teams"; segmented **All | Product | Design | Engineering | Marketing**; **Invite**.
Stats: Online now `9/12` · In focus 2 · Average load 32%.

Grid of person cards: avatar + status dot, name (+ "You" badge), role, team chip; status ("Online" / "In focus" / "In a meeting" / "Away") and **local time** with sun/moon icon + city + offset ("1h ahead", "Same time as you", "6h behind", "Your time"); **Workload** bar `19h / 32h` (green, turns warning near capacity); footer: `7 open tasks`, **Profile**, message icon button.

### 9.1 Profile drawer (`#/team/nia`)
Hero: big avatar, name, role, team chip, status · tiles: Email (mailto), Local time · load ring `22% load` + Workload `7h of 32h`, Focus this week `4h`, Open tasks `2` · **Open tasks** list (with priority) · **This week** events (date tile) · **Projects** with role (Lead / Member) · footer **Message Nia** and **Email**.

### 9.2 Invite modal
"Invite someone · They join as soon as they accept." Fields: Name ("Sam Rivera"), Email ("sam@pane.app"), Role ("Product Designer"), Team (Product/Design/Engineering/Marketing). Button **Send invite**.

---

## 10. Insights (`#/insights`, in the nav as well)
"How the team worked over the last 30 days"; range segmented **7D | 30D | 90D**; **Export CSV**.
KPIs with deltas: Completed 131 (+21%) · On-time rate 97% (−2 pts) · Focus hours 279h (+1%) · Avg cycle time 4.3d (+0.8d).
Cards: **Throughput** (daily line, this period vs previous, **Table** toggle for an accessible data table, Expand) · **By project** (donut + table: Project / Completed / Share) · **Focus** (daily bars with hour labels, "about 9.3h a day") · **Workload** (per-person open hours vs capacity bar, "All within capacity", legend Open work / Capacity / Over capacity) · **On time** (97%, 127 on time / 4 late) · **Slowest open tasks** (title, project, owner, `49d open`).

---

## 11. Settings (`#/settings`)
"Your profile, the look of Pane, and when it nudges you". Two columns: a left **section nav** card (user header with avatar + email, then iOS-style rows with coloured icon tiles: Profile (blue), Notifications (pink), Appearance (purple), Focus (orange), Data (teal), with chevrons; scroll-spy highlights the active one) and a right column of section cards. Each setting row has an icon tile, a label and a sub-label.

1. **Profile: "How the team sees you"**: header with avatar/name/role/email; inputs Name, Email, Role (live-updates the sidebar footer).
2. **Notifications: "What Pane taps you on the shoulder for"** (switches):
   Mentions ✓ "When someone @mentions you" · Due dates ✓ "The morning a task of yours is due" · Meetings ✓ "Five minutes before they start" · Daily digest ✗ "One summary at 9:00 AM" · Focus finished ✓ "When a session ends".
3. **Appearance: "The whole app re-tints through its glass"**
   - Theme: Light / Dark / Auto ("Auto follows your system")
   - Wallpaper: 10 thumbnails, each a mini app mock rendered in that wallpaper (Ash, Sand, Sage, Aurora, Smoke, Tide, Bloom, Ember, Grove, Dusk); selected one has an accent ring + check
   - Accent: 6 swatches (Blue, Purple, Pink, Orange, Green, Graphite)
   - Glass: Clear / Tinted ("Clear shows more of the wallpaper")
   - Reduce transparency switch ("Solid surfaces, no frost")
4. **Focus: "The timer the island keeps"**: Session `25 min` and Break `5 min` steppers (Shorter / Longer buttons); "Start a session now · 25 minutes, then a 5-minute break" + **Start**.
5. **Data: "Everything stays in this browser"**: **Export tasks as CSV** ("62 tasks, one row each") · **Reset demo data** ("Back to the sample workspace") → confirm dialog "Reset demo data? Tasks, events and your edits go back to the sample workspace." + **Reset**.

---

## 12. Data model (inferred)

```ts
type Status = 'todo' | 'doing' | 'review' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Hue = 'blue'|'purple'|'pink'|'orange'|'green'|'teal'|'indigo'|'yellow';

interface Person { id: string; name: string; role: string; team: 'Product'|'Design'|'Engineering'|'Marketing';
  status: 'online'|'focus'|'meeting'|'away'; statusUntil?: string; city: string; tz: string;
  capacityH: number; email: string; photo: string; }

interface Project { id: string; name: string; summary: string; lead: string; members: string[];
  hue: Hue; icon: 'folder'|'rocket'|'leaf'|'flame'|'phone'|'grid'|'chart'|'sparkle';
  status: 'planning'|'progress'|'review'|'shipped'; started: string; due: string; pinned: boolean;
  milestones: { title: string; date: string; done: boolean }[]; }

interface Task { id: string /* `${projectId}-${n}` */; title: string; projectId: string; assignee: string;
  priority: Priority; status: Status; due: string; estH: number; createdAt: string; doneAt?: string;
  subtasks: { title: string; done: boolean }[]; comments: { by: string; text: string; at: string }[]; }

interface CalEvent { id: string; title: string; date: string; start: string; lenMin: number;
  kind: 'meeting'|'focus'|'review'|'deadline'|'team'; projectId?: string; place?: string; people: string[]; }

interface FocusSession { taskId?: string; minutes: number; startedAt: string; endedAt?: string; }
interface Notification { id: string; from: string; text: string; at: string; read: boolean; }
interface Activity { who: string; text: string; projectId: string; at: string; }

interface Look { theme: 'light'|'dark'|'auto'; wall: string; accent: string; glass: 'clear'|'tinted'; solid: boolean; }
```

---

## 13. Seed data (for parity)

**People** (name · role · team · city · capacity): Lin Zhao (you) · Product Lead · Product · London · 32h ·
Nia Okoro · Design Lead · Design · Lagos · 32h · Elise Marchand · Product Designer · Design · Lyon · 36h ·
Kwame Asante · iOS Engineer · Engineering · Accra · 36h · Peter Lund · Engineering Manager · Engineering · Copenhagen · 28h ·
Freya Nilsen · Brand Designer · Design · Bergen · 32h · Omar Saleh · Backend Engineer · Engineering · Amman · 36h ·
Haruto Sato · Frontend Engineer · Engineering · Tokyo · 36h · Inés Duarte · Marketing Lead · Marketing · Lisbon · 32h ·
Vikram Nair · Data Analyst · Product · Bengaluru · 32h · Camila Ortiz · Content Strategist · Marketing · Mexico City · 28h ·
Malik Johnson · QA Engineer · Engineering · Atlanta · 36h.

**Projects**
| id | Name | Status | Due | Summary |
|---|---|---|---|---|
| orbit | Orbit 2.0 launch | In progress | Nov 4 | Everything the public sees on launch day: site, film, press kit and the waitlist email. |
| tide | Tide mobile app | In progress | Dec 2 | The 3.0 rebuild of the Tide app: new home, offline sync and a calmer onboarding. |
| facet | Facet design system | In progress | Dec 22 | One set of tokens, components and docs for every Pane surface, light and dark. |
| sprout | Sprout onboarding | In review | Oct 28 | A first-week path that gets new teams to their first finished project. |
| ember | Q4 brand campaign | Planning | Dec 30 | Out-of-home and social for the winter season, built around "work you can see through". |
| northstar | Northstar analytics | Shipped | Oct 11 | One trusted metric per team and a weekly digest everyone actually opens. |

Sample tasks: Moodboard round one, Media plan budget, Agency shortlist, Campaign line options, Photography call sheet,
Launch-day run of show, Founder blog post, Menu + context menu, Avatar stack, Image cache eviction, Pull-to-refresh spring,
Approve Orbit press kit, Reply to Facet token questions, Plan next sprint goals, Creative brief draft, Day-3 nudge email,
Partner quotes sign-off, Motion guidelines page, Crash on cold launch in iOS 18, Component usage analytics, Settings search,
Onboarding copy review, Review Tide release checklist, Write Sprout read-out summary, Invite flow friction log, Pricing page FAQ,
Product Hunt assets, Read-out deck, Date picker, Push notification permissions flow, Token export to iOS,
Accessibility audit: Dynamic Type, plus about 30 done tasks.

Sample events: Stand-up (9:30, Huddle room), Tide sync review (11:00, Video call), Lunch & learn: glass materials (12:30, Kitchen),
Deep work (2:00 PM focus block), Orbit launch film cut (4:00 PM, Studio B), Design critique, Customer call: Halvard, Retro,
1:1 Peter, Offline sync demo, Brand brief kickoff, Team lunch, Launch film final, Sprout read-out, Quarterly planning,
Hiring panel, Offsite.

---

## 14. Routes
`#/home` · `#/tasks` · `#/tasks/:taskId` (drawer) · `#/calendar` · `#/projects` · `#/projects/:id` · `#/insights` ·
`#/team` · `#/team/:personId` (drawer) · `#/settings`. Document title is `"<Page> · Pane"`.
