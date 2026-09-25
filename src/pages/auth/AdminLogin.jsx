import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [loading, setLoading] = useState(false)

  const showMsg = (text, type) => setMessage({ text, type })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'admins'))
      const found = snap.docs.find(d => d.data().email?.toLowerCase() === email.trim().toLowerCase())
      if (!found) { showMsg('Admin account not found.', 'error'); setLoading(false); return }
      await signInWithEmailAndPassword(auth, email.trim(), password)
      showMsg('Login successful! Redirecting...', 'success')
      setTimeout(() => navigate('/admin/dashboard'), 1500)
    } catch (err) {
      showMsg('Login failed: ' + err.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', fontFamily: 'Arial' }}>

      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#001F3F', zIndex: -1 }} />
      )}

      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', borderLeft: '4px solid #40E0D0', maxWidth: '400px', width: '100%', color: 'white' }}>
        <div style={{ color: '#40E0D0', fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem' }}>MONTEMY</div>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Admin Login</h2>
        <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Restricted access — admins only</p>

        {message.text && (
          <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '5px', background: message.type === 'error' ? '#ff6b6b' : '#90EE90', color: message.type === 'error' ? 'white' : 'darkgreen' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#40E0D0', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@montemy.com"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: 'none', color: '#001F3F', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ color: '#40E0D0', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: 'none', color: '#001F3F', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ background: '#40E0D0', color: '#001F3F', padding: '1rem', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', width: '100%', marginTop: '1rem', boxShadow: '0 0 15px #40E0D0', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={() => navigate('/')}
            style={{ color: '#40E0D0', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
