import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, db } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, glassInput, addRipple, C } from '../../styles/glass'

const ADMIN_KEY = 'montemy'
const ADMIN_EMAIL = 'Montemyadmin@gmail.com'

const labels = {
  student: 'Student',
  tutor: 'Tutor',
  parent: 'Parent',
  teacher: 'Teacher',
  principal: 'Principal',
  schoolmember: 'School Member',
}

const icons = {
  student: '🎓', tutor: '📖', parent: '👨‍👩‍👧',
  teacher: '🏫', principal: '👔', schoolmember: '🏢',
}

export default function Register() {
  const { type } = useParams()
  const navigate = useNavigate()
  const isAdmin = type === 'admin'

  const [form, setForm] = useState({ name: '', org: '', email: '', password: '', username: '', adminKey: '' })
  const [orgSearch, setOrgSearch] = useState('')
  const [orgs, setOrgs] = useState([])
  const [filteredOrgs, setFilteredOrgs] = useState([])
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadOrgs()
  }, [])

  const loadOrgs = async () => {
    try {
      const [schoolsSnap, tutorOrgsSnap] = await Promise.all([
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'tutorOrganizations')),
      ])
      const all = [
        ...schoolsSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, type: 'school' })),
        ...tutorOrgsSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, type: 'tutorOrg' })),
      ]
      setOrgs(all)
    } catch (e) { console.error(e) }
  }

  const handleOrgSearch = (val) => {
    setOrgSearch(val)
    setForm(f => ({ ...f, org: '' }))
    if (!val) { setFilteredOrgs([]); setShowOrgDropdown(false); return }
    const filtered = orgs.filter(o => o.name.toLowerCase().includes(val.toLowerCase()))
    setFilteredOrgs(filtered)
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
    setLoading(true)

    try {
      if (isAdmin) {
        if (form.adminKey !== ADMIN_KEY) { setError('Invalid admin key.'); setLoading(false); return }
        await setPersistence(auth, browserLocalPersistence)
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_KEY)
        localStorage.setItem('montemy_role', 'admin')
        navigate('/admin/dashboard')
        return
      }

      if (!form.org) { setError('Please select a school or tutor organisation.'); setLoading(false); return }

      await setPersistence(auth, browserLocalPersistence)
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const uid = cred.user.uid

      const collMap = {
        student: 'students', tutor: 'tutors', parent: 'parents',
        teacher: 'teachers', principal: 'principals', schoolmember: 'schoolMembers',
      }
      const col = collMap[type] || type + 's'

      await setDoc(doc(db, col, uid), {
        uid, name: form.name, email: form.email,
        orgId: form.org, orgName: orgSearch,
        role: type, isVerified: false,
        createdAt: serverTimestamp(),
      })

      localStorage.setItem('montemy_role', type)
      setSuccess(true)
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {BACKGROUND_VIDEO ? (
          <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
            <source src={BACKGROUND_VIDEO} type="video/mp4" />
          </video>
        ) : (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)', zIndex: -1 }} />
        )}
        <div style={{ ...glassCard, padding: '3rem 2.5rem', maxWidth: '420px', width: '90%', textAlign: 'center' }} className="glass">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: C.turquoise, fontSize: '1.6rem', marginBottom: '1rem' }}>Account Created!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.7', marginBottom: '2rem' }}>
            Your account has been created successfully. Please login to continue — your dashboard will be available once an admin verifies your account.
          </p>
          <button onClick={() => navigate('/login')} style={{ ...glassBtn }} className="ripple-container">
            Go to Login
          </button>
        </div>
      </div>
    )
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

      <style>{`
        .reg-input:focus { border-color: rgba(64,224,208,0.8) !important; box-shadow: 0 0 12px rgba(64,224,208,0.25); }
        .org-item:hover { background: rgba(64,224,208,0.15) !important; }
      `}</style>

      <nav style={{ background: 'rgba(0,31,63,0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(64,224,208,0.25)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/create-account')} style={{ background: 'none', border: 'none', color: C.turquoise, fontSize: '1.4rem', cursor: 'pointer' }}>←</button>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY</span>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ ...glassCard, padding: '2.5rem' }} className="glass">

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{isAdmin ? '🔐' : icons[type]}</div>
            <h2 style={{ color: C.turquoise, fontSize: '1.6rem' }}>
              {isAdmin ? 'Admin Access' : `Create ${labels[type] || type} Account`}
            </h2>
          </div>

          {error && (
            <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.5rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {isAdmin ? (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Username</label>
                  <input className="reg-input" style={glassInput} value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Enter username" required />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Admin Key</label>
                  <input className="reg-input" style={glassInput} type="password" value={form.adminKey}
                    onChange={e => setForm(f => ({ ...f, adminKey: e.target.value }))}
                    placeholder="Enter admin key" required />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Full Name</label>
                  <input className="reg-input" style={glassInput} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Enter your full name" required />
                </div>

                <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>School / Tutor Organisation</label>
                  <input className="reg-input" style={glassInput} value={orgSearch}
                    onChange={e => handleOrgSearch(e.target.value)}
                    placeholder="Search for your school or tutor org..."
                    autoComplete="off" />
                  {showOrgDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(0,25,55,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(64,224,208,0.3)', borderRadius: '10px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                      {filteredOrgs.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center' }}>No results found</div>
                      ) : filteredOrgs.map(org => (
                        <div key={org.id} className="org-item"
                          onClick={() => selectOrg(org)}
                          style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                          <span style={{ color: 'white', fontSize: '0.95rem' }}>{org.name}</span>
                          <span style={{ color: C.turquoise, fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>{org.type === 'school' ? '🏫' : '📖'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Email</label>
                  <input className="reg-input" style={glassInput} type="email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="Enter your email" required />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="reg-input" style={glassInput} type={showPassword ? 'text' : 'password'} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Create a password" required minLength={6} />
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
              {loading ? 'Creating...' : isAdmin ? 'Access Admin' : 'Create Account'}
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
