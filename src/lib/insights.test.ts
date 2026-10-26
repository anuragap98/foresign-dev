import { describe, expect, test } from 'vitest'
import { agent, gate, minsAgo, NOW, person, run, task } from '@/test/fixtures'
import { agentInsights } from './insights'

const DAY_MIN = 24 * 60

describe('agentInsights', () => {
  const actors = [person('lin'), agent('cc'), agent('tw')]

  test('counts agent work, spend and success over the range', () => {
    const data = agentInsights(
      7,
      [
        run('r1', { agentId: 'cc', status: 'succeeded', costUsd: 2, startedAt: minsAgo(60) }),
        run('r2', { agentId: 'tw', status: 'failed', costUsd: 1, startedAt: minsAgo(120) }),
        run('old', { agentId: 'cc', status: 'succeeded', costUsd: 50, startedAt: minsAgo(30 * DAY_MIN) }),
      ],
      [
        task('t1', { assignee: 'cc', status: 'done', doneAt: minsAgo(30), source: 'agent', createdAt: minsAgo(DAY_MIN * 2) }),
        task('t2', { assignee: 'lin', status: 'done', doneAt: minsAgo(30) }),
        task('t3', { assignee: 'tw', status: 'doing', attempts: 2 }),
      ],
      [gate('g1', { status: 'approved', requestedAt: minsAgo(40), decidedAt: minsAgo(30) }), gate('g2', { status: 'changes_requested', decidedAt: minsAgo(10), requestedAt: minsAgo(30) })],
      actors,
      NOW,
    )
    expect(data.finished).toBe(1)
    expect(data.spend).toBe(3)
    expect(data.perTask).toBe(3)
    expect(data.success).toBe(50)
    expect(data.hadPrev).toBe(false)
    expect(data.gates.steppedInRate).toBe(50)
    expect(data.gates.waitMs).toBe(15 * 60_000)
    expect(data.leadDays).toBe(2)
    expect(data.byAgent.map((a) => a.agent.id)).toEqual(['cc', 'tw'])
    expect(data.byAgent.find((a) => a.agent.id === 'tw')!.retries).toBe(1)
  })

  test('nothing to show without agent runs', () => {
    expect(agentInsights(30, [], [], [], actors, NOW).any).toBe(false)
  })
})
