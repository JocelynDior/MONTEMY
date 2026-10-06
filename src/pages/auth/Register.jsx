import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, glassInput, addRipple, C } from '../../styles/glass'

const API_URL = import.meta.env.VITE_API_URL

const labels = {
  student: 'Student', tutor: 'Tutor', parent: 'Parent',
  teacher: 'Teacher', principal: 'Principal', schoolmember: 'School Member',
}
const icons = {
  student: '🎓', tutor: '📖', parent: '👨‍👩‍👧',
  teacher: '🏫', principal: '👔', schoolmember: '🏢',
}
// role -> role-specific table
const ROLE_TABLES = {
  student: 'students', tutor: 'tutors', parent: 'parents',
  teacher: 'teachers', principal: 'principals', schoolmember: 'school_members',
}

function friendlyError(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try logging in instead.'
  if (m.includes('password'))
    return 'Password is too weak. Use at least 6 characters.'
  if (m.includes('valid email') || m.includes('invalid email'))
    return 'Please enter a valid email address.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('failed to fetch'))
    return 'Cannot reach the server. Check your connection and try again.'
  return err?.message || 'Something went wrong. Please try again.'
}

const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }

function Background() {
  return BACKGROUND_VIDEO ? (
    <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
      <source src={BACKGROUND_VIDEO} type="video/mp4" />
    </video>
  ) : (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
  )
}

export default function Register() {
  const { type } = useParams()
  const navigate = useNavigate()
  const isAdmin = type === 'admin'
  const validRole = isAdmin || !!ROLE_TABLES[type]

  const [form, setForm] = useState({ name: '', org: '', email: '', password: '', adminKey: '' })
  const [orgSearch, setOrgSearch] = useState('')
  const [orgs, setOrgs] = useState([])
  const [filteredOrgs, setFilteredOrgs] = useState([])
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [verifyChoice, setVerifyChoice] = useState('now')

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  useEffect(() => {
    if (!isAdmin) loadOrgs()
  }, [isAdmin])

  const loadOrgs = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, type')
      .order('name')
    if (error) {
      console.error(error)
      setError(`Could not load schools and organisations (${error.message || 'unknown error'}). Please refresh the page.`)
      return
    }
    setOrgs(data || [])
  }

  const handleOrgSearch = (val) => {
    setOrgSearch(val)
    setForm(f => ({ ...f, org: '' }))
    if (!val) { setFilteredOrgs([]); setShowOrgDropdown(false); return }
    setFilteredOrgs(orgs.filter(o => o.name.toLowerCase().includes(val.toLowerCase())))
    setShowOrgDropdown(true)
  }

  const selectOrg = (org) => {
    setForm(f => ({ ...f, org: org.id }))
    setOrgSearch(org.name)
    setShowOrgDropdown(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const email = form.email.trim().toLowerCase()
    const name = form.name.trim()

    if (!isAdmin && !form.org) {
      setError('Please select a school or tutor organisation from the list.')
      return
    }

    setLoading(true)
    try {
      if (isAdmin) {
        // Admin key is checked on the server — never in the browser
        const res = await fetch(`${API_URL}/api/admin/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password: form.password, adminKey: form.adminKey }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Admin registration failed.')

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (signInErr) throw signInErr

        localStorage.setItem('montemy_role', 'admin')
        navigate('/admin/dashboard')
        return
      }

      // "Verify later": Render creates the account with the email pre-approved,
      // so the user can log in now and verify from their profile later.
      if (verifyChoice === 'later') {
        const res = await fetch(`${API_URL}/api/auth/register-later`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password: form.password, role: type, orgId: form.org }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Registration failed.')

        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (signInErr) throw signInErr

        localStorage.setItem('montemy_role', type)
        navigate('/pending-verification')
        return
      }

      // Profile rows are created on the server by a database trigger,
      // using the details passed here. Works with email confirmation on.
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: { name, role: type, org_id: form.org },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (signUpErr) throw signUpErr

      // Supabase hides duplicate emails by returning a user with no identities
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Try logging in instead.')
      }

      localStorage.setItem('montemy_role', type)
      setConfirmEmail(email)
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    }
    setLoading(false)
  }

  if (confirmEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <Background />
        <div style={{ ...glassCard, padding: '3rem 2.5rem', maxWidth: '440px', width: '90%', textAlign: 'center' }} className="glass">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ color: C.turquoise, fontSize: '1.6rem', marginBottom: '1rem' }}>Check your email</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: '1.7', marginBottom: '0.75rem' }}>
            We sent a confirmation link to <strong style={{ color: C.turquoise }}>{confirmEmail}</strong>.
            Click it to confirm your email, then log in.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', marginBottom: '2rem', fontSize: '0.9rem' }}>
            After you log in, your dashboard unlocks once an admin verifies your account. Check your spam folder if you don't see the email.
          </p>
          <button onClick={() => navigate('/login')} style={{ ...glassBtn }} className="ripple-container">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  const passwordField = (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={labelStyle}>Password</label>
      <div style={{ position: 'relative' }}>
        <input className="reg-input" style={glassInput} type={showPassword ? 'text' : 'password'}
          value={form.password} onChange={setField('password')}
          placeholder="Create a password (min 6 characters)" required minLength={6} />
        <button type="button" onClick={() => setShowPassword(s => !s)}
          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: C.turquoise }}>
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      <Background />

      <style>{`
        .reg-input:focus { border-color: rgba(var(--color-primary-rgb),0.8) !important; box-shadow: 0 0 12px rgba(var(--color-primary-rgb),0.25); }
        .org-item:hover { background: rgba(var(--color-primary-rgb),0.15) !important; }
      `}</style>

      <nav style={{ background: 'rgba(var(--color-bg-rgb),0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(var(--color-primary-rgb),0.25)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/create-account')} style={{ background: 'none', border: 'none', color: C.turquoise, fontSize: '1.4rem', cursor: 'pointer' }}>←</button>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ ...glassCard, padding: '2.5rem' }} className="glass">

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{isAdmin ? '🔐' : icons[type] || '👤'}</div>
            <h2 style={{ color: C.turquoise, fontSize: '1.6rem' }}>
              {isAdmin ? 'Create Admin Account' : `Create ${labels[type] || type} Account`}
            </h2>
          </div>

          {!validRole && (
            <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.5rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
              Unknown account type. Please go back and choose one.
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.5rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Full Name</label>
              <input className="reg-input" style={glassInput} value={form.name}
                onChange={setField('name')} placeholder="Enter your full name" required />
            </div>

            {!isAdmin && (
              <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                <label style={labelStyle}>School / Tutor Organisation</label>
                <input className="reg-input" style={glassInput} value={orgSearch}
                  onChange={e => handleOrgSearch(e.target.value)}
                  placeholder="Search for your school or tutor org..." autoComplete="off" />
                {showOrgDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(var(--color-bg-dark-rgb),0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(var(--color-primary-rgb),0.3)', borderRadius: '10px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredOrgs.length === 0 ? (
                      <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center' }}>No results found</div>
                    ) : filteredOrgs.map(org => (
                      <div key={org.id} className="org-item" onClick={() => selectOrg(org)}
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                        <span style={{ color: 'white', fontSize: '0.95rem' }}>{org.name}</span>
                        <span style={{ color: C.turquoise, fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>{org.type === 'school' ? '🏫' : '📖'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Email</label>
              <input className="reg-input" style={glassInput} type="email" value={form.email}
                onChange={setField('email')} placeholder="Enter your email" required />
            </div>

            {passwordField}

            {isAdmin && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Admin Key</label>
                <input className="reg-input" style={glassInput} type="password" value={form.adminKey}
                  onChange={setField('adminKey')} placeholder="Enter admin key" required />
              </div>
            )}

            {!isAdmin && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Email verification</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[
                    ['now', 'Verify now', 'We email you a link'],
                    ['later', 'Verify later', 'Skip for now, verify in your profile'],
                  ].map(([val, title, sub]) => (
                    <div key={val} onClick={() => setVerifyChoice(val)}
                      style={{
                        flex: 1, cursor: 'pointer', padding: '0.75rem', borderRadius: '10px',
                        border: verifyChoice === val ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.15)',
                        background: verifyChoice === val ? 'rgba(var(--color-primary-rgb),0.15)' : 'rgba(255,255,255,0.05)',
                      }}>
                      <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading || !validRole}
              onClick={(e) => !loading && addRipple(e)}
              style={{ ...glassBtn, opacity: loading || !validRole ? 0.7 : 1 }}
              className="ripple-container">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} style={{ color: C.turquoise, cursor: 'pointer', textDecoration: 'underline' }}>Login here</span>
          </p>
        </div>
      </div>
    </div>
  )
}
