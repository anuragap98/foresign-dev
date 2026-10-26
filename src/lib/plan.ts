import type { Task } from '@/data/types'
import { byPosition } from './tasks'

export interface PlanLayout {
  /** Columns of task ids; a task sits one column right of its latest dependency. */
  layers: string[][]
  edges: { from: string; to: string }[]
}

/**
 * Lays a project's tasks out as a left-to-right dependency graph.
 * Within a column, tasks sit near the tasks they depend on, which keeps
 * edges short and mostly uncrossed.
 */
export function planLayout(tasks: Task[]): PlanLayout {
  const ids = new Set(tasks.map((t) => t.id))
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const deps = new Map(tasks.map((t) => [t.id, t.dependsOn.filter((d) => ids.has(d) && d !== t.id)]))

  const depth = new Map<string, number>()
  const visiting = new Set<string>()
  const visit = (id: string): number => {
    const known = depth.get(id)
    if (known !== undefined) return known
    // A cycle shouldn't exist (the API refuses them); if one does, cut it here.
    if (visiting.has(id)) return 0
    visiting.add(id)
    const d = Math.max(-1, ...deps.get(id)!.map(visit)) + 1
    visiting.delete(id)
    depth.set(id, d)
    return d
  }
  tasks.forEach((t) => visit(t.id))

  const layers: string[][] = []
  for (const t of [...tasks].sort(byPosition)) (layers[depth.get(t.id)!] ??= []).push(t.id)

  // Order each column by where its dependencies sit (barycentre), then by board order.
  const row = new Map<string, number>()
  layers.forEach((layer, i) => {
    if (i > 0) {
      const centre = (id: string) => {
        const ds = deps.get(id)!.filter((d) => row.has(d))
        return ds.length ? ds.reduce((s, d) => s + row.get(d)!, 0) / ds.length : Infinity
      }
      layer.sort((a, b) => centre(a) - centre(b) || byPosition(byId.get(a)!, byId.get(b)!))
    }
    layer.forEach((id, r) => row.set(id, r))
  })

  return {
    layers: layers.filter(Boolean),
    edges: tasks.flatMap((t) => deps.get(t.id)!.map((from) => ({ from, to: t.id }))),
  }
}
