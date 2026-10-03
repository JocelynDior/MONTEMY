import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables.\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file and in Vercel.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'montemy_session',
  },
})

export default supabase

// TEMPORARY: legacy pages still import { auth, db } from the old Firebase setup.
// These placeholders only let the site build. Each page is rewritten to use
// `supabase` in its own phase; delete these two lines once none remain.
export const auth = null
export const db = null
