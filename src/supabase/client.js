import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables.\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file and in Vercel.'
  )
}

// "Stay logged in" (Settings > Session).
//   on  (the default)  the sign-in is kept in localStorage: it survives closing the browser or the app
//   off                it is kept in sessionStorage: closing the tab or the app signs the user out
// The choice itself is a small flag on this device. Existing sign-ins stay in localStorage, so nobody is signed out by this change.
const STAY_KEY = 'montemy_stay_logged_in'
const SESSION_KEY = 'montemy_session'

const safe = (fn, fallback) => { try { return fn() } catch { return fallback } }

export const getStayLoggedIn = () => safe(() => localStorage.getItem(STAY_KEY) !== 'false', true)

const activeStore = () => safe(() => (getStayLoggedIn() ? localStorage : sessionStorage), localStorage)

// Supabase reads and writes its session through this object, so the switch applies to every later read and write
const switchableStorage = {
  getItem: (key) => safe(() => activeStore().getItem(key), null),
  setItem: (key, value) => safe(() => activeStore().setItem(key, value)),
  removeItem: (key) => safe(() => { localStorage.removeItem(key); sessionStorage.removeItem(key) }),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: SESSION_KEY,
    storage: switchableStorage,
  },
})

// Turns Stay logged in on or off. Moves the current sign-in to the matching store, so the change takes effect
// at once. The login page calls this before it signs in, and Settings calls it when the user changes the option.
export function setStayLoggedIn(stay) {
  const keep = stay !== false
  safe(() => {
    const from = keep ? sessionStorage : localStorage
    const to = keep ? localStorage : sessionStorage
    const current = from.getItem(SESSION_KEY)
    localStorage.setItem(STAY_KEY, keep ? 'true' : 'false')
    if (current !== null) {
      to.setItem(SESSION_KEY, current)
      from.removeItem(SESSION_KEY)
    }
  })
}

export default supabase
