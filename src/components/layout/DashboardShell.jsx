import React from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../supabase/authHelpers'
import { useAuth } from '../../context/AuthContext'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassNav, glassBtn, addRipple, C } from '../../styles/glass'

// Shared dashboard layout used by student, teacher, parent, principal,
// tutor and school member dashboards.
// Props: role (display label), cards [{ icon, title, description, path, requiresVerification }]
// (the old `collection` prop is no longer needed and is ignored)
export default function DashboardShell({ role, cards = [] }) {
  const navigate = useNavigate()
  const { profile, loading, isVerified: verified } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)', zIndex: -1 }} />
      )}

      <nav style={glassNav}>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {profile?.name && <span style={{ color: 'rgba(255,255,255,0.8)' }}>{profile.name}</span>}
          <button onClick={handleLogout}
            style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h2 style={{ color: C.turquoise, fontSize: '1.8rem', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
          {role} Dashboard
        </h2>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading...</p>
        ) : (
          <>
            {!verified && (
              <div onClick={() => navigate('/pending-verification')}
                style={{ cursor: 'pointer', background: 'rgba(255,200,0,0.15)', border: '1px solid rgba(255,200,0,0.4)', borderRadius: '10px', padding: '0.8rem 1rem', margin: '1rem 0', color: '#ffe08a', fontSize: '0.9rem' }}>
                ⏳ Your account is awaiting admin verification. Some features are locked.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
              {cards.map((card) => {
                const locked = card.requiresVerification && !verified
                return (
                  <div key={card.title}
                    className="glass"
                    onClick={(e) => { if (!locked) { addRipple(e); navigate(card.path) } }}
                    style={{ ...glassCard, padding: '1.5rem', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1 }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{locked ? '🔒' : card.icon}</div>
                    <h3 style={{ color: C.turquoise, marginBottom: '0.4rem' }}>{card.title}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.5 }}>{card.description}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
