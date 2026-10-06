import { supabase } from '../supabase/client'

const API_URL = import.meta.env.VITE_API_URL

// Calls the Render API with the signed-in user's Supabase token attached.
// Returns the parsed JSON, or throws an Error with the server's message.
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}
