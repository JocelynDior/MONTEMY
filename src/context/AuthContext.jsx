import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase, getStayLoggedIn, setStayLoggedIn as saveStayLoggedIn } from '../supabase/client'
import { getProfile } from '../supabase/authHelpers'
import { useTheme } from './ThemeContext'
import { useI18n } from '../i18n'

const AuthContext = createContext(null)

// A new device has no saved choice yet, so the choice saved on the account (users.preferred_theme and
// preferred_language) is applied once after sign-in. The account defaults ('system' and 'en') are not a choice,
// so they never override the phone's own setting or language.
const hasLocal = (key) => { try { return localStorage.getItem(key) !== null } catch { return false } }

// Single source of truth for "who is signed in" across the whole app.
// Provides: session, user, profile, role, isVerified, blocked, loading, stayLoggedIn
export function AuthProvider({ children }) {
  const { setTheme } = useTheme()
  const { setLang } = useI18n()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null) // which user the profile belongs to
  const [initializing, setInitializing] = useState(true)   // true until the first session check finishes
  const [stayLoggedIn, setStayState] = useState(getStayLoggedIn)
  const holdRef = useRef(false)
  const appliedFor = useRef(null)

  const loadProfile = useCallback(async (sess) => {
    if (!sess) {
      setProfile(null)
      setProfileUserId(null)
      appliedFor.current = null
      localStorage.removeItem('montemy_role')
      setInitializing(false)
      return
    }
    const p = await getProfile(sess.user.id)
    setProfile(p)
    setProfileUserId(sess.user.id)
    if (p?.role) localStorage.setItem('montemy_role', p.role)

    // Once per sign-in, not on every profile refresh
    if (p && appliedFor.current !== sess.user.id) {
      appliedFor.current = sess.user.id
      if (!hasLocal('montemy_theme') && (p.preferred_theme === 'light' || p.preferred_theme === 'dark')) setTheme(p.preferred_theme)
      if (!hasLocal('montemy_language') && p.preferred_language && p.preferred_language !== 'en') setLang(p.preferred_language)
    }
    setInitializing(false)
  }, [setTheme, setLang])

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

  // Stay logged in on or off. The login page calls this before signing in; Settings calls it when the user changes it.
  const setStayLoggedIn = useCallback((stay) => {
    saveStayLoggedIn(stay)
    setStayState(stay !== false)
  }, [])

  // Loading = first check not done, OR signed in but profile not fetched yet
  const loading = initializing || (!!session && profileUserId !== session.user.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isVerified: !!profile?.is_verified,
    blocked: !!profile?.is_suspended,   // an admin has blocked this account
    loading,
    initializing,
    stayLoggedIn,
    setStayLoggedIn,
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
