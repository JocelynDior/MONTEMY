import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeacherPage from '../../components/teacher/TeacherPage'
import { useApiData } from '../../hooks/useApiData'
import { glassCard, glassBtn, C } from '../../styles/glass'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }

export default function TeacherClasses() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/teacher/classes')
  const [open, setOpen] = useState(null)

  return (
    <TeacherPage title="My Classes" icon="🏫">
      {loading && <p style={muted}>Loading...</p>}

      {error && (
        <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      )}

      {data && data.classes.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You haven't been assigned any classes yet. Once your school admin assigns you a class it will show up here.
        </div>
      )}

      {data && data.classes.map(c => {
        const isOpen = open === c.id
        return (
          <div key={c.id} style={panel}>
            <div onClick={() => setOpen(isOpen ? null : c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.name}</div>
                <div style={muted}>{[c.subject, c.grade ? `Grade ${c.grade}` : null].filter(Boolean).join(' · ') || 'No subject set'}</div>
              </div>
              <div style={{ ...muted, textAlign: 'right' }}>
                {c.students.length} student{c.students.length === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {c.students.length === 0 ? (
                  <p style={muted}>No students have joined this class yet. Students choose their class from their dashboard.</p>
                ) : c.students.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span>{s.name}</span>
                    <span style={{ ...muted, fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{s.email}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/teacher/assignments')} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}>Assignments</button>
                  <button onClick={() => navigate('/teacher/progress')} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>Progress</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </TeacherPage>
  )
}
