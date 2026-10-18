/**
 * Supabase client bootstrap.
 *
 * The app runs in DEMO MODE unless BOTH VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are provided in the environment.
 *
 * In demo mode `supabase` is null and every data access goes through the
 * in-memory mock store (src/lib/store.jsx). Nothing is persisted and no
 * network request is made.
 *
 * SECURITY NOTE: only the public `anon` key may be used in the browser.
 * The `service_role` key and any payment gateway secrets must stay
 * server-side (e.g. a Supabase Edge Function or your own backend).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isDemoMode = !(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

export function getMode() {
  return isDemoMode ? 'demo' : 'supabase'
}
