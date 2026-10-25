/**
 * Sample data for an agent-built project: an orchestrator and its
 * sub-agents planned "Ledger API", are building it, and are waiting on a
 * person to approve the merge. Times are relative to `now`.
 */

type RunEventType = 'tool_call' | 'command' | 'file_edit' | 'message' | 'error' | 'note'

export interface DemoAgent {
  key: string
  name: string
  role: string
  runtime: string
  model: string
  status: 'running' | 'idle' | 'offline'
  hue: string
}

export interface DemoAgentTask {
  key: string
  title: string
  description: string
  acceptance: string
  agent: string
  status: 'todo' | 'doing' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estH: number
  dueIn: number
  createdHoursAgo: number
  doneHoursAgo?: number
  dependsOn: string[]
  attempts?: number
}

export interface DemoRun {
  key: string
  agent: string
  parent?: string
  task?: string
  status: 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled'
  startedMinAgo: number
  endedMinAgo?: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  model: string
  summary: string
  events: [offsetMin: number, type: RunEventType, name: string, durationMs: number, detail: string][]
}

export const LEDGER = {
  key: 'ledger',
  name: 'Ledger API',
  summary: 'A double-entry ledger service with accounts, journal entries and balances, built end to end by agents.',
  goal: [
    '## Goal',
    'A small HTTP service that records money movements as double-entry journal entries.',
    '',
    '## Must have',
    '- Accounts: create, list, get',
    '- Journal entries: post balanced entries, reject unbalanced ones',
    '- Balances per account at any point in time',
    '- Idempotent POSTs, rate limiting, OpenAPI docs',
    '- Deployed to staging with passing tests',
  ].join('\n'),
  repoUrl: 'https://github.com/acme/ledger-api',
  hue: 'teal',
  icon: 'sparkle',
  startedDaysAgo: 1,
  dueIn: 6,
  budgetTokens: 4_000_000,
  budgetUsd: 60,
}

export const AGENTS: DemoAgent[] = [
  { key: 'lead', name: 'Claude Code', role: 'Orchestrator', runtime: 'claude-code', model: 'claude-opus-5-5', status: 'running', hue: 'orange' },
  { key: 'planner', name: 'Planner', role: 'Sub-agent · plans and splits work', runtime: 'claude-code', model: 'claude-sonnet-5-5', status: 'idle', hue: 'purple' },
  { key: 'builder', name: 'API builder', role: 'Sub-agent · writes the service', runtime: 'claude-code', model: 'claude-sonnet-5-5', status: 'idle', hue: 'blue' },
  { key: 'tester', name: 'Test writer', role: 'Sub-agent · writes and runs tests', runtime: 'claude-code', model: 'claude-haiku-5-5', status: 'running', hue: 'green' },
  { key: 'reviewer', name: 'Reviewer', role: 'Sub-agent · reviews diffs', runtime: 'claude-code', model: 'claude-opus-5-5', status: 'idle', hue: 'pink' },
]

export const AGENT_TASKS: DemoAgentTask[] = [
  {
    key: 'schema', title: 'Design the ledger schema', agent: 'builder', status: 'done', priority: 'high', estH: 2, dueIn: -1,
    createdHoursAgo: 26, doneHoursAgo: 24, dependsOn: [],
    description: 'Tables for accounts, journal entries and entry lines; amounts in minor units.',
    acceptance: 'Migration applies cleanly; lines in an entry must sum to zero.',
  },
  {
    key: 'scaffold', title: 'Scaffold the Hono service', agent: 'builder', status: 'done', priority: 'medium', estH: 1, dueIn: -1,
    createdHoursAgo: 26, doneHoursAgo: 23, dependsOn: [],
    description: 'Project layout, config, health check, error middleware.',
    acceptance: 'GET /health returns 200; lint and type-check pass.',
  },
  {
    key: 'accounts', title: 'Accounts endpoints', agent: 'builder', status: 'done', priority: 'high', estH: 3, dueIn: 0,
    createdHoursAgo: 26, doneHoursAgo: 6, dependsOn: ['schema', 'scaffold'],
    description: 'POST /accounts, GET /accounts, GET /accounts/:id.',
    acceptance: 'Validation errors return 422 with field details.',
  },
  {
    key: 'journal', title: 'Journal entries endpoint', agent: 'builder', status: 'done', priority: 'urgent', estH: 4, dueIn: 0,
    createdHoursAgo: 26, doneHoursAgo: 3, dependsOn: ['schema', 'scaffold'], attempts: 2,
    description: 'POST /entries with balanced lines; reject unbalanced entries.',
    acceptance: 'Unbalanced entries get 422; balanced ones are stored atomically.',
  },
  {
    key: 'idempotency', title: 'Idempotency keys on POST', agent: 'builder', status: 'review', priority: 'high', estH: 2, dueIn: 1,
    createdHoursAgo: 26, dependsOn: ['journal'],
    description: 'Idempotency-Key header; replay returns the first response.',
    acceptance: 'Same key twice creates one entry and returns the same body.',
  },
  {
    key: 'balances', title: 'Balance calculation', agent: 'builder', status: 'doing', priority: 'high', estH: 3, dueIn: 1,
    createdHoursAgo: 26, dependsOn: ['journal'],
    description: 'GET /accounts/:id/balance?at= returns the balance at a point in time.',
    acceptance: 'Matches the sum of lines up to `at`; handles accounts with no entries.',
  },
  {
    key: 'tests', title: 'Integration tests for journal entries', agent: 'tester', status: 'doing', priority: 'high', estH: 3, dueIn: 1,
    createdHoursAgo: 26, dependsOn: ['journal'],
    description: 'End-to-end tests against a throwaway Postgres.',
    acceptance: 'Covers balanced, unbalanced, concurrent and replayed posts.',
  },
  {
    key: 'ratelimit', title: 'Rate limiting', agent: 'builder', status: 'todo', priority: 'medium', estH: 2, dueIn: 3,
    createdHoursAgo: 26, dependsOn: ['scaffold'],
    description: 'Per-key token bucket on write endpoints.',
    acceptance: 'Returns 429 with Retry-After once the bucket is empty.',
  },
  {
    key: 'openapi', title: 'OpenAPI docs', agent: 'builder', status: 'todo', priority: 'low', estH: 1, dueIn: 4,
    createdHoursAgo: 26, dependsOn: ['accounts', 'journal', 'balances'],
    description: 'Generate an OpenAPI 3.1 document from the route schemas.',
    acceptance: '/openapi.json validates; every route has examples.',
  },
  {
    key: 'deploy', title: 'Deploy to staging', agent: 'lead', status: 'todo', priority: 'medium', estH: 1, dueIn: 5,
    createdHoursAgo: 26, dependsOn: ['tests', 'idempotency', 'balances', 'ratelimit'],
    description: 'Container build, migrations, smoke test on staging.',
    acceptance: 'Smoke test passes on staging; rollback documented.',
  },
]

export const RUNS: DemoRun[] = [
  {
    key: 'lead', agent: 'lead', status: 'running', startedMinAgo: 26 * 60, tokensIn: 412_000, tokensOut: 38_500, costUsd: 9.42,
    model: 'claude-opus-5-5', summary: 'Coordinating the Ledger API build: plan approved, core endpoints done, waiting on merge approval.',
    events: [
      [0, 'message', 'Read project goal', 1200, 'Loaded the goal and must-haves from Pane.'],
      [3, 'tool_call', 'Task', 900, 'Started sub-agent: Planner'],
      [22, 'note', 'Plan gate requested', 300, 'Proposed 10 tasks with dependencies; waiting for approval.'],
      [41, 'note', 'Plan approved', 200, 'Lin approved the plan.'],
      [44, 'tool_call', 'Task', 800, 'Started sub-agent: API builder'],
      [1380, 'tool_call', 'Task', 700, 'Started sub-agent: Test writer'],
      [1395, 'tool_call', 'Task', 650, 'Started sub-agent: Reviewer'],
    ],
  },
  {
    key: 'plan', agent: 'planner', parent: 'lead', status: 'succeeded', startedMinAgo: 26 * 60 - 3, endedMinAgo: 26 * 60 - 21,
    tokensIn: 58_000, tokensOut: 9_200, costUsd: 0.31, model: 'claude-sonnet-5-5', summary: 'Split the goal into 10 tasks with dependencies.',
    events: [
      [0, 'tool_call', 'Read', 140, 'README.md'],
      [2, 'tool_call', 'Glob', 60, 'src/**/*.ts'],
      [9, 'message', 'Drafted plan', 4200, '10 tasks, critical path: schema → journal → tests → deploy'],
      [17, 'tool_call', 'pane.propose_plan', 380, '10 tasks, 14 dependencies'],
    ],
  },
  {
    key: 'build-core', agent: 'builder', parent: 'lead', task: 'journal', status: 'succeeded', startedMinAgo: 26 * 60 - 44, endedMinAgo: 180,
    tokensIn: 290_000, tokensOut: 61_000, costUsd: 2.04, model: 'claude-sonnet-5-5', summary: 'Schema, scaffold, accounts and journal entries; journal needed a second attempt after a failing balance check.',
    events: [
      [0, 'tool_call', 'pane.claim_task', 120, 'Design the ledger schema'],
      [6, 'file_edit', 'Write', 90, 'migrations/001_ledger.sql'],
      [14, 'command', 'npm run db:migrate', 2300, 'Applied 1 migration'],
      [30, 'file_edit', 'Write', 110, 'src/server.ts'],
      [40, 'command', 'npm run lint', 3100, 'No problems'],
      [300, 'file_edit', 'Write', 160, 'src/routes/accounts.ts'],
      [900, 'file_edit', 'Write', 170, 'src/routes/entries.ts'],
      [960, 'command', 'npm test -- entries', 8400, '1 failed: unbalanced entry accepted'],
      [962, 'error', 'Test failure', 0, 'Expected 422, received 201 for unbalanced lines'],
      [990, 'file_edit', 'Edit', 95, 'src/routes/entries.ts: sum lines in minor units'],
      [1000, 'command', 'npm test -- entries', 7900, '12 passed'],
      [1010, 'tool_call', 'pane.attach_artifact', 140, 'Commit 3f9c2ab'],
    ],
  },
  {
    key: 'build-next', agent: 'builder', parent: 'lead', task: 'balances', status: 'running', startedMinAgo: 170,
    tokensIn: 96_000, tokensOut: 14_800, costUsd: 0.62, model: 'claude-sonnet-5-5', summary: 'Working on point-in-time balances; idempotency is in review.',
    events: [
      [0, 'tool_call', 'pane.claim_task', 110, 'Idempotency keys on POST'],
      [25, 'file_edit', 'Write', 130, 'src/middleware/idempotency.ts'],
      [40, 'command', 'npm test -- idempotency', 5200, '6 passed'],
      [45, 'tool_call', 'pane.update_task', 90, 'Idempotency keys on POST → In review'],
      [60, 'tool_call', 'pane.claim_task', 100, 'Balance calculation'],
      [95, 'file_edit', 'Write', 150, 'src/routes/balances.ts'],
    ],
  },
  {
    key: 'tests', agent: 'tester', parent: 'lead', task: 'tests', status: 'running', startedMinAgo: 95,
    tokensIn: 41_000, tokensOut: 8_100, costUsd: 0.09, model: 'claude-haiku-5-5', summary: 'Writing integration tests for journal entries.',
    events: [
      [0, 'tool_call', 'pane.claim_task', 90, 'Integration tests for journal entries'],
      [12, 'file_edit', 'Write', 120, 'test/entries.test.ts'],
      [40, 'command', 'npm test -- test/entries.test.ts', 11200, '18 passed, 2 skipped'],
      [70, 'file_edit', 'Edit', 80, 'test/entries.test.ts: concurrent posts'],
    ],
  },
  {
    key: 'review', agent: 'reviewer', parent: 'lead', task: 'idempotency', status: 'waiting', startedMinAgo: 80, endedMinAgo: undefined,
    tokensIn: 74_000, tokensOut: 6_300, costUsd: 1.58, model: 'claude-opus-5-5', summary: 'Reviewed the core PR; waiting on a person to approve the merge.',
    events: [
      [0, 'tool_call', 'Bash', 1900, 'gh pr diff 12'],
      [18, 'message', 'Review notes', 3100, 'Two nits, no blockers. Idempotency store needs a TTL.'],
      [25, 'tool_call', 'pane.request_gate', 210, 'Merge “Ledger core API” (#12)'],
    ],
  },
]

export const ARTIFACTS: { run: string; task?: string; kind: 'branch' | 'commit' | 'pull_request' | 'test_report' | 'deploy' | 'doc'; title: string; url?: string; status?: string }[] = [
  { run: 'build-core', kind: 'branch', title: 'feat/ledger-core', url: 'https://github.com/acme/ledger-api/tree/feat/ledger-core' },
  { run: 'build-core', task: 'schema', kind: 'commit', title: 'Add ledger schema (a41d0e7)', url: 'https://github.com/acme/ledger-api/commit/a41d0e7' },
  { run: 'build-core', task: 'journal', kind: 'commit', title: 'Journal entries endpoint (3f9c2ab)', url: 'https://github.com/acme/ledger-api/commit/3f9c2ab' },
  { run: 'review', task: 'idempotency', kind: 'pull_request', title: 'Ledger core API (#12)', url: 'https://github.com/acme/ledger-api/pull/12', status: 'open' },
  { run: 'tests', task: 'tests', kind: 'test_report', title: 'entries.test.ts: 18 passed, 2 skipped', status: 'passing' },
]

export const GATES = [
  { kind: 'plan' as const, title: 'Approve the plan', summary: '10 tasks with dependencies, proposed by Planner.', status: 'approved' as const, run: 'plan', requestedMinAgo: 26 * 60 - 22, decidedMinAgo: 26 * 60 - 41 },
  { kind: 'merge' as const, title: 'Merge “Ledger core API” (#12)', summary: 'Reviewer: two nits, no blockers. Tests passing.', status: 'pending' as const, run: 'review', task: 'idempotency', requestedMinAgo: 55 },
]
