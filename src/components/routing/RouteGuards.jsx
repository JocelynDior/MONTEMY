import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import LoadingScreen from '../shared/LoadingScreen'

// Requires a signed-in user. No session -> /login.
export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Requires a specific role (string or array). Use inside ProtectedRoute.
// Wrong role -> sent to their own dashboard. No profile row -> /login.
export function RoleRoute({ role, children }) {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!profile || !ROLE_ROUTES[profile.role]) return <Navigate to="/login" replace />

  const allowed = Array.isArray(role) ? role : [role]
  if (!allowed.includes(profile.role)) {
    return <Navigate to={ROLE_ROUTES[profile.role]} replace />
  }
  return children
}

// For / and /login: signed-in users are sent to their dashboard instead.
export function PublicOnlyRoute({ children }) {
  const { session, profile, initializing, redirectHeld } = useAuth()

  // Only wait on the very first check, so the login form is never unmounted mid-login
  if (initializing) return <LoadingScreen />
  if (session && profile && ROLE_ROUTES[profile.role] && !redirectHeld()) {
    return <Navigate to={ROLE_ROUTES[profile.role]} replace />
  }
  return children
}
