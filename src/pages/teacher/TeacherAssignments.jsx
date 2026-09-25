import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0', lightNavy: '#0A2A4A' }

export default function TeacherAssignments() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [classes, setClasses] = useState([])
  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', className: '', subject: '', totalMarks: '' })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'teachers', user.uid))
        if (snap.exists()) { setTeacher({ id: user.uid, ...snap.data() }); loadData(snap.data()) }
      } catch (err) { console.error(err) }
    })
    return () => unsub()
  }, [])

  const loadData = async (teacherData) => {
    setLoading(true)
    try {
      const name = `${teacherData.title || ''} ${teacherData.lastName || teacherData.LastName || ''}`.trim()
      const [assignSnap, classSnap] = await Promise.all([
        getDocs(query(collection(db, 'assignments'), where('teacherName', '==', name))),
        getDocs(query(collection(db, 'classes'), where('teacher', '==', name)))
      ])
      setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const createAssignment = async (e) => {
    e.preventDefault()
    if (!teacher) return
    try {
      const name = `${teacher.title || ''} ${teacher.lastName || teacher.LastName || ''}`.trim()
      await addDoc(collection(db, 'assignments'), {
        ...form, teacherName: name, teacherId: teacher.id,
        schoolId: teacher.schoolId || teacher.schoolName || '',
        createdAt: serverTimestamp(), submissions: []
      })
      setShowForm(false)
      setForm({ title: '', description: '', dueDate: '', className: '', subject: '', totalMarks: '' })
      loadData(teacher)
    } catch (err) { alert('Error: ' + err.message) }
  }

  const deleteAssignment = async () => {
    await deleteDoc(doc(db, 'assignments', deleteModal.id))
    setDeleteModal(null); loadData(teacher)
  }

  const filtered = assignments.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.className?.toLowerCase().includes(search.toLowerCase()) ||
    a.subject?.toLowerCase().includes(search.toLowerCase())
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: s.turquoise, fontSize: '1.8rem' }}>Assignments</h2>
          <button onClick={() => setShowForm(true)} style={{ background: s.turquoise, color: s.navy, padding: '0.8rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Assignment</button>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..."
          style={{ width: '100%', padding: '0.8rem', border: `2px solid ${s.turquoise}`, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }} />
        {loading ? <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ textAlign: 'center', color: '#ccc', padding: '3rem' }}>No assignments yet.</div>
          : filtered.map(a => (
            <div key={a.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: s.turquoise, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{a.title}</div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    {a.className && <span>Class: {a.className} &nbsp;|&nbsp; </span>}
                    {a.subject && <span>Subject: {a.subject} &nbsp;|&nbsp; </span>}
                    {a.dueDate && <span>Due: {a.dueDate}</span>}
                  </div>
                  {a.description && <p style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.9rem' }}>{a.description}</p>}
                </div>
                <button onClick={() => setDeleteModal(a)} style={{ background: '#e74c3c', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>Delete</button>
              </div>
            </div>
          ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: s.navy, padding: '2rem', borderRadius: '15px', border: `2px solid ${s.turquoise}`, maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>Create Assignment</h3>
            <form onSubmit={createAssignment}>
              {[['Title', 'title', 'text'], ['Subject', 'subject', 'text'], ['Due Date', 'dueDate', 'date'], ['Total Marks', 'totalMarks', 'number']].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={key !== 'totalMarks'}
                    style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                </div>
              ))}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>Class</label>
                <select value={form.className} onChange={e => setForm({ ...form, className: e.target.value })} required
                  style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: s.navy, color: 'white' }}>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white', minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ background: s.turquoise, color: s.navy, padding: '0.8rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Create</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: '#666', color: 'white', padding: '0.8rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: s.navy, padding: '2rem', borderRadius: '15px', border: `2px solid ${s.turquoise}`, maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ color: s.turquoise, marginBottom: '1rem' }}>Delete Assignment</h3>
            <p style={{ color: '#ccc', marginBottom: '2rem' }}>Delete "{deleteModal.title}"?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={deleteAssignment} style={{ background: '#e74c3c', color: 'white', padding: '0.7rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
              <button onClick={() => setDeleteModal(null)} style={{ background: '#666', color: 'white', padding: '0.7rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
