import React, { useMemo, useState } from 'react'
import { ChildPage } from '../../components/parent/ChildSwitcher'
import ChildTutoring from '../../components/parent/ChildTutoring'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import { BarChart, LineChart } from '../../components/charts/charts'
import SkeletonList from '../../components/shared/Skeleton'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDate, fmtDay, gradeBarFill, gradeLevelKey, riskLabelKey, riskLevel } from '../../components/student/studentUtils'
import { gradeLabel, subjectLabel } from '../../config/studentOptions'

const bigNumber = { fontSize: 'var(--fs-3xl)', fontWeight: 700, lineHeight: 1.1 }

function Bar({ value }) {
  return (
    <div role="presentation" style={{ height: '0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', overflow: 'hidden', marginTop: '0.5rem' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: gradeBarFill(value) }} />
    </div>
  )
}

function Level({ value, t }) {
  const key = gradeLevelKey(value)
  return key ? <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{t(key)}</span> : null
}

function Empty({ children }) {
  return <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{children}</div>
}

function Report({ childId }) {
  const t = useT()
  const [tab, setTab] = useState('summary')
  const overview = useApiData(`/api/parent/children/${childId}/overview`)
  const exams = useApiData(`/api/parent/children/${childId}/results`)

  const data = overview.data
  const examResults = exams.data?.results || []

  // Every mark (homework and exams) oldest first, for the trend and the risk level
  const timeline = useMemo(() => {
    const items = []
    for (const g of data?.graded || []) items.push({ date: g.date, value: g.grade, title: g.title })
    for (const r of examResults) if (r.percent !== null) items.push({ date: r.date, value: r.percent, title: r.title })
    return items.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [data, examResults])

  const bySubject = useMemo(() => {
    const sums = {}
    for (const g of data?.graded || []) {
      const s = g.subject || 'General'
      sums[s] = sums[s] || { total: 0, n: 0 }
      sums[s].total += g.grade
      sums[s].n += 1
    }
    return Object.entries(sums).map(([s, v]) => ({ label: s === 'General' ? t('student.general') : subjectLabel(s, t), value: Math.round(v.total / v.n) }))
  }, [data, t])

  const tabs = [
    { key: 'summary', label: t('parent.tabSummary') },
    { key: 'marks', label: t('parent.tabMarks') },
    { key: 'tutoring', label: t('parent.tabTutoring') },
  ]

  if (overview.loading) return <SkeletonList />
  if (overview.error) return <ErrorBox message={overview.error} onRetry={overview.reload} />
  if (!data) return null

  const { child, profile, org, classInfo, average, graded } = data
  const risk = riskLevel(timeline.map(i => i.value))
  const allAverage = timeline.length ? Math.round((timeline.reduce((s, i) => s + i.value, 0) / timeline.length) * 10) / 10 : null
  const trend = timeline.slice(-12).map(i => ({ label: fmtDate(i.date, false).split(',')[0], value: Math.round(i.value), title: `${i.title}: ${Math.round(i.value)}%` }))

  return (
    <div style={{ minWidth: 0 }}>
      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'tutoring' && <ChildTutoring childId={childId} />}

      {tab === 'summary' && (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <div style={{ ...panel, display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, overflowWrap: 'anywhere' }}>{child.name}</div>
              <div style={{ ...muted, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
                {org?.name || t('parent.noSchool')}
                {profile.grade ? ` · ${gradeLabel(profile.grade, t)}` : ''}
                {classInfo ? ` · ${classInfo.name}` : ''}
                {classInfo?.teacherName ? ` · ${classInfo.teacherName}` : ''}
              </div>
              {profile.subjects.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {profile.subjects.map(s => <Chip key={s} color="var(--fg-muted)">{subjectLabel(s, t)}</Chip>)}
                </div>
              )}
            </div>
            <Chip>{t('parent.viewOnly')}</Chip>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: 'var(--sp-4)' }}>
            <div style={panel}>
              <h3 style={panelTitle}>{t('parent.overallAverage')}</h3>
              {allAverage === null ? <p style={muted}>{t('student.noGradesYet')}</p> : (
                <>
                  <div style={bigNumber}>{allAverage}%<Level value={allAverage} t={t} /></div>
                  <Bar value={allAverage} />
                  <p style={{ ...muted, marginTop: '0.5rem' }}>{t('parent.fromMarks', { n: timeline.length })}</p>
                </>
              )}
            </div>

            <div style={panel}>
              <h3 style={panelTitle}>{t('parent.riskTitle')}</h3>
              {risk === null ? <p style={muted}>{t('parent.riskNone')}</p> : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={bigNumber}>{t(riskLabelKey(risk))}</span>
                  </div>
                  <p style={{ ...muted, marginTop: '0.5rem' }}>{t(`parent.riskText_${risk}`)}</p>
                </>
              )}
            </div>
          </div>

          <div style={panel}>
            <h3 style={panelTitle}>{t('parent.trendTitle')}</h3>
            {trend.length < 2
              ? <p style={muted}>{t('parent.trendNeedMore')}</p>
              : <LineChart points={trend} ariaLabel={t('parent.trendTitle')} />}
          </div>

          {bySubject.length > 0 && (
            <div style={panel}>
              <h3 style={panelTitle}>{t('parent.bySubject')}</h3>
              <BarChart bars={bySubject} ariaLabel={t('parent.bySubject')} />
            </div>
          )}
        </div>
      )}

      {tab === 'marks' && (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <h3 style={{ ...panelTitle, marginBottom: 0 }}>{t('parent.homeworkMarks')}</h3>
          {graded.length === 0 && <Empty>{t('parent.noMarksYet')}</Empty>}
          {average !== null && graded.length > 0 && (
            <div style={panel}><span style={muted}>{t('parent.homeworkAverage')} </span><strong style={{ fontSize: 'var(--fs-xl)' }}>{average}%</strong><Level value={average} t={t} /></div>
          )}
          {[...graded].reverse().map(g => (
            <div key={g.assignmentId} style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{g.title}</span>
                <span><strong>{g.grade}%</strong><Level value={g.grade} t={t} /></span>
              </div>
              <Bar value={g.grade} />
              <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.4rem' }}>{subjectLabel(g.subject, t)} · {fmtDate(g.date, false)}</div>
              {g.feedback && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{t('student.teacherFeedback')}: {g.feedback}</div>}
            </div>
          ))}

          <h3 style={{ ...panelTitle, marginBottom: 0, marginTop: 'var(--sp-3)' }}>{t('parent.examMarks')}</h3>
          {exams.error && <ErrorBox message={exams.error} onRetry={exams.reload} />}
          {!exams.error && !exams.loading && examResults.length === 0 && <Empty>{t('parent.noExamMarks')}</Empty>}
          {[...examResults].reverse().map(r => (
            <div key={r.examId} style={panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{subjectLabel(r.subject, t)}: {r.title}</span>
                <span><strong>{r.mark}{r.totalMarks ? ` / ${r.totalMarks}` : ''}</strong>{r.percent !== null && <Level value={r.percent} t={t} />}</span>
              </div>
              {r.percent !== null && <Bar value={r.percent} />}
              <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.4rem' }}>{fmtDay(r.date)}</div>
              {r.comment && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{t('student.teacherFeedback')}: {r.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ParentProgress() {
  const t = useT()
  return (
    <ChildPage title={t('shell.f_child_progress')} icon="users">
      {({ childId }) => <Report childId={childId} />}
    </ChildPage>
  )
}
