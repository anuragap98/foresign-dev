# Pane

A liquid-glass workspace for teams and the coding agents working with them: Home, tasks, calendar,
projects, insights, team and settings, backed by Postgres. Coding agents connect over MCP, hooks and
OpenTelemetry to plan work, report progress and cost, and wait for people at approval gates.
The original feature reference is in [docs/pane-reference-spec.md](docs/pane-reference-spec.md).

## Run it locally

Needs Node 22+ and Docker Desktop running.

```bash
npm install
npm run db:start   # local Supabase in Docker (first run downloads the images)
npm run db:seed    # demo workspace + writes .env.local
npm run functions:serve   # the agent API, in its own terminal
npm run dev
```

Open http://localhost:5173 and choose **Use the local demo account**. Sign-in links sent by email
land in Mailpit at http://127.0.0.1:54324, and Supabase Studio is at http://127.0.0.1:54323.

- `npm run db:reset` rebuilds the schema from `supabase/migrations` and re-seeds. The sample is dated
  relative to when it was seeded, so re-seed to get a fresh "today".
- `npm run db:stop` stops the containers.

## Tests

| Command | What | Needs |
|---|---|---|
| `npm test` | Unit tests (Vitest) for the logic behind the views: plan layout, run trees, agent summaries, attention list, board columns, agent metrics | nothing |
| `npm run test:agent` | Contract tests for the agent API: auth, every MCP tool, gates, hooks, telemetry, stale runs, limits | `db:start`, `db:seed`, `functions:serve` |
| `npm run test:e2e` | Browser tests (Playwright): plan approval end to end, asking for changes, blocked work, the Runs trace, board drag and drop, phone layout | the same, plus `npx playwright install chromium` once |

The browser and contract tests make their own projects and remove them afterwards. CI
(`.github/workflows/ci.yml`) runs lint, types, unit tests and the build on every push, then starts the
local stack in Docker and runs the contract and browser tests.

## Connecting an agent

Open a project and choose **Connect an agent**. Pane creates a token for that project, shows it once
and gives you the set-up to paste:

- **MCP tools** (Claude Code, Cursor, Codex): `get_project`, `get_task`, `propose_plan`, `create_task`,
  `claim_task`, `update_task`, `start_run`, `end_run`, `log_step`, `attach_artifact`, `request_gate`,
  `wait_for_gate`, `report_usage`. The agent plans and reports on purpose.
- **Claude Code hooks**: every tool call, prompt and sub-agent is traced without the agent doing anything.
- **Claude Code telemetry** (OTLP over HTTP/JSON): tokens and cost per run. Claude Code reads these
  variables from the shell it starts in, not from `settings.json`, so the panel gives them as `export` lines.

All three arrive at one Edge Function, `supabase/functions/agent`, and meet on the same run through
Claude Code's session id. A token only reaches its own project. Agents can't decide gates: only a
signed-in person can, through `decide_gate`. Write calls take an `idempotency_key`, each token is
limited to 1,200 calls a minute, and new work stops once the project's budget is spent.

Runs that stop reporting (a crashed agent, a closed laptop) are marked **went quiet** after 30
minutes without a trace step or a call with their token; runs waiting on an approval are left alone.
A pg_cron job does this every five minutes (`expire_stale_runs`), and the run comes back to life if the
agent reports again.

## Stack

- React 19 + Vite + TypeScript, Tailwind CSS v4
- Supabase: Postgres with row level security, Auth, Realtime (`supabase/`)
- TanStack Query loads the workspace; Zustand holds it in memory with instant (optimistic) saves (`src/store`)
- Radix primitives wrapped as shadcn-style components (`src/components/ui`)
- GSAP (+ Flip) for motion, hand-written SVG charts (`src/components/charts`)

## Where things are

| Path | What |
|---|---|
| `src/index.css` | Design tokens, dark/light themes, accents, wallpapers, glass classes |
| `src/lib/liquid.ts`, `src/components/glass/Glass.tsx` | Liquid-glass refraction: per-surface SVG displacement maps (Chromium), CSS blur elsewhere |
| `supabase/migrations` | Database schema: people and agents as actors, projects, tasks with dependencies, runs, run events, artifacts, gates, row level security; agent tokens and gate decisions |
| `supabase/functions/agent` | Agent API: MCP server (`tools.ts`, `mcp.ts`), Claude Code hooks (`hooks.ts`), OTLP intake (`otlp.ts`) |
| `scripts/agent-api.test.ts` | Contract tests for the agent API against the local stack |
| `src/pages/projects/AgentPanel.tsx`, `ConnectAgent.tsx` | Approval banner, agent settings (goal, repo, gates, budget), Connect an agent |
| `src/lib/api/agents.ts` | Agent tokens and the set-up snippets |
| `src/pages/runs`, `src/lib/runs.ts` | Runs: run tree (orchestrators and sub-agents), run detail, trace as a timeline or a log |
| `src/lib/api/runs.ts` | A run's steps, loaded on demand and followed live while the run is going |
| `src/components/ui/task-agent.tsx`, `src/pages/tasks/TaskAgentSections.tsx` | Agent-aware tasks: blocked/failed/awaiting-approval flags, "Working", attempts, PRs, dependencies, agent work in the drawer |
| `src/pages/projects/PlanGraph.tsx`, `src/lib/plan.ts` | Plan view: a project's tasks as a dependency graph |
| `src/pages/team/AgentCard.tsx`, `AgentProfile.tsx`, `src/lib/agents.ts` | Team & agents: agent roster, what each is doing, its record and runs |
| `src/pages/home/AttentionCard.tsx`, `src/lib/attention.ts` | Needs your attention: approvals, budgets, blocked and failed work across projects |
| `src/pages/insights/AgentSection.tsx` | Agent metrics: finished tasks, run success, spend and cost per task, approvals, per-agent table |
| `scripts/seed.ts`, `scripts/demo/` | Seeds the demo workspace, including the agent-built "Ledger API" project |
| `src/app/Boot.tsx`, `src/app/SignIn.tsx` | Sign-in, loading your workspace, keeping it live with Realtime |
| `src/lib/api/snapshot.ts` | Reads the workspace and maps database rows to app types |
| `src/store/workspace.ts` | The workspace in memory; every action updates the screen, then saves to Supabase |
| `src/store/people.ts` | `usePeople()` (people), `useActors()` (people and agents), `usePerson(id)` |
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
| `src/store/settings.ts` | Notification switches and focus lengths (kept on this device) |
| `src/components/shell/useReminders.ts` | Meeting, due-today and daily-digest reminders, driven by the notification switches |
| `src/pages/insights`, `src/lib/insights.ts` | Insights: KPIs over 7/30/90 days, throughput, by project, focus, workload, on time, slowest tasks, CSV export |
| `src/components/charts` | Hand-written SVG charts: rings, week bars, burn-up, line, day bars, donut |

Teammates' focus hours in Insights are sample figures; everything else is computed from the workspace data.

## Roadmap

The plan for agentic development: agents (Claude Code, Codex, Cursor…) plan and carry out the work
while Pane tracks it, with human approval gates.

1. **Agent-ready backend** (done): schema, sign-in, data from Postgres, demo agent project.
2. **Agent connection** (done): Pane MCP server, per-project agent tokens, Claude Code hooks and OpenTelemetry ingest.
3. **Observability views** (done): runs with run tree and trace timeline, agent-aware board and drawer, plan view,
   approval banner, Team & agents, Needs your attention, agent metrics.
4. **Hardening** (in progress): done: stale-run cleanup, unit, contract and browser tests, CI.
   Still to do: error monitoring, a staging environment, backups.
5. **Software factory**: Pane dispatches work to agents it starts itself.
