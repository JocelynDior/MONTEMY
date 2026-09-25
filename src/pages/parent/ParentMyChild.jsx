import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../../supabase/client'

const s = { navy: '#001F3F', turquoise: '#40E0D0', lightNavy: '#0A2A4A' }

export default function ParentMyChild() {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [childProgress, setChildProgress] = useState([])
  const [childAssignments, setChildAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return navigate('/')
      try {
        const snap = await getDoc(doc(db, 'parents', user.uid))
        if (snap.exists()) {
          const d = snap.data()
          const linkedChildren = d.children || []
          if (linkedChildren.length > 0) {
            const childDocs = await Promise.all(linkedChildren.map(c => getDoc(doc(db, 'students', c.id))))
            const childData = childDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }))
            setChildren(childData)
            if (childData.length > 0) selectChild(childData[0])
          }
        }
      } catch (err) { console.error(err) }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const selectChild = async (child) => {
    setSelectedChild(child)
    try {
      const [progressSnap, assignSnap] = await Promise.all([
        getDocs(query(collection(db, 'progress'), where('studentId', '==', child.id))),
        getDocs(query(collection(db, 'assignments'), where('className', 'in', child.subjects?.length > 0 ? child.subjects : ['__none__'])))
      ])
      setChildProgress(progressSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setChildAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: s.navy, fontSize: '1.5rem', fontWeight: 'bold' }}>MONTEMY</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/parent/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
          <button onClick={async () => { await signOut(auth); navigate('/') }} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
        </div>
      </nav>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: s.turquoise, fontSize: '1.8rem', marginBottom: '1.5rem' }}>My Child</h2>
        {loading ? <div style={{ textAlign: 'center', color: s.turquoise, padding: '3rem' }}>Loading...</div>
          : children.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#ccc' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
              <p>No children linked to your account yet. Please contact admin to link your child.</p>
            </div>
          ) : (
            <>
              {children.length > 1 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {children.map(child => (
                    <button key={child.id} onClick={() => selectChild(child)}
                      style={{ background: selectedChild?.id === child.id ? s.turquoise : 'rgba(255,255,255,0.1)', color: selectedChild?.id === child.id ? s.navy : 'white', padding: '0.7rem 1.5rem', border: `1px solid ${s.turquoise}`, borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
                      {`${child.firstName || ''} ${child.lastName || ''}`.trim()}
                    </button>
                  ))}
                </div>
              )}
              {selectedChild && (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '10px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '1.5rem' }}>
                    <h3 style={{ color: s.turquoise, fontSize: '1.3rem', marginBottom: '1rem' }}>{`${selectedChild.firstName || ''} ${selectedChild.lastName || ''}`.trim()}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', color: '#ccc', fontSize: '0.9rem' }}>
                      <div><strong style={{ color: 'white' }}>Grade:</strong> {selectedChild.grade || 'N/A'}</div>
                      <div><strong style={{ color: 'white' }}>Class:</strong> {selectedChild.class || 'N/A'}</div>
                      <div><strong style={{ color: 'white' }}>School:</strong> {selectedChild.schoolName || 'N/A'}</div>
                      <div><strong style={{ color: 'white' }}>Subjects:</strong> {selectedChild.subjects?.join(', ') || 'N/A'}</div>
                    </div>
                  </div>

                  <h3 style={{ color: s.turquoise, marginBottom: '1rem' }}>Progress</h3>
                  {childProgress.length === 0 ? <p style={{ color: '#ccc', marginBottom: '1.5rem' }}>No progress records yet.</p>
                    : childProgress.map(p => (
                      <div key={p.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: s.turquoise, fontWeight: 'bold' }}>{p.subject}</div>
                          {p.comment && <div style={{ color: '#aaa', fontSize: '0.9rem' }}>{p.comment}</div>}
                        </div>
                        <div style={{ background: parseInt(p.mark) >= 50 ? '#2ecc71' : '#e74c3c', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '15px', fontWeight: 'bold' }}>{p.mark}%</div>
                      </div>
                    ))}

                  <h3 style={{ color: s.turquoise, marginBottom: '1rem' }}>Assignments</h3>
                  {childAssignments.length === 0 ? <p style={{ color: '#ccc' }}>No assignments yet.</p>
                    : childAssignments.map(a => (
                      <div key={a.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${s.turquoise}`, marginBottom: '0.8rem' }}>
                        <div style={{ color: s.turquoise, fontWeight: 'bold' }}>{a.title}</div>
                        <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{a.subject} | Due: {a.dueDate || 'N/A'}</div>
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
