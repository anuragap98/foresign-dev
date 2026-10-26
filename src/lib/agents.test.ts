import { describe, expect, test } from 'vitest'
import { agent, gate, minsAgo, NOW, project, run, task } from '@/test/fixtures'
import { agentSummary } from './agents'
import { attentionItems } from './attention'

describe('agentSummary', () => {
  const cc = agent('cc')

  test('working, with the task its live run names', () => {
    const s = agentSummary(
      cc,
      [run('r1', { status: 'running', taskId: 't1', endedAt: undefined }), run('r0', { status: 'failed' }), run('r00')],
      [task('t1', { assignee: 'cc', status: 'doing' }), task('t2', { assignee: 'cc', status: 'done' })],
    )
    expect(s.state).toBe('working')
    expect(s.current?.id).toBe('t1')
    expect(s.finished).toBe(1)
    expect(s.success).toBe(50)
  })

  test('a blocked task is not what it is working on', () => {
    const s = agentSummary(cc, [run('r1', { status: 'running', taskId: 't1' })], [task('t1', { assignee: 'cc', status: 'blocked' })])
    expect(s.current).toBeUndefined()
  })

  test('waiting when its only live run waits on a gate; idle with none', () => {
    expect(agentSummary(cc, [run('r1', { status: 'waiting' })], []).state).toBe('waiting')
    expect(agentSummary(cc, [run('r1', { status: 'stale' })], []).state).toBe('idle')
    expect(agentSummary(cc, [], []).success).toBeNull()
  })
})

describe('attentionItems', () => {
  const actors = { cc: agent('cc', { name: 'Claude Code' }), lin: agent('lin') }

  test('lists what waits on a person, most urgent first', () => {
    const items = attentionItems(
      [gate('g1', { requestedByRun: 'r1' }), gate('g2', { status: 'approved' })],
      [run('r1', { status: 'waiting' }), run('r2', { status: 'failed', endedAt: minsAgo(30) }), run('r3', { status: 'failed', endedAt: minsAgo(60 * 72) })],
      [
        task('t1', { status: 'blocked', assignee: 'cc', comments: [{ id: 'c', by: 'cc', text: 'Need a key', at: minsAgo(5) }] }),
        task('t2', { status: 'failed' }),
        task('t3', { status: 'doing' }),
      ],
      [project('p1', { name: 'Ledger', budgetUsd: 0.2 })],
      actors,
      NOW.getTime(),
    )
    expect(items.map((i) => i.kind)).toEqual(['gate', 'budget', 'failed_task', 'blocked_task', 'failed_run'])
    expect(items[0].detail).toContain('Claude Code is waiting')
    expect(items.find((i) => i.kind === 'blocked_task')!.detail).toBe('Need a key')
    expect(items.find((i) => i.kind === 'budget')!.title).toBe('Budget used up on Ledger')
  })

  test('budgets warn from 80% and stay quiet below', () => {
    const at = (spent: number) =>
      attentionItems([], [run('r', { costUsd: spent })], [], [project('p1', { budgetUsd: 10 })], actors, NOW.getTime()).map((i) => i.title)
    expect(at(7.9)).toEqual([])
    expect(at(8.5)[0]).toContain('85%')
  })
})
