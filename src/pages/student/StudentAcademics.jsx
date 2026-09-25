import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0', lightNavy: '#0A2A4A' }
const TABS = ['Subjects', 'Schedule', 'Homework', 'Progress']

export default function StudentAcademics() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Subjects')
  const [student, setStudent] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [assignments, setAssignments] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'students', user.uid))
        if (snap.exists()) {
          const d = { id: user.uid, ...snap.data() }
          setStudent(d)
          loadAcademicData(d)
        }
      } catch (err) { console.error(err) }
    })
    return () => unsub()
  }, [])

  const loadAcademicData = async (studentData) => {
    setLoading(true)
    try {
      setSubjects(studentData.subjects || [])
      const [assignSnap, progressSnap] = await Promise.all([
        getDocs(query(collection(db, 'assignments'), where('className', 'in', studentData.subjects?.length > 0 ? studentData.subjects : ['__none__']))),
        getDocs(query(collection(db, 'progress'), where('studentId', '==', studentData.id)))
      ])
      setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setProgress(progressSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const schedule = [
    { day: 'Monday', periods: ['Mathematics', 'English', 'Science', 'Physical Education'] },
    { day: 'Tuesday', periods: ['History', 'Geography', 'Mathematics', 'Art'] },
    { day: 'Wednesday', periods: ['Science', 'English', 'Technology', 'Music'] },
    { day: 'Thursday', periods: ['Mathematics', 'History', 'English', 'Life Orientation'] },
    { day: 'Friday', periods: ['Geography', 'Science', 'Mathematics', 'English'] },
  ]

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/student/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
          <button onClick={async () => { await signOut(auth); navigate('/') }} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ background: '#001A35', display: 'flex', overflowX: 'auto', borderBottom: `2px solid ${s.turquoise}` }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '1rem 1.5rem', background: activeTab === tab ? s.turquoise : 'transparent', color: activeTab === tab ? s.navy : s.turquoise, border: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', borderBottom: activeTab === tab ? `3px solid ${s.navy}` : 'none' }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {loading ? <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading...</div> : (
          <>
            {activeTab === 'Subjects' && (
              <div>
                <h2 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>My Subjects</h2>
                {subjects.length === 0 ? <p style={{ color: '#ccc' }}>No subjects assigned yet.</p>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {subjects.map((sub, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
                        <div style={{ color: s.turquoise, fontWeight: 'bold' }}>{sub}</div>
                      </div>
                    ))}
                  </div>}
              </div>
            )}

            {activeTab === 'Schedule' && (
              <div>
                <h2 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>My Schedule</h2>
                {schedule.map(day => (
                  <div key={day.day} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem' }}>
                    <div style={{ color: s.turquoise, fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{day.day}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {day.periods.map((p, i) => (
                        <span key={i} style={{ background: 'rgba(64,224,208,0.2)', color: s.turquoise, padding: '0.3rem 0.8rem', borderRadius: '15px', fontSize: '0.9rem' }}>
                          P{i+1}: {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Homework' && (
              <div>
                <h2 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>Homework & Assignments</h2>
                {assignments.length === 0 ? <p style={{ color: '#ccc' }}>No assignments yet.</p>
                  : assignments.map(a => (
                    <div key={a.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem' }}>
                      <div style={{ color: s.turquoise, fontWeight: 'bold', fontSize: '1.1rem' }}>{a.title}</div>
                      <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                        {a.subject && <span>Subject: {a.subject} &nbsp;|&nbsp; </span>}
                        {a.dueDate && <span>Due: {a.dueDate}</span>}
                      </div>
                      {a.description && <p style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem' }}>{a.description}</p>}
                    </div>
                  ))}
              </div>
            )}

            {activeTab === 'Progress' && (
              <div>
                <h2 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>My Progress</h2>
                {progress.length === 0 ? <p style={{ color: '#ccc' }}>No progress records yet.</p>
                  : progress.map(p => (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ color: s.turquoise, fontWeight: 'bold' }}>{p.subject}</div>
                        <div style={{ background: parseInt(p.mark) >= 50 ? '#2ecc71' : '#e74c3c', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '15px', fontWeight: 'bold' }}>{p.mark}%</div>
                      </div>
                      {p.behavior && <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Behavior: {p.behavior}</div>}
                      {p.comment && <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '0.3rem' }}>{p.comment}</div>}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
