import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0' }

export default function PrincipalStats() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [stats, setStats] = useState({ students: 0, teachers: 0, parents: 0, classes: 0, assignments: 0, events: 0 })
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'principals', user.uid))
        const sid = snap.exists() ? snap.data().schoolId : null
        setSchoolId(sid)
        loadStats(sid)
      } catch { loadStats(null) }
    })
    return () => unsub()
  }, [])

  const loadStats = async (sid) => {
    setLoading(true)
    try {
      const getCount = async (col, field) => {
        const q = field && sid ? query(collection(db, col), where(field, '==', sid)) : collection(db, col)
        const snap = await getDocs(q)
        return snap.size
      }
      const [students, teachers, parents, classes, assignments, events] = await Promise.all([
        getCount('students', 'schoolId'), getCount('teachers', 'schoolId'),
        getCount('parents', 'schoolId'), getCount('classes', 'schoolId'),
        getCount('assignments', 'schoolId'), getCount('events', null)
      ])
      setStats({ students, teachers, parents, classes, assignments, events })
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const statCards = [
    { icon: '🎓', label: 'Students', value: stats.students },
    { icon: '📚', label: 'Teachers', value: stats.teachers },
    { icon: '👨‍👩‍👧', label: 'Parents', value: stats.parents },
    { icon: '🏫', label: 'Classes', value: stats.classes },
    { icon: '📝', label: 'Assignments', value: stats.assignments },
    { icon: '📅', label: 'Events', value: stats.events },
  ]

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: s.navy, color: s.turquoise, width: '40px', height: '40px', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '3px', padding: '8px' }}>
            {[0,1,2].map(i => <div key={i} style={{ width: '20px', height: '2px', background: s.turquoise }} />)}
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '50px', background: s.turquoise, minWidth: '160px', borderRadius: '10px', zIndex: 10, overflow: 'hidden' }}>
              {[['Back to Dashboard', () => navigate('/principal/dashboard')], ['Logout', async () => { await signOut(auth); navigate('/') }]].map(([label, fn]) => (
                <div key={label} onClick={() => { setMenuOpen(false); fn() }} style={{ color: s.navy, padding: '12px 16px', cursor: 'pointer', fontWeight: 'bold' }}>{label}</div>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ color: s.turquoise, fontSize: '2rem', textAlign: 'center', marginBottom: '2rem' }}>School Statistics</h1>
        {loading ? (
          <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading statistics...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {statCards.map(card => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '15px', borderLeft: `4px solid ${s.turquoise}`, textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{card.icon}</div>
                <div style={{ fontSize: '2.5rem', color: s.turquoise, fontWeight: 'bold', marginBottom: '0.5rem' }}>{card.value}</div>
                <div style={{ color: '#ccc', fontSize: '1rem' }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
