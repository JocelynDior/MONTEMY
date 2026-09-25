import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0' }

export default function PrincipalEvents() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [openEventMenu, setOpenEventMenu] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', time: '', venue: '', description: '' })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) return navigate('/')
      setCurrentUser(user)
      loadEvents()
    })
    return () => unsub()
  }, [])

  const loadEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'))
      const snap = await getDocs(q)
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  const saveEvent = async (e) => {
    e.preventDefault()
    try {
      const data = { ...form, createdBy: currentUser?.uid, createdAt: serverTimestamp() }
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), data)
      } else {
        await addDoc(collection(db, 'events'), data)
      }
      setShowForm(false); setEditingId(null)
      setForm({ title: '', date: '', time: '', venue: '', description: '' })
      loadEvents()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Cancel this event?')) return
    await deleteDoc(doc(db, 'events', id))
    loadEvents()
  }

  const editEvent = (event) => {
    setForm({ title: event.title, date: event.date, time: event.time || '', venue: event.venue, description: event.description })
    setEditingId(event.id); setShowForm(true); setOpenEventMenu(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = events.filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.venue?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  )

  const NavBar = () => (
    <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
      <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: s.navy, color: s.turquoise, width: '40px', height: '40px', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '3px', padding: '8px' }}>
          {[0,1,2].map(i => <div key={i} style={{ width: '20px', height: '2px', background: s.turquoise }} />)}
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '50px', background: s.turquoise, minWidth: '160px', borderRadius: '10px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', zIndex: 10, overflow: 'hidden' }}>
            {[['Back to Dashboard', () => navigate('/principal/dashboard')], ['Logout', async () => { await signOut(auth); navigate('/') }]].map(([label, fn]) => (
              <div key={label} onClick={() => { setMenuOpen(false); fn() }} style={{ color: s.navy, padding: '12px 16px', cursor: 'pointer', fontWeight: 'bold' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,31,63,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{label}</div>
            ))}
          </div>
        )}
      </div>
    </nav>
  )

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <NavBar />
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: s.turquoise, fontSize: '2rem' }}>School Events</h1>
        <p style={{ color: '#ccc', fontSize: '1.2rem' }}>Manage and view upcoming school events</p>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto 2rem', padding: '0 2rem' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search event..."
          style={{ width: '100%', padding: '1rem', borderRadius: '50px', border: `2px solid ${s.turquoise}`, background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', outline: 'none' }} />
      </div>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem 3rem' }}>
        {showForm && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '15px', padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid #4CAF50' }}>
            <h3 style={{ color: s.turquoise, fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>{editingId ? 'Edit Event' : 'Add New Event'}</h3>
            <form onSubmit={saveEvent}>
              {[['Event Title', 'title', 'text'], ['Event Date', 'date', 'date'], ['Event Time', 'time', 'time'], ['Venue', 'venue', 'text']].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: s.turquoise, fontWeight: 'bold', marginBottom: '0.5rem' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.9)', fontSize: '1rem', color: s.navy }} />
                </div>
              ))}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: s.turquoise, fontWeight: 'bold', marginBottom: '0.5rem' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ccc', background: 'rgba(255,255,255,0.9)', fontSize: '1rem', color: s.navy, minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }} style={{ background: '#FF5252', color: 'white', border: 'none', borderRadius: '5px', padding: '0.8rem 1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button type="submit" style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', padding: '0.8rem 1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>Save Event</button>
              </div>
            </form>
          </div>
        )}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#ccc' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
            <p style={{ fontSize: '1.2rem' }}>No events scheduled yet.</p>
          </div>
        ) : filtered.map(event => (
          <div key={event.id} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '15px', marginBottom: '2rem', padding: '2rem', borderLeft: `4px solid ${s.turquoise}`, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: s.turquoise }}>{event.title}</h2>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setOpenEventMenu(openEventMenu === event.id ? null : event.id)} style={{ background: 'none', border: 'none', color: s.turquoise, fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}>⋯</button>
                {openEventMenu === event.id && (
                  <div style={{ position: 'absolute', right: '1rem', top: '2rem', background: s.turquoise, borderRadius: '10px', minWidth: '150px', zIndex: 2, overflow: 'hidden' }}>
                    <div onClick={() => editEvent(event)} style={{ color: s.navy, padding: '12px 16px', cursor: 'pointer', fontWeight: 'bold' }}>Edit Event</div>
                    <div onClick={() => deleteEvent(event.id)} style={{ color: '#FF5252', padding: '12px 16px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel Event</div>
                  </div>
                )}
              </div>
            </div>
            {[['Date', new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })], ['Time', event.time || 'Not specified'], ['Venue', event.venue], ['Description', event.description]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', color: s.turquoise, minWidth: '100px' }}>{label}:</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', date: '', time: '', venue: '', description: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '50px', padding: '1rem 2rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>
            + Add Event
          </button>
        </div>
      </div>
    </div>
  )
}
