import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Glass } from '@/components/glass/Glass'
import { LogoMark } from '@/components/shell/Logo'
import { Wallpaper } from '@/components/shell/Wallpaper'
import { Button } from '@/components/ui/button'
import { loadMembership, loadSnapshot } from '@/lib/api/snapshot'
import { setSession } from '@/lib/session'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useUi } from '@/store/ui'
import { onWriteError, useWorkspace } from '@/store/workspace'
import { SignIn } from './SignIn'
import { useRealtime } from './useRealtime'

/** undefined while checking, null when signed out. */
function useAuthSession() {
  const [session, setSessionState] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionState(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSessionState(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Wallpaper />
      <Glass className="w-full max-w-[440px] rounded-card p-7 text-center">
        <span className="mx-auto mb-4 block w-fit">
          <LogoMark size={44} />
        </span>
        <h1 className="display text-[22px] font-bold">{title}</h1>
        {children && <div className="mt-2 text-[14px] text-ink-2">{children}</div>}
      </Glass>
    </div>
  )
}

function Toast() {
  const toast = useUi((s) => s.toast)
  const showToast = useUi((s) => s.showToast)
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => showToast(null), 6000)
    return () => window.clearTimeout(t)
  }, [toast, showToast])
  if (!toast) return null
  return (
    <div role="alert" className="glass glass--thick fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full px-5 py-2.5 text-[14px] md:bottom-6">
      {toast}
    </div>
  )
}

/** Loads the signed-in person's workspace and keeps it live. */
function WorkspaceLoader({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient()
  const ready = useWorkspace((s) => s.ready)
  const membership = useQuery({ queryKey: ['membership', userId], queryFn: () => loadMembership(userId) })
  const m = membership.data
  const snapshot = useQuery({
    queryKey: ['snapshot', m?.workspaceId],
    enabled: !!m,
    staleTime: 30_000,
    queryFn: () => {
      setSession({ actorId: m!.actorId, workspaceId: m!.workspaceId, userId })
      return loadSnapshot(m!.workspaceId, m!.actorId, userId)
    },
  })

  useEffect(() => {
    if (snapshot.data) useWorkspace.getState().hydrate(snapshot.data)
  }, [snapshot.data])

  const refresh = () => qc.invalidateQueries({ queryKey: ['snapshot', m?.workspaceId] })
  useRealtime(m?.workspaceId, refresh)

  useEffect(() => {
    onWriteError((message) => {
      useUi.getState().showToast(message)
      qc.invalidateQueries({ queryKey: ['snapshot'] })
    })
  }, [qc])

  const error = membership.error ?? snapshot.error
  if (error)
    return (
      <Screen title="Couldn’t load your workspace">
        <p>{error.message}</p>
        <Button variant="gel" className="mt-4" onClick={() => (membership.error ? membership.refetch() : snapshot.refetch())}>
          Try again
        </Button>
      </Screen>
    )
  if (membership.isSuccess && !m)
    return (
      <Screen title="No workspace yet">
        You’re signed in, but nobody has added you to a workspace. Ask a teammate for an invite.
        <Button variant="soft" className="mt-4" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </Screen>
    )
  if (!ready) return <Screen title="Opening your workspace…" />
  return children
}

export function Boot({ children }: { children: ReactNode }) {
  const session = useAuthSession()

  if (!supabaseConfigured)
    return (
      <Screen title="Foresign needs its database">
        Start the local stack and seed it: <code className="rounded bg-fill-2 px-1">npm run db:start</code> then{' '}
        <code className="rounded bg-fill-2 px-1">npm run db:seed</code>, and restart <code className="rounded bg-fill-2 px-1">npm run dev</code>.
      </Screen>
    )
  if (session === undefined) return <Screen title="Foresign" />
  if (!session) return <SignIn />
  return (
    <>
      <WorkspaceLoader key={session.user.id} userId={session.user.id}>
        {children}
      </WorkspaceLoader>
      <Toast />
    </>
  )
}
