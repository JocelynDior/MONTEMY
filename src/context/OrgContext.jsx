import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/apiClient'
import { useAuth } from './AuthContext'

// The signed-in user's organisation (name, type, logo, slides), loaded once through GET /api/shell and shared by
// the top bar, the slideshow and every page that needs School or Firm wording.
// The last answer is kept on the device (per user) so the frame does not flash empty on a refresh.
// authHelpers.logout() removes it, so the next person on the device never sees it.
export const ORG_CACHE_KEY = 'montemy_org'

const EMPTY = { name: '', type: null, logoUrl: '', slides: [] }

function readCache(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(ORG_CACHE_KEY) || 'null')
    if (raw && raw.userId === userId && raw.org) return raw.org
  } catch { /* ignore */ }
  return null
}
function writeCache(userId, org) {
  try { localStorage.setItem(ORG_CACHE_KEY, JSON.stringify({ userId, org })) } catch { /* ignore */ }
}

const OrgContext = createContext(null)

export function OrgProvider({ children }) {
  const { session, loading, initializing } = useAuth()
  const userId = session?.user?.id || null
  const [org, setOrg] = useState(EMPTY)
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 })
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const data = await apiFetch('/api/shell')
      const next = {
        name: data.org?.name || '',
        type: data.org?.type || null,
        logoUrl: data.org?.logoUrl || '',
        slides: Array.isArray(data.slides) ? data.slides : [],
      }
      setOrg(next)
      setCounts({ messages: data.unreadMessages || 0, notifications: data.unreadNotifications || 0 })
      writeCache(userId, next)
    } catch (err) {
      // The frame still works without it: the app name is shown and the banner stays a plain placeholder
      console.warn('Could not load the organisation:', err.message)
    }
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    if (initializing) return
    if (!userId) { setOrg(EMPTY); setCounts({ messages: 0, notifications: 0 }); setLoaded(false); return }
    setOrg(readCache(userId) || EMPTY)
    setLoaded(false)
  }, [initializing, userId])

  // Wait for the profile so the call is made once, after sign-in is complete
  useEffect(() => {
    if (initializing || loading || !userId) return
    load()
  }, [initializing, loading, userId, load])

  const value = useMemo(() => ({
    orgName: org.name, orgType: org.type, logoUrl: org.logoUrl, slides: org.slides,
    counts, loaded, reload: load,
  }), [org, counts, loaded, load])

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used inside <OrgProvider>')
  return ctx
}
