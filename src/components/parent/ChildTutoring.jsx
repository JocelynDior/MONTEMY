import React from 'react'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDate } from '../student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'
import { Chip, ErrorBox, muted, panel } from './parentUi'
import { fmtDuration, sessionStatusColor, sessionStatusLabel } from '../tutor/tutorUi'
import SkeletonList from '../../components/shared/Skeleton'

// Parent view of a linked child's tutoring sessions. Notes appear only if the tutor shared them.
export default function ChildTutoring({ childId }) {
  const t = useT()
  const { data, loading, error, reload } = useApiData(`/api/parent/children/${childId}/tutor-sessions`)

  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data || data.sessions.length === 0) {
    return <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.noTutoring')}</div>
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
      {data.sessions.map(s => (
        <div key={s.id} style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</span>
            <Chip color={sessionStatusColor(s.status)}>{sessionStatusLabel(s.status, t)}</Chip>
          </div>
          <div style={{ ...muted, marginTop: '0.3rem', overflowWrap: 'anywhere' }}>
            {t('student.withTutor', { name: s.tutorName })}{s.subject ? ` · ${subjectLabel(s.subject, t)}` : ''}
          </div>
          {s.notes && (
            <div style={{ marginTop: '0.6rem' }}>
              <div style={{ ...muted, fontSize: 'var(--fs-xs)' }}>{t('parent.tutorNotes')}</div>
              <p style={{ marginTop: '0.2rem', overflowWrap: 'anywhere' }}>{s.notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
