import React from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, addRipple, C } from '../../styles/glass'

export default function PendingVerification() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('montemy_role')
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)', zIndex: -1 }} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.08);} }
      `}</style>

      <div style={{ ...glassCard, padding: '3rem 2.5rem', maxWidth: '460px', width: '90%', textAlign: 'center' }} className="glass">
        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pulse 2.5s ease-in-out infinite' }}>⏳</div>
        <h2 style={{ color: C.turquoise, fontSize: '1.7rem', marginBottom: '1rem' }}>Account Pending Verification</h2>
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.4), transparent)', margin: '1.5rem 0' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: '1.8', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Your account has been created successfully and is currently <strong style={{ color: C.turquoise }}>awaiting admin verification</strong>.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.7', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Once verified, you will have full access to your dashboard. You can still browse your dashboard in preview mode, but some features will be locked until verification is complete.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button onClick={(e) => { addRipple(e); navigate(-1) }}
            className="ripple-container"
            style={{ ...glassBtn }}>
            View Dashboard Preview
          </button>
          <button onClick={handleLogout}
            style={{ ...glassBtn, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
