import { describe, expect, test } from 'vitest'
import { task } from '@/test/fixtures'
import { planLayout } from './plan'

describe('planLayout', () => {
  test('puts each task one column after its latest dependency', () => {
    const { layers, edges } = planLayout([
      task('schema', { position: 1 }),
      task('scaffold', { position: 2 }),
      task('api', { dependsOn: ['schema', 'scaffold'] }),
      task('tests', { dependsOn: ['api'] }),
      task('deploy', { dependsOn: ['tests', 'schema'] }),
    ])
    expect(layers).toEqual([['schema', 'scaffold'], ['api'], ['tests'], ['deploy']])
    expect(edges).toHaveLength(5)
  })

  test('orders a column by where its dependencies sit', () => {
    const { layers } = planLayout([
      task('a', { position: 1 }),
      task('b', { position: 2 }),
      // Board order would put x first, but it depends on b, which sits lower.
      task('x', { position: 1, dependsOn: ['b'] }),
      task('y', { position: 2, dependsOn: ['a'] }),
    ])
    expect(layers[1]).toEqual(['y', 'x'])
  })

  test('ignores dependencies outside the project and survives a cycle', () => {
    const { layers, edges } = planLayout([
      task('a', { dependsOn: ['elsewhere'] }),
      task('b', { dependsOn: ['c'] }),
      task('c', { dependsOn: ['b'] }),
    ])
    expect(edges.some((e) => e.from === 'elsewhere')).toBe(false)
    expect(layers.flat().sort()).toEqual(['a', 'b', 'c'])
  })
})
