import React from 'react'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from '../student/studentUtils'
import { Chip, ErrorBox, muted, panel } from './parentUi'
import { fmtDuration, sessionStatusColor, sessionStatusLabel } from '../tutor/tutorUi'

// Parent view of a linked child's tutoring sessions. Notes appear only if the tutor shared them.
export default function ChildTutoring({ childId }) {
  const { data, loading, error, reload } = useApiData(`/api/parent/children/${childId}/tutor-sessions`)

  if (loading) return <p style={muted}>Loading...</p>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data || data.sessions.length === 0) {
    return <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No tutoring sessions for this child yet.</div>
  }

  return (
    <>
      {data.sessions.map(s => (
        <div key={s.id} style={{ ...panel, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</span>
            <Chip color={sessionStatusColor(s.status)}>{sessionStatusLabel(s.status)}</Chip>
          </div>
          <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem' }}>With {s.tutorName}{s.subject ? ` · ${s.subject}` : ''}</div>
          {s.notes && (
            <div style={{ marginTop: '0.6rem' }}>
              <div style={{ ...muted, fontSize: '0.75rem' }}>Tutor's notes</div>
              <p style={{ marginTop: '0.2rem' }}>{s.notes}</p>
            </div>
          )}
        </div>
      ))}
    </>
  )
}
