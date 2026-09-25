import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, addRipple, C } from '../../styles/glass'

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  principal: '/principal/dashboard',
  tutor: '/tutor/dashboard',
  schoolmember: '/schoolmember/dashboard',
  admin: '/admin/dashboard',
}

export default function Landing() {
  const navigate = useNavigate()

  useEffect(() => {
    // Check for existing Supabase session on mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const role = localStorage.getItem('montemy_role')
        if (role && roleRoutes[role]) {
          navigate(roleRoutes[role])
        }
      }
    }
    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const role = localStorage.getItem('montemy_role')
        if (role && roleRoutes[role]) {
          navigate(roleRoutes[role])
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)', zIndex: -1 }} />
      )}

      {/* Animated orbs */}
      <div style={{ position: 'fixed', top: '15%', left: '10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(64,224,208,0.15) 0%, transparent 70%)', animation: 'orbFloat 7s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(64,224,208,0.1) 0%, transparent 70%)', animation: 'orbFloat 10s ease-in-out infinite reverse', pointerEvents: 'none', zIndex: 0 }} />

      <style>{`
        @keyframes orbFloat {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes logoGlow {
          0%,100% { text-shadow: 0 0 20px rgba(64,224,208,0.6), 0 0 40px rgba(64,224,208,0.3); }
          50% { text-shadow: 0 0 35px rgba(64,224,208,0.9), 0 0 70px rgba(64,224,208,0.5); }
        }
        .land-btn {
          transition: transform 0.2s, box-shadow 0.2s !important;
        }
        .land-btn:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 0 35px rgba(64,224,208,0.7) !important;
        }
        .land-btn:active { transform: scale(0.97) !important; }
      `}</style>

      <div style={{ ...glassCard, padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center', zIndex: 1 }}
        className="glass ripple-container">

        {/* Logo */}
        <div style={{ fontSize: '1rem', color: C.turquoise, letterSpacing: '4px', marginBottom: '0.5rem', opacity: 0.8 }}>WELCOME TO</div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: '700', color: C.turquoise, animation: 'logoGlow 3s ease-in-out infinite', marginBottom: '0.5rem' }}>MONTEMY</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '3rem', lineHeight: '1.6' }}>
          Your all-in-one education platform connecting students, teachers, tutors, parents and schools.
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(64,224,208,0.5), transparent)', marginBottom: '2rem' }} />

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button className="land-btn ripple-container"
            onClick={(e) => { addRipple(e); navigate('/login') }}
            style={{ ...glassBtn, fontSize: '1.1rem', padding: '1rem' }}>
            Login
          </button>
          <button className="land-btn ripple-container"
            onClick={(e) => { addRipple(e); navigate('/create-account') }}
            style={{ ...glassBtn, background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(64,224,208,0.5)', boxShadow: '0 0 20px rgba(64,224,208,0.15)', fontSize: '1.1rem', padding: '1rem' }}>
            Create Account
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '2rem' }}>© 2024 Montemy. All rights reserved.</p>
      </div>
    </div>
  )
}
