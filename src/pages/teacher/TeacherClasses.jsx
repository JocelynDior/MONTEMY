import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0', lightNavy: '#0A2A4A', darkNavy: '#001A35' }

export default function TeacherClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeClass, setActiveClass] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'teachers', user.uid))
        if (snap.exists()) {
          const d = snap.data()
          setTeacher(d)
          loadClasses(d)
        }
      } catch (err) { console.error(err) }
    })
    return () => unsub()
  }, [])

  const loadClasses = async (teacherData) => {
    setLoading(true)
    try {
      const name = `${teacherData.title || ''} ${teacherData.lastName || teacherData.LastName || ''}`.trim()
      const q = query(collection(db, 'classes'), where('teacher', '==', name))
      const snap = await getDocs(q)
      if (snap.empty) {
        const allSnap = await getDocs(collection(db, 'classes'))
        setClasses(allSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else {
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/teacher/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
          <button onClick={async () => { await signOut(auth); navigate('/') }} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </nav>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: s.turquoise, fontSize: '1.8rem', marginBottom: '1.5rem' }}>My Classes</h2>
        {loading ? (
          <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading classes...</div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#ccc' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏫</div>
            <p>No classes assigned yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {classes.map(cls => (
              <div key={cls.id} onClick={() => setActiveClass(activeClass?.id === cls.id ? null : cls)}
                style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '15px', borderLeft: `4px solid ${s.turquoise}`, cursor: 'pointer', transition: 'transform 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <h3 style={{ color: s.turquoise, fontSize: '1.3rem', marginBottom: '0.5rem' }}>{cls.name}</h3>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                  {cls.grade && <div>Grade: {cls.grade}</div>}
                  {cls.school && <div>School: {cls.school}</div>}
                  {cls.teacher && <div>Teacher: {cls.teacher}</div>}
                </div>
                {activeClass?.id === cls.id && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${s.turquoise}` }}>
                    <p style={{ color: '#ccc', fontSize: '0.9rem' }}>Class ID: {cls.id}</p>
                    <button onClick={(e) => { e.stopPropagation(); navigate('/teacher/assignments') }}
                      style={{ marginTop: '0.5rem', background: s.turquoise, color: s.navy, border: 'none', borderRadius: '5px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold' }}>
                      View Assignments
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
