import { useT } from '../../i18n/index.js'
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiFetch } from '../../api/apiClient'
import LinkRequests from '../../components/admin/LinkRequests'
import PlatformStats from '../../components/admin/PlatformStats'
import AdminResources from '../../components/admin/AdminResources'
import NotificationBell from '../../components/layout/NotificationBell'
import AdminBroadcast from '../../components/admin/AdminBroadcast'
import AdminParentTeacher from '../../components/admin/AdminParentTeacher'
import WhiteLabelManager from '../../components/admin/WhiteLabelManager'
import { useBranding } from '../../context/BrandingContext'
import Background from '../../components/shared/Background'
import ErrorBoundary from '../../components/shared/ErrorBoundary'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/shared/Icon'
import { glassCard, glassNav, glassBtn, addRipple } from '../../styles/glass'

const CIRCLES = [
  { key: 'users',        icon: 'users',      path: '/admin/users' },
  { key: 'classes',      icon: 'class',      path: '/admin/classes' },
  { key: 'orgs',         icon: 'school',     path: '/admin/organisations' },
  { key: 'school',       icon: 'manage',     path: '/admin/school-management' },
  { key: 'pending',      icon: 'pending',    path: null },
  { key: 'broadcast',    icon: 'broadcast',  path: null },
  { key: 'parentTeacher',icon: 'link',       path: null },
  { key: 'branding',     icon: 'brand',      path: null },
  { key: 'textbooks',    icon: 'book',       path: null },
  { key: 'stats',        icon: 'chart',      path: null },
  { key: 'billing',      icon: 'billing',    path: null },
  { key: 'calendar',     icon: 'calendar',   path: '/events' },
  { key: 'help',         icon: 'help',       path: '/admin/help' },
]

const TAB_CIRCLES = ['pending','broadcast','parentTeacher','branding','textbooks','stats','billing']

const circleStyle = (active) => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
  cursor: 'pointer', background: 'none', border: 'none', color: 'inherit',
  padding: '0.6rem',
})

const circleIcon = (active) => ({
  width: 'clamp(3.2rem,10vw,4rem)', height: 'clamp(3.2rem,10vw,4rem)',
  borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
  border: active ? '2px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.15)',
  transition: 'background 0.2s',
})

const smallBtn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.85rem', margin: 0 }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const t = useT()
  const { profile } = useAuth()
  const { appName } = useBranding()
  const [tab, setTab] = useState('')
  const [stats, setStats] = useState({ totalUsers: 0, pendingUsers: 0, organizations: 0 })
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmRejectId, setConfirmRejectId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, p] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/pending-users'),
      ])
      setStats(s)
      setPending(p.users)
    } catch (err) {
      setError(err.message || 'Could not load data.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (userId, action) => {
    setBusyId(userId); setError('')
    try {
      await apiFetch('/api/admin/verify-user', { method: 'POST', body: { userId, action } })
      setConfirmRejectId(null); await load()
    } catch (err) { setError(err.message) }
    setBusyId(null)
  }

  const pendingCount = pending.length

  const handleCircle = (circle) => {
    if (circle.path) return navigate(circle.path)
    setTab(tab === circle.key ? '' : circle.key)
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      <Background />

      <nav style={glassNav}>
        <span style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '1.4rem' }}>
          {appName.toUpperCase()} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>ADMIN</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {profile?.name && (
            <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
              <Icon name="settings" size={16} style={{ marginRight: '0.3rem' }} />{profile.name}
            </button>
          )}
          <NotificationBell />
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(1rem,4vw,2rem) clamp(0.75rem,3vw,1.5rem)' }}>

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(10rem,1fr))', gap: '0.75rem', marginBottom: '1.75rem' }}>
            {[
              [t('circle.totalUsers'), stats.totalUsers, 'users'],
              [t('circle.pending'),    stats.pendingUsers, 'pending'],
              [t('circle.orgs'),       stats.organizations, 'school'],
            ].map(([label, val, icon]) => (
              <div key={label} style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>{val}</div>
                <div style={{ opacity: 0.65, fontSize: '0.85rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '0.625rem', padding: '0.9rem 1rem', marginBottom: '1.25rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Circle grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(clamp(4.5rem,15vw,6rem),1fr))', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {CIRCLES.map(c => (
            <button key={c.key} onClick={() => handleCircle(c)} style={circleStyle(tab === c.key)} aria-pressed={tab === c.key}>
              <div style={circleIcon(tab === c.key)}>
                <Icon name={c.icon} size={22} />
                {c.key === 'pending' && pendingCount > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, background: '#ff5a5a', color: '#fff', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, padding: '0 0.35rem', lineHeight: 1.6 }}>{pendingCount}</span>
                )}
              </div>
              <span style={{ fontSize: 'clamp(0.68rem,2.2vw,0.8rem)', opacity: 0.8, textAlign: 'center', lineHeight: 1.2 }}>{t(`circle.${c.key}`)}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading && <SkeletonList rows={4} />}

        {!loading && tab === 'pending' && (
          <>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>{t('circle.pending')} ({pendingCount})</h2>
            {pendingCount === 0 ? (
              <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', opacity: 0.7 }}>{t('pending.none')}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pending.map(u => (
                  <div key={u.id} style={{ ...glassCard, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontWeight: 700 }}>{u.name || '(no name)'}</div>
                      <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>{u.email}</div>
                      <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                        <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 99, padding: '0.15rem 0.7rem', textTransform: 'capitalize' }}>{u.role}</span>
                        <span style={{ opacity: 0.55 }}>{u.org_name || t('pending.noOrg')}</span>
                        <span style={{ opacity: 0.4 }}>· {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {confirmRejectId === u.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>{t('pending.confirmReject')}</span>
                        <button disabled={busyId === u.id} onClick={() => act(u.id, 'reject')}
                          style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: '#fff', boxShadow: 'none' }}>
                          {busyId === u.id ? '…' : t('pending.yesReject')}
                        </button>
                        <button onClick={() => setConfirmRejectId(null)} style={{ ...smallBtn, background: 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none' }}>{t('pending.cancel')}</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button disabled={busyId === u.id} onClick={(e) => { addRipple(e); act(u.id, 'approve') }}
                          style={{ ...smallBtn, opacity: busyId === u.id ? 0.6 : 1 }}>
                          {busyId === u.id ? '…' : t('pending.approve')}
                        </button>
                        <button disabled={busyId === u.id} onClick={() => setConfirmRejectId(u.id)}
                          style={{ ...smallBtn, background: 'transparent', color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)', boxShadow: 'none' }}>
                          {t('pending.reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && tab === 'broadcast'     && <ErrorBoundary section><AdminBroadcast /></ErrorBoundary>}
        {!loading && tab === 'parentTeacher' && <ErrorBoundary section><AdminParentTeacher /></ErrorBoundary>}
        {!loading && tab === 'branding'      && <ErrorBoundary section><WhiteLabelManager /></ErrorBoundary>}
        {!loading && tab === 'textbooks'     && <ErrorBoundary section><AdminResources /></ErrorBoundary>}
        {!loading && tab === 'stats'         && <ErrorBoundary section><PlatformStats /></ErrorBoundary>}
        {!loading && tab === 'billing'       && <ErrorBoundary section><LinkRequests /></ErrorBoundary>}
      </div>
    </div>
  )
}
