import { Mail } from 'lucide-react'
import { useState } from 'react'
import { Glass } from '@/components/glass/Glass'
import { LogoMark } from '@/components/shell/Logo'
import { Wallpaper } from '@/components/shell/Wallpaper'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { supabase } from '@/lib/supabase'

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined

export function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)

  const signIn = async (e: string, p: string) => {
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p })
    setBusy(false)
    if (error) setMessage({ tone: 'error', text: error.message })
  }

  const sendLink = async () => {
    if (!email.trim()) return setMessage({ tone: 'error', text: 'Enter your email first.' })
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setBusy(false)
    setMessage(
      error
        ? { tone: 'error', text: error.message }
        : {
            tone: 'info',
            text: import.meta.env.DEV
              ? 'Link sent. Locally, emails land in Mailpit at http://127.0.0.1:54324.'
              : 'Check your inbox for a sign-in link.',
          },
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Wallpaper />
      <Glass className="w-full max-w-[400px] rounded-card p-7">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <h1 className="display text-[24px] font-bold">Sign in to Foresign</h1>
            <p className="text-[13px] text-ink-2">Where your team and its agents ship</p>
          </div>
        </div>
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            signIn(email.trim(), password)
          }}
        >
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {message && (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'text-[13px] text-danger' : 'text-[13px] text-ink-2'}>
              {message.text}
            </p>
          )}
          <Button variant="gel" size="lg" type="submit" disabled={busy || !password}>
            Sign in
          </Button>
          <Button variant="soft" type="button" disabled={busy} onClick={sendLink}>
            <Mail /> Email me a sign-in link
          </Button>
          {import.meta.env.DEV && DEMO_EMAIL && DEMO_PASSWORD && (
            <Button variant="ghost" type="button" disabled={busy} onClick={() => signIn(DEMO_EMAIL, DEMO_PASSWORD)}>
              Use the local demo account
            </Button>
          )}
        </form>
      </Glass>
    </div>
  )
}
