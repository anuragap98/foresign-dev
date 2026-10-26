import { describe, expect, test } from 'vitest'
import { NOW, run } from '@/test/fixtures'
import { childrenOf, fmtCost, fmtDuration, fmtTokens, isLive, rootOf, runMs, subtree, totals } from './runs'

describe('run trees', () => {
  const runs = [
    run('lead', { costUsd: 1 }),
    run('plan', { parentRunId: 'lead', costUsd: 0.25, startedAt: '2026-10-26T10:00:00Z' }),
    run('build', { parentRunId: 'lead', costUsd: 0.5, startedAt: '2026-10-26T09:00:00Z' }),
    run('test', { parentRunId: 'build', costUsd: 0.125 }),
  ]
  const children = childrenOf(runs)

  test('nests sub-agent runs, oldest first', () => {
    expect(children.get('lead')!.map((r) => r.id)).toEqual(['build', 'plan'])
    expect(subtree(runs[0], children).map((r) => r.id)).toEqual(['lead', 'build', 'test', 'plan'])
  })

  test('adds up a whole tree', () => {
    expect(totals(subtree(runs[0], children)).cost).toBeCloseTo(1.875)
  })

  test('finds the top of a tree', () => {
    expect(rootOf(runs[3], new Map(runs.map((r) => [r.id, r]))).id).toBe('lead')
  })
})

describe('run status and time', () => {
  test('running and waiting are live; stale is not', () => {
    expect(isLive(run('a', { status: 'running' }))).toBe(true)
    expect(isLive(run('a', { status: 'waiting' }))).toBe(true)
    expect(isLive(run('a', { status: 'stale' }))).toBe(false)
  })

  test('a live run lasts until now', () => {
    const r = run('a', { status: 'running', startedAt: '2026-10-26T11:00:00Z', endedAt: undefined })
    expect(runMs(r, NOW.getTime())).toBe(3600_000)
  })
})

describe('formatting', () => {
  test.each([
    [850, '850ms'],
    [42_000, '42s'],
    [90_000, '1m 30s'],
    [3_600_000, '1h'],
    [98_400_000, '27h 20m'],
  ])('fmtDuration(%i) = %s', (ms, out) => expect(fmtDuration(ms)).toBe(out))

  test('tokens and cost', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(1_234)).toBe('1.2k')
    expect(fmtTokens(414_448)).toBe('414k')
    expect(fmtTokens(1_200_000)).toBe('1.2M')
    expect(fmtCost(0.004)).toBe('<$0.01')
    expect(fmtCost(0)).toBe('$0.00')
    expect(fmtCost(14.066)).toBe('$14.07')
  })
})
