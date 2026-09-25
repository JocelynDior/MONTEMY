import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, glassInput, addRipple, C } from '../../styles/glass'

const ADMIN_KEY = 'montemy'
const ADMIN_EMAIL = 'Montemyadmin@gmail.com'

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  principal: '/principal/dashboard',
  tutor: '/tutor/dashboard',
  schoolmember: '/schoolmember/dashboard',
  admin: '/admin/dashboard',
}

const roleCollections = {
  student: 'students', teacher: 'teachers', parent: 'parents',
  principal: 'principals', tutor: 'tutors', schoolmember: 'schoolMembers',
}

export default function Login() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', username: '', adminKey: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const role = localStorage.getItem('montemy_role')
        if (role && roleRoutes[role]) {
          navigate(roleRoutes[role])
        }
      }
    })
    return () => unsub()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await setPersistence(auth, browserLocalPersistence)

      if (isAdmin) {
        if (form.adminKey !== ADMIN_KEY) { setError('Invalid admin key.'); setLoading(false); return }
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_KEY)
        localStorage.setItem('montemy_role', 'admin')
        navigate('/admin/dashboard')
        return
      }

      const cred = await signInWithEmailAndPassword(auth, form.email, form.password)
      const uid = cred.user.uid

      // Find which collection this user belongs to
      let foundRole = null
      for (const [role, col] of Object.entries(roleCollections)) {
        const snap = await getDoc(doc(db, col, uid))
        if (snap.exists()) { foundRole = role; break }
      }

      if (!foundRole) { setError('Account not found. Please register first.'); setLoading(false); return }

      localStorage.setItem('montemy_role', foundRole)
      navigate(roleRoutes[foundRole])
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.')
      } else {
        setError(err.message.replace('Firebase: ', ''))
      }
    }
    setLoading(false)
  }

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
            <button key={label}
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
          {isAdmin ? (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Username</label>
                <input className="login-input" style={glassInput} value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter admin username" required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Admin Key</label>
                <input className="login-input" style={glassInput} type="password" value={form.adminKey}
                  onChange={e => setForm(f => ({ ...f, adminKey: e.target.value }))}
                  placeholder="Enter admin key" required />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Email</label>
                <input className="login-input" style={glassInput} type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Enter your email" required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Password</label>
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
            </>
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
