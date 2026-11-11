import React from 'react'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDate } from './studentUtils'
import { subjectLabel } from '../../config/studentOptions'
import { fmtDuration } from '../tutor/tutorUi'
import { muted, panel, panelTitle } from '../parent/parentUi'

// Student home: the next few tutoring sessions. Renders nothing when there are none.
export default function NextTutorSession() {
  const t = useT()
  const { data, error } = useApiData('/api/student/tutor-sessions')
  if (error || !data || data.sessions.length === 0) return null

  return (
    <div style={{ ...panel, marginTop: 'var(--sp-4)' }}>
      <h3 style={panelTitle}>{t(data.sessions.length > 1 ? 'student.nextSessions' : 'student.nextSession')}</h3>
      {data.sessions.map(s => (
        <div key={s.id} style={{ marginBottom: '0.6rem', minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</div>
          <div style={{ ...muted, overflowWrap: 'anywhere' }}>
            {t('student.withTutor', { name: s.tutorName })}{s.subject ? ` · ${subjectLabel(s.subject, t)}` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
