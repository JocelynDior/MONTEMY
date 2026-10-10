import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { apiFetch } from '../api/apiClient'
import { useAuth } from '../context/AuthContext'

// Unread message count for the signed-in user, kept live with Supabase Realtime.
// Realtime only tells us "something changed"; the number itself always comes from the API.
export function useUnreadMessages() {
  const { user } = useAuth()
  const userId = user?.id
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const data = await apiFetch('/api/messages/unread-count')
      setUnread(data.unread || 0)
    } catch {
      // The badge is optional: stay quiet if the API is asleep or unreachable
    }
  }, [userId])

  useEffect(() => {
    if (!userId) { setUnread(0); return }
    refresh()

    const filter = `receiver_id=eq.${userId}`
    const channel = supabase
      .channel(`unread-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, refresh])

  return { unread, refresh }
}
