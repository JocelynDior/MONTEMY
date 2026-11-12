import React from 'react'
import DashboardShell from '../../components/shell/DashboardShell'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { muted, panel, Chip } from '../../components/parent/parentUi'
import { ErrorBox } from '../../components/parent/parentUi'
import SkeletonList from '../../components/shared/Skeleton'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { fmtDate } from '../../components/student/studentUtils'
import { sessionStatusColor, sessionStatusLabel, fmtDuration } from '../../components/tutor/tutorUi'

function TutorSummary() {
  const t = useT('tutor')
  const { data, loading, error, reload } = useApiData('/api/tutor/overview')
  const { pick } = useOrgTerms()

  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const { isVerified, studentCount, upcomingCount, completedCount, upcoming } = data

  return (
    <div style={{ padding: 'var(--sp-4) var(--page-gutter) 0' }}>
      {!isVerified && (
        <div style={{ ...panel, marginBottom: 'var(--sp-4)', background: 'var(--surface-2)', borderColor: 'var(--border-strong)' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>{t('tutor.pendingVerification')}</p>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
        {[
          { label: pick(t('tutor.statStudentsFirm'), t('tutor.statStudents')), value: studentCount ?? 0 },
          { label: t('tutor.statUpcoming'), value: upcomingCount ?? 0 },
          { label: t('tutor.statCompleted'), value: completedCount ?? 0 },
        ].map((s) => (
          <div key={s.label} style={{ ...panel, flex: '1 1 100px', textAlign: 'center', padding: 'var(--sp-3)' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>{s.value}</div>
            <div style={{ ...muted, fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming sessions */}
      {upcoming?.length > 0 && (
        <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t('tutor.upcomingSessions')}</div>
          {upcoming.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 500, overflowWrap: 'break-word' }}>{s.studentName}</span>
                {s.subject && <span style={{ ...muted, fontSize: 'var(--fs-sm)', marginInlineStart: 'var(--sp-1)' }}>{s.subject}</span>}
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginTop: '0.1rem' }}>
                  {fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}
                </div>
              </div>
              <Chip label={sessionStatusLabel(s.status, t)} color={sessionStatusColor(s.status)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TutorDashboard() {
  return (
    <>
      <DashboardShell role="tutor" collection="tutors" />
      <TutorSummary />
    </>
  )
}
