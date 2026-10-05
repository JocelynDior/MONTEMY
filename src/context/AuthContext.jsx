import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../supabase/client'
import { getProfile } from '../supabase/authHelpers'

const AuthContext = createContext(null)

// Single source of truth for "who is signed in" across the whole app.
// Provides: session, user, profile, role, isVerified, loading
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null) // which user the profile belongs to
  const [initializing, setInitializing] = useState(true)   // true until the first session check finishes
  const holdRef = useRef(false)

  const loadProfile = useCallback(async (sess) => {
    if (!sess) {
      setProfile(null)
      setProfileUserId(null)
      localStorage.removeItem('montemy_role')
      setInitializing(false)
      return
    }
    const p = await getProfile(sess.user.id)
    setProfile(p)
    setProfileUserId(sess.user.id)
    if (p?.role) localStorage.setItem('montemy_role', p.role)
    setInitializing(false)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess)
      if (event === 'TOKEN_REFRESHED') return // same user, nothing else to reload
      // Defer: calling Supabase inside this callback can deadlock
      setTimeout(() => loadProfile(sess), 0)
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

  // Login page uses this to stop auto-redirects while it runs its own checks (e.g. admin key)
  const holdRedirect = useCallback((value) => { holdRef.current = value }, [])
  const redirectHeld = useCallback(() => holdRef.current, [])
  const refreshProfile = useCallback(() => (session ? loadProfile(session) : null), [session, loadProfile])

  // Loading = first check not done, OR signed in but profile not fetched yet
  const loading = initializing || (!!session && profileUserId !== session.user.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isVerified: !!profile?.is_verified,
    loading,
    initializing,
    holdRedirect,
    redirectHeld,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
