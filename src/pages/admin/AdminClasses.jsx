import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0' }

export default function AdminClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState({ name: '', grade: '', school: '', teacher: '' })
  const [teachers, setTeachers] = useState([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [classSnap, schoolSnap, teacherSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'schools')),
        getDocs(collection(db, 'teachers'))
      ])
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSchools(schoolSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTeachers(teacherSnap.docs.map(d => {
        const data = d.data()
        return { id: d.id, name: `${data.title || ''} ${data.lastName || data.LastName || ''}`.trim(), schoolName: data.schoolName || '' }
      }))
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const createClass = async () => {
    if (!form.name || !form.school) return alert('Class name and school are required')
    try {
      await addDoc(collection(db, 'classes'), { ...form, createdAt: serverTimestamp() })
      setShowModal(false)
      setForm({ name: '', grade: '', school: '', teacher: '' })
      loadData()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const deleteClass = async () => {
    try {
      await deleteDoc(doc(db, 'classes', deleteModal.id))
      setDeleteModal(null)
      loadData()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const filtered = classes.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.school?.toLowerCase().includes(search.toLowerCase()) ||
    c.grade?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>

      {/* Navbar */}
      <nav style={{ background: s.turquoise, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: s.navy, fontSize: '1.2rem', fontWeight: 'bold' }}>MONTEMY ADMIN</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/admin/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
          <button onClick={() => navigate('/admin/users')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Users</button>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: s.turquoise, fontSize: '1.5rem' }}>Manage Classes</h2>
          <button onClick={() => setShowModal(true)}
            style={{ background: s.turquoise, color: s.navy, padding: '0.8rem 1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: `0 0 15px ${s.turquoise}` }}>
            + Create Class
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[['Total Classes', classes.length], ['Total Schools', schools.length]].map(([label, val]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${s.turquoise}`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', color: s.turquoise, fontWeight: 'bold' }}>{val}</div>
              <div style={{ fontSize: '0.8rem', color: '#ccc' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classes..."
          style={{ width: '100%', padding: '0.8rem', border: `2px solid ${s.turquoise}`, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }} />

        {/* Classes List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: s.turquoise }}>Loading classes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#888', fontStyle: 'italic' }}>No classes found.</div>
        ) : filtered.map(cls => (
          <div key={cls.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: s.turquoise, fontSize: '1.1rem', fontWeight: 'bold' }}>{cls.name}</div>
              <div style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                {cls.school && <span>School: {cls.school} &nbsp;|&nbsp; </span>}
                {cls.grade && <span>Grade: {cls.grade} &nbsp;|&nbsp; </span>}
                {cls.teacher && <span>Teacher: {cls.teacher}</span>}
              </div>
            </div>
            <button onClick={() => setDeleteModal(cls)}
              style={{ background: '#e74c3c', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Create Class Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: s.navy, padding: '2rem', borderRadius: '15px', border: `2px solid ${s.turquoise}`, maxWidth: '450px', width: '100%' }}>
            <h3 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>Create New Class</h3>
            {[['Class Name', 'name', 'e.g. Mathematics A'], ['Grade', 'grade', 'e.g. Grade 10']].map(([label, key, placeholder]) => (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>{label}</label>
                <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                  style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            ))}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>School</label>
              <select value={form.school} onChange={e => setForm({ ...form, school: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: s.navy, color: 'white' }}>
                <option value="">Select School</option>
                {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: s.turquoise, marginBottom: '0.5rem', fontWeight: 'bold' }}>Assign Teacher (optional)</label>
              <select value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}
                style={{ width: '100%', padding: '0.8rem', border: `1px solid ${s.turquoise}`, borderRadius: '5px', background: s.navy, color: 'white' }}>
                <option value="">Select Teacher</option>
                {teachers.filter(t => !form.school || t.schoolName === form.school).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={createClass} style={{ background: s.turquoise, color: s.navy, padding: '0.8rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}>Create</button>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.8rem 1.5rem', border: 'none', borderRadius: '5px', cursor: 'pointer', flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: s.navy, border: `2px solid ${s.turquoise}`, borderRadius: '12px', padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ color: s.turquoise, marginBottom: '1rem' }}>Delete Class</h3>
            <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>Are you sure you want to delete <strong style={{ color: 'white' }}>{deleteModal.name}</strong>? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setDeleteModal(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={deleteClass}
                style={{ flex: 1, padding: '0.8rem', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
