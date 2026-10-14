import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import ResourceGrid from '../../components/resources/ResourceGrid'
import { useApiData } from '../../hooks/useApiData'
import { glassCard, glassInput, glassBtn, C } from '../../styles/glass'

const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const opt = { background: '#001F3F' }

export default function StudentResources() {
  const { data, loading, error, reload } = useApiData('/api/resources')
  const [tab, setTab] = useState('all') // 'all' | 'papers'
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')

  const resources = data?.resources || []
  const subjects = [...new Set(resources.map(r => r.subject).filter(Boolean))].sort()
  const grades = [...new Set(resources.map(r => r.grade).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
  const paperCount = resources.filter(r => r.isPastPaper).length

  // A resource with no grade is for everyone, so it stays visible when a grade is chosen
  const shown = resources.filter(r =>
    (tab === 'all' || r.isPastPaper) &&
    (!subject || r.subject === subject) &&
    (!grade || !r.grade || r.grade === grade))

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)}
      style={{ border: 'none', cursor: 'pointer', padding: '0.55rem 1.3rem', borderRadius: '8px', fontWeight: 600,
        background: tab === key ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.08)',
        color: tab === key ? C.navy : 'rgba(255,255,255,0.7)' }}>
      {label}
    </button>
  )

  return (
    <StudentPage title="Learning Resources" icon="📖">
      {loading ? <p style={muted}>Loading...</p> : error ? (
        <div style={{ ...glassCard, padding: '1rem 1.25rem', borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      ) : resources.length === 0 ? (
        <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', ...muted }}>
          Your teachers haven't added any study materials yet. Check back soon.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {tabBtn('all', 'All materials')}
            {tabBtn('papers', `Past papers (${paperCount})`)}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {subjects.length > 1 && (
              <select aria-label="Filter by subject" value={subject} onChange={e => setSubject(e.target.value)}
                style={{ ...glassInput, width: 'auto', minWidth: '200px' }}>
                <option value="" style={opt}>All subjects</option>
                {subjects.map(s => <option key={s} value={s} style={opt}>{s}</option>)}
              </select>
            )}
            {grades.length > 1 && (
              <select aria-label="Filter by grade" value={grade} onChange={e => setGrade(e.target.value)}
                style={{ ...glassInput, width: 'auto', minWidth: '160px' }}>
                <option value="" style={opt}>All grades</option>
                {grades.map(g => <option key={g} value={g} style={opt}>Grade {g}</option>)}
              </select>
            )}
          </div>

          {shown.length === 0 ? (
            <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', ...muted }}>
              {tab === 'papers' && paperCount === 0 ? 'No past papers have been added yet.' : 'Nothing matches those filters.'}
            </div>
          ) : (
            <ResourceGrid resources={shown} />
          )}
        </>
      )}
    </StudentPage>
  )
}
