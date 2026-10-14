import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { apiFetch } from '../api/apiClient'
import { useAuth } from '../context/AuthContext'

// The signed-in user's latest notifications, kept live with Supabase Realtime.
// Realtime only says "a new one arrived"; the list and the unread count always come from the API.
export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const data = await apiFetch('/api/notifications')
      setNotifications(data.notifications || [])
      setUnread(data.unread || 0)
    } catch {
      // The bell is optional: stay quiet if the API is asleep or unreachable
    }
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    if (!userId) { setNotifications([]); setUnread(0); setLoaded(false); return }
    refresh()

    const channel = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe()

    // Realtime can drop on sleep or a flaky connection, so also catch up when the tab is shown again
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, refresh])

  // Updates the screen straight away, then tells the API; puts things right if the API fails
  const markRead = useCallback(async (id) => {
    const target = notifications.find(n => n.id === id)
    if (!target || target.read) return
    setNotifications(list => list.map(n => (n.id === id ? { ...n, read: true } : n)))
    setUnread(u => Math.max(0, u - 1))
    try { await apiFetch('/api/notifications/read', { method: 'POST', body: { id } }) } catch { refresh() }
  }, [notifications, refresh])

  const markAllRead = useCallback(async () => {
    setNotifications(list => list.map(n => ({ ...n, read: true })))
    setUnread(0)
    try { await apiFetch('/api/notifications/read', { method: 'POST', body: { all: true } }) } catch { refresh() }
  }, [refresh])

  return { notifications, unread, loaded, refresh, markRead, markAllRead }
}
