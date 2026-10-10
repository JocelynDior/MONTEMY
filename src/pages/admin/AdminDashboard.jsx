import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { logout } from '../../supabase/authHelpers'
import { apiFetch } from '../../api/apiClient'
import LinkRequests from '../../components/admin/LinkRequests'
import PlatformStats from '../../components/admin/PlatformStats'
import MessagesBell from '../../components/layout/MessagesBell'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassNav, glassBtn, addRipple, C } from '../../styles/glass'

const smallBtn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.85rem', margin: 0 }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ totalUsers: 0, pendingUsers: 0, organizations: 0 })
  const [pending, setPending] = useState([])
  const [linkCount, setLinkCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmRejectId, setConfirmRejectId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, p, l] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/pending-users'),
        apiFetch('/api/admin/link-requests?status=pending').catch(() => null),
      ])
      setStats(s)
      setPending(p.users)
      setLinkCount(l?.requests?.length || 0)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load data. The server may be waking up — try again in a few seconds.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const act = async (userId, action) => {
    setBusyId(userId)
    setError('')
    try {
      await apiFetch('/api/admin/verify-user', { method: 'POST', body: { userId, action } })
      setConfirmRejectId(null)
      await load()
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const pendingCount = pending.length

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
      )}

      <nav style={glassNav}>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>ADMIN</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {pendingCount > 0 && (
            <span onClick={() => setTab('pending')} title="Pending verifications"
              style={{ cursor: 'pointer', background: '#ff5a5a', color: 'white', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>
              {pendingCount}
            </span>
          )}
          {profile?.name && <span style={{ color: 'rgba(255,255,255,0.8)' }}>{profile.name}</span>}
          <MessagesBell />
          <button onClick={handleLogout} style={smallBtn}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[['overview', 'Overview'], ['pending', 'Pending'], ['links', 'Parent links']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ border: 'none', cursor: 'pointer', padding: '0.6rem 1.4rem', borderRadius: '8px', fontWeight: 600,
                background: tab === key ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.08)',
                color: tab === key ? C.navy : 'rgba(255,255,255,0.7)' }}>
              {label}{key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}{key === 'links' && linkCount > 0 ? ` (${linkCount})` : ''}
            </button>
          ))}
          <button onClick={() => { setLoading(true); load() }}
            style={{ marginLeft: 'auto', background: 'none', border: '1px solid rgba(var(--color-primary-rgb),0.4)', color: C.turquoise, borderRadius: '8px', padding: '0.6rem 1rem', cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
        ) : tab === 'overview' ? (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.25rem' }}>Overview</h2>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {[['/admin/users', '👥 Users'], ['/admin/classes', '🏫 Classes'], ['/admin/organisations', '🏢 Organisations'], ['/messages', '💬 Messages']].map(([path, text]) => (
                <button key={path} onClick={() => navigate(path)} style={smallBtn}>{text}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {[
                ['Total Users', stats.totalUsers, '👥'],
                ['Pending Verification', stats.pendingUsers, '⏳'],
                ['Organisations', stats.organizations, '🏫'],
              ].map(([label, value, icon]) => (
                <div key={label} className="glass" style={{ ...glassCard, padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem' }}>{icon}</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 700, color: C.turquoise }}>{value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>{label}</div>
                </div>
              ))}
            </div>
            {stats.pendingUsers > 0 && (
              <div className="glass" style={{ ...glassCard, padding: '1.25rem 1.5rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ flex: 1 }}>{stats.pendingUsers} user{stats.pendingUsers === 1 ? '' : 's'} waiting for approval.</span>
                <button onClick={() => setTab('pending')} style={smallBtn}>Review Now</button>
              </div>
            )}
            <PlatformStats />
          </>
        ) : tab === 'links' ? (
          <LinkRequests onChanged={load} />
        ) : (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.25rem' }}>Pending Verification ({pendingCount})</h2>
            {pendingCount === 0 ? (
              <div className="glass" style={{ ...glassCard, padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                🎉 No one is waiting for approval.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pending.map(u => (
                  <div key={u.id} className="glass" style={{ ...glassCard, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{u.name || '(no name)'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }}>{u.email}</div>
                      <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                        <span style={{ background: 'rgba(var(--color-primary-rgb),0.2)', color: C.turquoise, borderRadius: '999px', padding: '0.15rem 0.7rem', textTransform: 'capitalize' }}>{u.role}</span>
                        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{u.org_name || 'No organisation'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>· Signed up {new Date(u.created_at).toLocaleDateString()}</span>
                        <span style={{ color: u.email_verified ? '#7dffb0' : '#ffe08a' }}>· Email {u.email_verified ? 'verified' : 'not verified'}</span>
                      </div>
                    </div>

                    {confirmRejectId === u.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Delete this account?</span>
                        <button disabled={busyId === u.id} onClick={() => act(u.id, 'reject')}
                          style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>
                          {busyId === u.id ? '...' : 'Yes, reject'}
                        </button>
                        <button onClick={() => setConfirmRejectId(null)}
                          style={{ ...smallBtn, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button disabled={busyId === u.id} onClick={(e) => { addRipple(e); act(u.id, 'approve') }}
                          style={{ ...smallBtn, opacity: busyId === u.id ? 0.6 : 1 }}>
                          {busyId === u.id ? '...' : 'Approve'}
                        </button>
                        <button disabled={busyId === u.id} onClick={() => setConfirmRejectId(u.id)}
                          style={{ ...smallBtn, background: 'transparent', color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)', boxShadow: 'none' }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
