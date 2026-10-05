import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getProfile, ROLE_ROUTES } from '../../supabase/authHelpers'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, glassInput, addRipple, C } from '../../styles/glass'

const API_URL = import.meta.env.VITE_API_URL

function friendlyError(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Invalid email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the confirmation link.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your connection and try again.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a moment and try again.'
  return err?.message || 'Something went wrong. Please try again.'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdmin, setIsAdmin] = useState(location.pathname === '/admin-login')
  const [form, setForm] = useState({ email: '', password: '', adminKey: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sign out and show an error (used when a check fails after a successful sign-in)
  const rejectLogin = async (message) => {
    await supabase.auth.signOut()
    localStorage.removeItem('montemy_role')
    setError(message)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const email = form.email.trim().toLowerCase()

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      })
      if (signInErr) throw signInErr

      const profile = await getProfile(data.user.id)
      if (!profile || !ROLE_ROUTES[profile.role]) {
        await rejectLogin('We could not find your account profile. Please register or contact support.')
        return
      }

      if (isAdmin) {
        if (profile.role !== 'admin') {
          await rejectLogin('This account is not an admin account.')
          return
        }
        // The admin key is checked on the server — never in the browser
        let res, body
        try {
          res = await fetch(`${API_URL}/api/admin/login-check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ adminKey: form.adminKey }),
          })
          body = await res.json().catch(() => ({}))
        } catch {
          await rejectLogin('Could not reach the server. Check your connection and try again.')
          return
        }
        if (!res.ok) {
          await rejectLogin(body.error || 'Invalid admin key.')
          return
        }
      } else if (profile.role === 'admin') {
        await rejectLogin('Admins must sign in using the Admin Login tab.')
        return
      }

      localStorage.setItem('montemy_role', profile.role)
      navigate(ROLE_ROUTES[profile.role])
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)', zIndex: -1 }} />
      )}

      <style>{`
        .login-input:focus { border-color: rgba(64,224,208,0.8) !important; box-shadow: 0 0 12px rgba(64,224,208,0.25); }
        .toggle-tab { transition: all 0.2s; cursor: pointer; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.95rem; border: none; }
      `}</style>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(0,31,63,0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(64,224,208,0.2)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: C.turquoise, fontSize: '1.4rem', cursor: 'pointer', marginRight: '1rem' }}>←</button>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY</span>
      </nav>

      <div style={{ ...glassCard, padding: '2.5rem', maxWidth: '440px', width: '90%', marginTop: '4rem' }} className="glass">

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: C.turquoise, fontSize: '1.8rem', marginBottom: '0.25rem' }}>Welcome Back</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Sign in to your account</p>
        </div>

        {/* Admin / Regular toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', marginBottom: '1.75rem', gap: '4px' }}>
          {[['Regular Login', false], ['Admin Login', true]].map(([label, val]) => (
            <button key={label} type="button"
              className="toggle-tab"
              onClick={() => { setIsAdmin(val); setError('') }}
              style={{ flex: 1, background: isAdmin === val ? 'rgba(64,224,208,0.85)' : 'transparent', color: isAdmin === val ? C.navy : 'rgba(255,255,255,0.6)' }}>
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Email</label>
            <input className="login-input" style={glassInput} type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={isAdmin ? 'Enter admin email' : 'Enter your email'} required />
          </div>

          <div style={{ marginBottom: isAdmin ? '1.25rem' : '1.5rem' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input className="login-input" style={glassInput} type={showPassword ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Enter your password" required />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: C.turquoise }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isAdmin && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Admin Key</label>
              <input className="login-input" style={glassInput} type="password" value={form.adminKey}
                onChange={e => setForm(f => ({ ...f, adminKey: e.target.value }))}
                placeholder="Enter admin key" required />
            </div>
          )}

          <button type="submit" disabled={loading}
            onClick={(e) => !loading && addRipple(e)}
            style={{ ...glassBtn, opacity: loading ? 0.7 : 1 }}
            className="ripple-container">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            Don't have an account?{' '}
            <span onClick={() => navigate('/create-account')} style={{ color: C.turquoise, cursor: 'pointer', textDecoration: 'underline' }}>Create one here</span>
          </span>
        </div>
      </div>
    </div>
  )
}
