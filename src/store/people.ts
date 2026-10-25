import { useMemo } from 'react'
import type { Person } from '@/data/types'
import { useWorkspace } from './workspace'

/** People and agents in the workspace. */
export const useActors = () => useWorkspace((s) => s.people)

/** People only (team lists, presence, workload). */
export function usePeople(): Person[] {
  const actors = useActors()
  return useMemo(() => actors.filter((a) => a.kind === 'person'), [actors])
}

export function useActorsById(): Record<string, Person> {
  const actors = useActors()
  return useMemo(() => Object.fromEntries(actors.map((a) => [a.id, a])), [actors])
}

/** A person or an agent. */
export const usePerson = (id: string): Person | undefined => useWorkspace((s) => s.people.find((p) => p.id === id))

/** Non-hook lookup for event handlers and helpers. */
export const actorById = (id: string) => useWorkspace.getState().people.find((p) => p.id === id)
