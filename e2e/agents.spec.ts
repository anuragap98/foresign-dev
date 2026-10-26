import { expect, test } from '@playwright/test'
import { admin, agentCall, agentHook, signIn, testProject, type TestProject } from './stack'

let project: TestProject

test.beforeEach(async () => {
  project = await testProject('agents')
})

test.afterEach(async () => {
  await project.remove()
})

test('an agent’s plan waits for a person, who approves it in the app', async ({ page }) => {
  const plan = await agentCall(project.token, 'propose_plan', {
    summary: 'Count words, then wrap it in a CLI.',
    tasks: [
      { ref: 'count', title: 'Counting function' },
      { ref: 'cli', title: 'CLI entry point', depends_on: ['count'] },
    ],
  })

  await signIn(page, `/projects/${project.id}`)
  const banner = page.getByRole('article', { name: 'Plan waiting for your approval' })
  await expect(banner).toContainText('Plan: 2 tasks')
  await expect(banner).toContainText('CLI entry point')

  // Not before a person says so.
  await expect(agentCall(project.token, 'claim_task', { task_id: 'count' })).rejects.toThrow(/waiting for approval/)

  await banner.getByRole('button', { name: 'Approve' }).click()
  await expect(banner).toBeHidden()

  const waited = await agentCall(project.token, 'wait_for_gate', { gate_id: plan.gate.id, timeout_s: 5 })
  expect(waited.status).toBe('approved')
  expect(waited.decided_by).toBe('Lin Zhao')
  const claimed = await agentCall(project.token, 'claim_task', { task_id: 'count' })
  expect(claimed.task.status).toBe('doing')

  // The plan view draws the dependency.
  await expect(page.getByRole('region', { name: 'Plan' })).toContainText('2 tasks in 2 steps')
})

test('asking for changes sends the note back to the agent', async ({ page }) => {
  const plan = await agentCall(project.token, 'propose_plan', { summary: 'One big task.', tasks: [{ ref: 'all', title: 'Do everything' }] })
  await signIn(page, `/projects/${project.id}`)
  const banner = page.getByRole('article', { name: 'Plan waiting for your approval' })
  await banner.getByRole('button', { name: 'Request changes' }).click()
  await banner.getByRole('textbox', { name: 'Note for the agent' }).fill('Split it into smaller tasks.')
  await banner.getByRole('button', { name: 'Send to agent' }).click()
  await expect(banner).toBeHidden()

  const waited = await agentCall(project.token, 'wait_for_gate', { gate_id: plan.gate.id, timeout_s: 5 })
  expect(waited.status).toBe('changes_requested')
  expect(waited.note).toBe('Split it into smaller tasks.')
})

test('a blocked task shows on the board, and Needs your attention lists it', async ({ page }) => {
  await admin.from('projects').update({ gates: { plan: false, merge: false, deploy: false } }).eq('id', project.id)
  await agentCall(project.token, 'create_task', { ref: 'key', title: 'Wire up payments' })
  await agentCall(project.token, 'claim_task', { task_id: 'key' })
  await agentCall(project.token, 'update_task', { task_id: 'key', status: 'blocked', note: 'I need a sandbox API key.' })

  await signIn(page, '/home')
  const attention = page.getByRole('region', { name: 'Needs your attention' })
  await expect(attention).toContainText('Blocked: Wire up payments')
  await expect(attention).toContainText('I need a sandbox API key.')

  await page.goto('/#/tasks')
  const card = page.locator('[data-col="doing"] [data-card]', { hasText: 'Wire up payments' })
  await expect(card).toContainText('Blocked')
})

test('the Runs page shows a run’s trace from Claude Code hooks', async ({ page }) => {
  const session = `e2e-${Date.now()}`
  const hook = (body: Record<string, unknown>) => agentHook(project.token, { session_id: session, cwd: '/repo', ...body })
  await hook({ hook_event_name: 'SessionStart', source: 'startup', model: 'claude-haiku-5-5' })
  await hook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'npm test' } })
  await hook({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_use_id: 't1', tool_input: { command: 'npm test' }, duration_ms: 1500 })
  const { data: run } = await admin.from('runs').select('id').eq('external_session_id', session).single()

  await signIn(page, `/runs/${run!.id}`)
  const trace = page.getByRole('region', { name: 'Trace' })
  await expect(trace).toContainText('npm test')
  await trace.getByRole('radio', { name: 'Log' }).click()
  await expect(trace).toContainText('2s')

  await hook({ hook_event_name: 'SessionEnd', reason: 'other' })
})

