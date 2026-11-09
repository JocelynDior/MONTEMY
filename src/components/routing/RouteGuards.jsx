import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import { ROLE_ROUTES, homeRouteFor, logout } from '../../supabase/authHelpers'
import LoadingScreen from '../shared/LoadingScreen'
import Icon from '../shared/Icon'
import { glassBtn } from '../../styles/glass'

// Shown instead of a blank screen when an admin has blocked the account
function BlockedScreen() {
  const t = useT()
  const navigate = useNavigate()
  const leave = async () => { await logout(); navigate('/', { replace: true }) }
  return (
    <div role="alert" style={{
      minHeight: 'var(--app-height)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--sp-3)', textAlign: 'center', padding: 'var(--page-gutter)', background: 'var(--bg)', color: 'var(--fg)',
    }}>
      <Icon name="lock" size="3rem" />
      <h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>{t('shell.blockedTitle')}</h1>
      <p style={{ maxWidth: '28rem', color: 'var(--fg-muted)', margin: 0, lineHeight: 1.5 }}>{t('shell.blockedText')}</p>
      <button onClick={leave} style={{ ...glassBtn, width: 'auto', padding: '0.7rem 1.6rem', marginTop: 'var(--sp-2)' }}>{t('shell.logOut')}</button>
    </div>
  )
}

// Requires a signed-in user. No session -> /login. A blocked account sees a clear message.
export function ProtectedRoute({ children }) {
  const { session, loading, blocked } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (blocked) return <BlockedScreen />
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
// A blocked account is sent on like everyone else and sees the Blocked message on its dashboard (ProtectedRoute).
export function PublicOnlyRoute({ children }) {
  const { session, profile, initializing, redirectHeld } = useAuth()

  // Only wait on the very first check, so the login form is never unmounted mid-login
  if (initializing) return <LoadingScreen />
  if (session && profile && ROLE_ROUTES[profile.role] && !redirectHeld()) {
    return <Navigate to={homeRouteFor(profile)} replace />
  }
  return children
}
