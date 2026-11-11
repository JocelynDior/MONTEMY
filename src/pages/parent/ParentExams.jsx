import React, { useMemo, useState } from 'react'
import { ChildPage } from '../../components/parent/ChildSwitcher'
import { ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import SkeletonList from '../../components/shared/Skeleton'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDay, gradeLevelKey, todayYmd } from '../../components/student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'
import { fmtDuration } from '../../components/tutor/tutorUi'

function Exams({ childId }) {
  const t = useT()
  const [tab, setTab] = useState('upcoming')
  const exams = useApiData(`/api/parent/children/${childId}/exams`)
  const results = useApiData(`/api/parent/children/${childId}/results`)

  const today = todayYmd()
  const upcoming = useMemo(() => (exams.data?.exams || []).filter(e => e.date >= today), [exams.data, today])
  const rows = results.data?.results || []

  const tabs = [
    { key: 'upcoming', label: t('student.tabUpcoming') },
    { key: 'results', label: t('student.tabResults') },
  ]

  return (
    <div style={{ minWidth: 0 }}>
      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'upcoming' && (
        exams.loading ? <SkeletonList /> : exams.error ? <ErrorBox message={exams.error} onRetry={exams.reload} /> : (
          upcoming.length === 0
            ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.noUpcomingExams')}</div>
            : (
              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                {upcoming.map(e => (
                  <div key={e.id} style={panel}>
                    <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{subjectLabel(e.subject, t)}: {e.title}</div>
                    <div style={{ marginTop: '0.3rem' }}>{fmtDay(e.date)}{e.startTime ? ` · ${e.startTime}` : ''}</div>
                    <div style={{ ...muted, marginTop: '0.2rem', overflowWrap: 'anywhere' }}>
                      {[e.durationMinutes ? fmtDuration(e.durationMinutes) : '', e.venue ? t('student.venueAt', { venue: e.venue }) : '', e.totalMarks ? t('student.outOf', { n: e.totalMarks }) : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )
        )
      )}

      {tab === 'results' && (
        results.loading ? <SkeletonList /> : results.error ? <ErrorBox message={results.error} onRetry={results.reload} /> : (
          rows.length === 0
            ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.noExamMarks')}</div>
            : (
              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                {results.data.average !== null && (
                  <div style={panel}><span style={muted}>{t('parent.examAverage')} </span><strong style={{ fontSize: 'var(--fs-xl)' }}>{results.data.average}%</strong></div>
                )}
                {[...rows].reverse().map(r => (
                  <div key={r.examId} style={panel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{subjectLabel(r.subject, t)}: {r.title}</span>
                      <span>
                        <strong>{r.mark}{r.totalMarks ? ` / ${r.totalMarks}` : ''}</strong>
                        {r.percent !== null && <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{r.percent}%{gradeLevelKey(r.percent) ? ` · ${t(gradeLevelKey(r.percent))}` : ''}</span>}
                      </span>
                    </div>
                    <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.3rem' }}>{fmtDay(r.date)}</div>
                    {r.comment && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{t('student.teacherFeedback')}: {r.comment}</div>}
                  </div>
                ))}
              </div>
            )
        )
      )}
    </div>
  )
}

export default function ParentExams() {
  const t = useT()
  return (
    <ChildPage title={t('shell.f_exams')} icon="terms">
      {({ childId }) => <Exams childId={childId} />}
    </ChildPage>
  )
}
