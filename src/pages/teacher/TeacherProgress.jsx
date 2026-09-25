import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0', lightNavy: '#0A2A4A' }

export default function TeacherProgress() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [progressForm, setProgressForm] = useState({ subject: '', mark: '', comment: '', behavior: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'teachers', user.uid))
        if (snap.exists()) { setTeacher({ id: user.uid, ...snap.data() }); loadStudents(snap.data()) }
      } catch (err) { console.error(err) }
    })
    return () => unsub()
  }, [])

  const loadStudents = async (teacherData) => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', teacherData.schoolId || teacherData.schoolName || '')))
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch { setLoading(false) }
    setLoading(false)
  }

  const saveProgress = async (e) => {
    e.preventDefault()
    if (!selected || !teacher) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'progress'), {
        studentId: selected.id, studentName: `${selected.firstName || ''} ${selected.lastName || ''}`.trim(),
        teacherId: teacher.id, schoolId: teacher.schoolId || '',
        ...progressForm, createdAt: serverTimestamp()
      })
      alert('✅ Progress saved!')
      setProgressForm({ subject: '', mark: '', comment: '', behavior: '' })
      setSelected(null)
    } catch (err) { alert('Error: ' + err.message) }
    setSaving(false)
  }

  const filtered = students.filter(s =>
    `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/teacher/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
          <button onClick={async () => { await signOut(auth); navigate('/') }} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </nav>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: s.turquoise, fontSize: '1.8rem', marginBottom: '1.5rem' }}>Student Progress</h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
          style={{ width: '100%', padding: '0.8rem', border: `2px solid ${s.turquoise}`, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }} />
        {loading ? <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading students...</div>
          : filtered.length === 0 ? <div style={{ textAlign: 'center', color: '#ccc', padding: '3rem' }}>No students found.</div>
          : filtered.map(student => (
            <div key={student.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: s.turquoise, fontWeight: 'bold', fontSize: '1.1rem' }}>{`${student.firstName || ''} ${student.lastName || ''}`.trim()}</div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>Grade: {student.grade || 'N/A'} | Class: {student.class || 'N/A'}</div>
                </div>
                <button onClick={() => setSelected(selected?.id === student.id ? null : student)}
                  style={{ background: s.turquoise, color: s.navy, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {selected?.id === student.id ? 'Cancel' : 'Update Progress'}
                </button>
              </div>
              {selected?.id === student.id && (
                <form onSubmit={saveProgress} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${s.turquoise}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    {[['Subject', 'subject', 'text'], ['Mark (%)', 'mark', 'number']].map(([label, key, type]) => (
                      <div key={key}>
                        <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>{label}</label>
                        <input type={type} value={progressForm[key]} onChange={e => setProgressForm({ ...progressForm, [key]: e.target.value })} required
                          style={{ width: '100%', padding: '0.6rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Behavior</label>
                    <select value={progressForm.behavior} onChange={e => setProgressForm({ ...progressForm, behavior: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: s.navy, color: 'white' }}>
                      <option value="">Select Behavior</option>
                      {['Excellent', 'Good', 'Average', 'Needs Improvement', 'Poor'].map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.3rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Comment</label>
                    <textarea value={progressForm.comment} onChange={e => setProgressForm({ ...progressForm, comment: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white', minHeight: '60px', resize: 'vertical' }} />
                  </div>
                  <button type="submit" disabled={saving} style={{ background: s.turquoise, color: s.navy, padding: '0.8rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {saving ? 'Saving...' : 'Save Progress'}
                  </button>
                </form>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
