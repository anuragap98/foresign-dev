import { describe, expect, test } from 'vitest'
import { task } from '@/test/fixtures'
import { COLUMN_OF, columnTasks, STATUSES } from './tasks'

describe('board columns', () => {
  test('every status has a column, and parked statuses sit with their kin', () => {
    for (const status of Object.keys(COLUMN_OF)) expect(STATUSES).toContain(COLUMN_OF[status as keyof typeof COLUMN_OF])
    expect(COLUMN_OF.awaiting_approval).toBe('todo')
    expect(COLUMN_OF.blocked).toBe('doing')
    expect(COLUMN_OF.failed).toBe('doing')
  })

  test('a column holds its parked tasks in board order', () => {
    const tasks = [
      task('a', { status: 'doing', position: 3 }),
      task('b', { status: 'blocked', position: 1 }),
      task('c', { status: 'failed', position: 2 }),
      task('d', { status: 'todo' }),
    ]
    expect(columnTasks(tasks, 'doing').map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  test('done reads newest first', () => {
    const tasks = [task('old', { status: 'done', doneAt: '2026-10-01T00:00:00Z' }), task('new', { status: 'done', doneAt: '2026-10-20T00:00:00Z' })]
    expect(columnTasks(tasks, 'done').map((t) => t.id)).toEqual(['new', 'old'])
  })
})
