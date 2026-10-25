import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False until .env.local has the project URL and public key (`npm run db:seed` writes them locally). */
export const supabaseConfigured = !!url && !!anon

export const supabase = createClient(url ?? 'http://127.0.0.1:54321', anon ?? 'missing-anon-key', {
  // PKCE returns sign-in links as ?code=…, which leaves the hash free for the router.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})
