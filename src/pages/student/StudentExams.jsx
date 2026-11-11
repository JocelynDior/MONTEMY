import React, { useMemo, useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { SegmentedTabs, fmtDuration } from '../../components/tutor/tutorUi'
import SkeletonList from '../../components/shared/Skeleton'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDay, gradeBarFill, gradeLevelKey, todayYmd } from '../../components/student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'

const empty = { ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }

// The student's exams: what is coming (date, time, venue) and the marks that have been entered
export default function StudentExams() {
  const t = useT()
  const [tab, setTab] = useState('upcoming')
  const { data, loading, error, reload } = useApiData('/api/exams')
  const today = todayYmd()

  const { upcoming, past } = useMemo(() => {
    const all = data?.exams || []
    return {
      upcoming: all.filter(e => e.date >= today),
      past: all.filter(e => e.date < today || e.result).sort((a, b) => String(b.date).localeCompare(String(a.date))),
    }
  }, [data, today])

  const tabs = [
    { key: 'upcoming', label: t('student.tabUpcoming') },
    { key: 'results', label: t('student.tabResults') },
  ]

  return (
    <StudentPage title={t('shell.f_exams')} icon="terms" maxWidth={900}>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === 'upcoming' && (
            upcoming.length === 0 ? <div style={empty}>{t('student.noUpcomingExams')}</div> : (
              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                {upcoming.map(e => (
                  <div key={e.id} style={panel}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', overflowWrap: 'anywhere' }}>{subjectLabel(e.subject, t)}: {e.title}</div>
                    <div style={{ marginTop: '0.3rem' }}>{fmtDay(e.date)}{e.startTime ? ` · ${e.startTime}` : ''}</div>
                    <div style={{ ...muted, marginTop: '0.2rem', overflowWrap: 'anywhere' }}>
                      {[e.durationMinutes ? fmtDuration(e.durationMinutes) : '', e.venue ? t('student.venueAt', { venue: e.venue }) : '', e.totalMarks ? t('student.outOf', { n: e.totalMarks }) : '', e.className].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'results' && (
            past.length === 0 ? <div style={empty}>{t('student.noResultsYet')}</div> : (
              <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
                {past.map(e => {
                  const r = e.result
                  const pct = r && e.totalMarks ? Math.round((r.mark / e.totalMarks) * 1000) / 10 : null
                  return (
                    <div key={e.id} style={panel}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{subjectLabel(e.subject, t)}: {e.title}</span>
                        {r
                          ? <span><strong>{r.mark}{e.totalMarks ? ` / ${e.totalMarks}` : ''}</strong>{pct !== null && <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{pct}%{gradeLevelKey(pct) ? ` · ${t(gradeLevelKey(pct))}` : ''}</span>}</span>
                          : <span style={muted}>{t('student.markNotEntered')}</span>}
                      </div>
                      {pct !== null && (
                        <div role="presentation" style={{ height: '0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', overflow: 'hidden', marginTop: '0.5rem' }}>
                          <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: gradeBarFill(pct) }} />
                        </div>
                      )}
                      <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.4rem' }}>{fmtDay(e.date)}</div>
                      {r?.comment && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{t('student.teacherFeedback')}: {r.comment}</div>}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </>
      )}
    </StudentPage>
  )
}
