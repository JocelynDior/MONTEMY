import React, { useEffect, useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { apiFetch } from '../../api/apiClient'
import { glassCard, glassInput, C } from '../../styles/glass'

const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const isLink = (u) => typeof u === 'string' && /^https?:\/\//i.test(u)

export default function StudentResources() {
  const [resources, setResources] = useState(null)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')

  useEffect(() => {
    apiFetch('/api/student/resources')
      .then(r => setResources(r.resources || []))
      .catch(err => { setError(err.message || 'Could not load resources.'); setResources([]) })
  }, [])

  const subjects = [...new Set((resources || []).map(r => r.subject).filter(Boolean))].sort()
  const shown = (resources || []).filter(r => !subject || r.subject === subject)

  return (
    <StudentPage title="Learning Resources" icon="📖">
      {error && (
        <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ffb3b3' }}>
          {error}
        </div>
      )}

      {resources === null ? <p style={muted}>Loading...</p> : resources.length === 0 && !error ? (
        <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', ...muted }}>
          Your teachers haven't added any study materials yet. Check back soon.
        </div>
      ) : (
        <>
          {subjects.length > 1 && (
            <select value={subject} onChange={e => setSubject(e.target.value)}
              style={{ ...glassInput, width: 'auto', minWidth: '220px', marginBottom: '1.25rem' }}>
              <option value="" style={{ background: '#001F3F' }}>All subjects</option>
              {subjects.map(s => <option key={s} value={s} style={{ background: '#001F3F' }}>{s}</option>)}
            </select>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {shown.map(r => (
              <div key={r.id} style={{ ...glassCard, padding: '1.25rem', borderLeft: `4px solid ${C.turquoise}` }}>
                <div style={{ fontWeight: 600, marginBottom: '0.3rem', overflowWrap: 'anywhere' }}>{r.title}</div>
                <div style={{ ...muted, fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  {[r.subject, r.grade ? `Grade ${r.grade}` : null].filter(Boolean).join(' · ') || 'General'}
                </div>
                {isLink(r.file_url)
                  ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ color: C.turquoise, fontWeight: 600 }}>Open</a>
                  : <span style={{ ...muted, fontSize: '0.8rem' }}>File not available yet</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </StudentPage>
  )
}
