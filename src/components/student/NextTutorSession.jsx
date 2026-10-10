import React from 'react'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from './studentUtils'
import { fmtDuration } from '../tutor/tutorUi'
import { muted, panel, panelTitle } from '../parent/parentUi'

// Student dashboard: the next few tutoring sessions. Renders nothing when there are none.
export default function NextTutorSession() {
  const { data, error } = useApiData('/api/student/tutor-sessions')
  if (error || !data || data.sessions.length === 0) return null

  return (
    <div style={{ ...panel, marginTop: '1.25rem' }}>
      <h3 style={panelTitle}>Next tutoring session{data.sessions.length > 1 ? 's' : ''}</h3>
      {data.sessions.map(s => (
        <div key={s.id} style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontWeight: 600 }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</div>
          <div style={{ ...muted, fontSize: '0.85rem' }}>With {s.tutorName}{s.subject ? ` · ${s.subject}` : ''}</div>
        </div>
      ))}
    </div>
  )
}
