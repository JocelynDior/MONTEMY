import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassNav, glassBtn, glassInput, addRipple, C } from '../../styles/glass'

const ALL_COLLECTIONS = ['students','teachers','parents','principals','tutors','schoolMembers']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [allUsers, setAllUsers] = useState([])
  const [allSchools, setAllSchools] = useState([])
  const [allTutorOrgs, setAllTutorOrgs] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [schoolSearch, setSchoolSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate('/')
      else loadData()
    })
    return () => unsub()
  }, [])

  const getAllUsers = async (col) => {
    const snap = await getDocs(collection(db, col))
    return snap.docs.map(d => ({ id: d.id, col, role: col, ...d.data() }))
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const results = await Promise.all(ALL_COLLECTIONS.map(c => getAllUsers(c)))
      setAllUsers(results.flat())

      const schoolsSnap = await getDocs(collection(db, 'schools'))
      setAllSchools(schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const tutorOrgsSnap = await getDocs(collection(db, 'tutorOrganizations'))
      setAllTutorOrgs(tutorOrgsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('montemy_role')
    navigate('/')
  }

  const toggleVerify = async (user) => {
    try {
      await updateDoc(doc(db, user.col, user.id), { isVerified: !user.isVerified })
      setAllUsers(prev => prev.map(u => u.id === user.id && u.col === user.col ? { ...u, isVerified: !u.isVerified } : u))
    } catch (e) { alert('Error: ' + e.message) }
  }

  const deleteUser = async () => {
    try {
      await deleteDoc(doc(db, deleteModal.col, deleteModal.id))
      setAllUsers(prev => prev.filter(u => !(u.id === deleteModal.id && u.col === deleteModal.col)))
      setDeleteModal(null)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const createSchool = async () => {
    if (!newSchoolName.trim()) return
    setCreating(true)
    try {
      const id = newSchoolName.trim().toLowerCase().replace(/\s+/g, '-')
      await setDoc(doc(db, 'schools', id), { name: newSchoolName.trim(), isActive: true, createdAt: serverTimestamp() })
      setNewSchoolName('')
      loadData()
    } catch (e) { alert('Error: ' + e.message) }
    setCreating(false)
  }

  const createTutorOrg = async () => {
    if (!newOrgName.trim()) return
    setCreating(true)
    try {
      const id = newOrgName.trim().toLowerCase().replace(/\s+/g, '-')
      await setDoc(doc(db, 'tutorOrganizations', id), { name: newOrgName.trim(), isActive: true, createdAt: serverTimestamp() })
      setNewOrgName('')
      loadData()
    } catch (e) { alert('Error: ' + e.message) }
    setCreating(false)
  }

  const pendingUsers = allUsers.filter(u => !u.isVerified)
  const filteredUsers = allUsers.filter(u => {
    const t = userSearch.toLowerCase()
    return !t || (u.name || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t) || (u.role || '').toLowerCase().includes(t)
  })
  const filteredSchools = allSchools.filter(s => s.name?.toLowerCase().includes(schoolSearch.toLowerCase()))

  const stats = [
    ['🎓 Students', allUsers.filter(u => u.col === 'students').length],
    ['📖 Tutors', allUsers.filter(u => u.col === 'tutors').length],
    ['🏫 Teachers', allUsers.filter(u => u.col === 'teachers').length],
    ['👨‍👩‍👧 Parents', allUsers.filter(u => u.col === 'parents').length],
    ['👔 Principals', allUsers.filter(u => u.col === 'principals').length],
    ['🏢 Schools', allSchools.length],
    ['📋 Tutor Orgs', allTutorOrgs.length],
    ['⏳ Pending', pendingUsers.length],
  ]

  const tabs = ['overview', 'users', 'pending', 'schools', 'tutor-orgs']

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
        .admin-tab { transition: all 0.2s; cursor: pointer; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.9rem; border: none; white-space: nowrap; }
        .user-row { transition: background 0.15s; }
        .user-row:hover { background: rgba(64,224,208,0.07) !important; }
        .act-input:focus { border-color: rgba(64,224,208,0.7) !important; }
      `}</style>

      {/* Nav */}
      <nav style={glassNav}>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY ADMIN</span>
        <button onClick={handleLogout} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>Logout</button>
      </nav>

      {/* Tab bar */}
      <div style={{ background: 'rgba(0,25,55,0.4)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(64,224,208,0.15)', padding: '0 1.5rem', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t} className="admin-tab"
            onClick={() => setTab(t)}
            style={{ background: tab === t ? 'rgba(64,224,208,0.85)' : 'transparent', color: tab === t ? C.navy : 'rgba(255,255,255,0.6)', fontWeight: tab === t ? '700' : '400', textTransform: 'capitalize' }}>
            {t.replace('-', ' ')} {t === 'pending' && pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.5rem' }}>Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {stats.map(([label, val]) => (
                <div key={label} style={{ ...glassCard, padding: '1.25rem', textAlign: 'center' }} className="glass">
                  <div style={{ fontSize: '1.8rem', color: C.turquoise, fontWeight: '700' }}>{val}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
            {pendingUsers.length > 0 && (
              <div style={{ background: 'rgba(255,165,0,0.1)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: '#ffa500', fontWeight: '600' }}>⏳ {pendingUsers.length} account{pendingUsers.length > 1 ? 's' : ''} awaiting verification</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Review and verify new accounts</div>
                </div>
                <button onClick={() => setTab('pending')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>Review Now</button>
              </div>
            )}
          </>
        )}

        {/* ALL USERS */}
        {tab === 'users' && (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <h2 style={{ color: C.turquoise, flex: 1 }}>All Users</h2>
              <input className="act-input" style={{ ...glassInput, maxWidth: '300px' }} value={userSearch}
                onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." />
            </div>
            {loading ? <div style={{ textAlign: 'center', color: C.turquoise, padding: '3rem' }}>Loading...</div> : (
              <div style={{ ...glassCard, overflow: 'hidden' }} className="glass">
                {filteredUsers.map((user, i) => (
                  <div key={user.id + user.col} className="user-row"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ color: 'white', fontWeight: '600', fontSize: '0.95rem' }}>{user.name || 'No Name'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>{user.email}</div>
                    </div>
                    <span style={{ background: 'rgba(64,224,208,0.15)', color: C.turquoise, padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user.role}</span>
                    <span style={{ background: user.isVerified ? 'rgba(50,205,50,0.15)' : 'rgba(255,165,0,0.15)', color: user.isVerified ? '#50c850' : '#ffa500', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem' }}>
                      {user.isVerified ? '✓ Verified' : '⏳ Pending'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => toggleVerify(user)}
                        style={{ background: user.isVerified ? 'rgba(255,165,0,0.2)' : 'rgba(50,205,50,0.2)', color: user.isVerified ? '#ffa500' : '#50c850', border: 'none', borderRadius: '7px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Roboto Slab, serif' }}>
                        {user.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button onClick={() => setDeleteModal(user)}
                        style={{ background: 'rgba(255,80,80,0.2)', color: '#ff8080', border: 'none', borderRadius: '7px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Roboto Slab, serif' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No users found</div>}
              </div>
            )}
          </>
        )}

        {/* PENDING */}
        {tab === 'pending' && (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.5rem' }}>Pending Verification ({pendingUsers.length})</h2>
            {pendingUsers.length === 0 ? (
              <div style={{ ...glassCard, padding: '3rem', textAlign: 'center' }} className="glass">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <div style={{ color: 'rgba(255,255,255,0.6)' }}>All accounts are verified!</div>
              </div>
            ) : pendingUsers.map(user => (
              <div key={user.id + user.col} style={{ ...glassCard, padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }} className="glass">
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>{user.name || 'No Name'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>{user.email}</div>
                  <div style={{ color: C.turquoise, fontSize: '0.8rem', textTransform: 'capitalize', marginTop: '0.25rem' }}>{user.role} • {user.orgName || 'No org'}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => toggleVerify(user)}
                    style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                    ✓ Verify
                  </button>
                  <button onClick={() => setDeleteModal(user)}
                    style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem', background: 'rgba(255,80,80,0.3)', color: '#ffaaaa', boxShadow: 'none' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* SCHOOLS */}
        {tab === 'schools' && (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.5rem' }}>Schools ({allSchools.length})</h2>
            <div style={{ ...glassCard, padding: '1.5rem', marginBottom: '1.5rem' }} className="glass">
              <h3 style={{ color: C.turquoise, marginBottom: '1rem', fontSize: '1rem' }}>Create New School</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="act-input" style={{ ...glassInput, flex: 1, minWidth: '200px' }} value={newSchoolName}
                  onChange={e => setNewSchoolName(e.target.value)}
                  placeholder="School name..." />
                <button onClick={createSchool} disabled={creating}
                  style={{ ...glassBtn, width: 'auto', padding: '0.85rem 1.5rem' }}>
                  {creating ? 'Creating...' : 'Create School'}
                </button>
              </div>
            </div>
            <input className="act-input" style={{ ...glassInput, marginBottom: '1rem' }} value={schoolSearch}
              onChange={e => setSchoolSearch(e.target.value)} placeholder="Search schools..." />
            {filteredSchools.map(school => (
              <div key={school.id} style={{ ...glassCard, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="glass">
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>🏫 {school.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>ID: {school.id}</div>
                </div>
                <span style={{ background: 'rgba(50,205,50,0.15)', color: '#50c850', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem' }}>Active</span>
              </div>
            ))}
            {filteredSchools.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No schools found</div>}
          </>
        )}

        {/* TUTOR ORGS */}
        {tab === 'tutor-orgs' && (
          <>
            <h2 style={{ color: C.turquoise, marginBottom: '1.5rem' }}>Tutor Organisations ({allTutorOrgs.length})</h2>
            <div style={{ ...glassCard, padding: '1.5rem', marginBottom: '1.5rem' }} className="glass">
              <h3 style={{ color: C.turquoise, marginBottom: '1rem', fontSize: '1rem' }}>Create New Tutor Organisation</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="act-input" style={{ ...glassInput, flex: 1, minWidth: '200px' }} value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)} placeholder="Organisation name..." />
                <button onClick={createTutorOrg} disabled={creating}
                  style={{ ...glassBtn, width: 'auto', padding: '0.85rem 1.5rem' }}>
                  {creating ? 'Creating...' : 'Create Org'}
                </button>
              </div>
            </div>
            {allTutorOrgs.map(org => (
              <div key={org.id} style={{ ...glassCard, padding: '1.25rem 1.5rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="glass">
                <div>
                  <div style={{ color: 'white', fontWeight: '600' }}>📖 {org.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>ID: {org.id}</div>
                </div>
                <span style={{ background: 'rgba(50,205,50,0.15)', color: '#50c850', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.75rem' }}>Active</span>
              </div>
            ))}
            {allTutorOrgs.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No tutor organisations yet</div>}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ ...glassCard, padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }} className="glass">
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ color: C.turquoise, marginBottom: '0.75rem' }}>Confirm Delete</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Are you sure you want to delete <strong style={{ color: 'white' }}>{deleteModal.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={deleteUser} style={{ ...glassBtn, width: 'auto', background: 'rgba(255,80,80,0.3)', color: '#ffaaaa', boxShadow: 'none', border: '1px solid rgba(255,80,80,0.4)' }}>Delete</button>
              <button onClick={() => setDeleteModal(null)} style={{ ...glassBtn, width: 'auto', background: 'rgba(255,255,255,0.08)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.2)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
