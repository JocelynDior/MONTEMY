import { useT } from '../../i18n/index.js'
import React from 'react'
import { BarChart } from '../../components/charts/charts'
import StudentPage from '../../components/student/StudentPage'
import { panel, panelTitle, muted, ErrorBox } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import SkeletonList from '../../components/shared/Skeleton'

// Phase 7 edit: title "School Statistics", grey tokens for chart bars,
// tables in scroll boxes, all strings via t(), no emoji, no hard-coded hex.

export default function PrincipalStats() {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/principal/stats')

  return (
    <StudentPage
      title={t('circle.school_statistics')}
      icon="BarChart"
      backPath="/principal/dashboard"
    >
      {loading && !data && <SkeletonList />}
      {error   && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          {/* Summary stat tiles */}
          {data.summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
              gap: 'var(--sp-3)',
              marginBottom: 'var(--sp-4)',
            }}>
              {Object.entries(data.summary).map(([key, val]) => (
                <div key={key} style={{ ...panel, textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>{val}</div>
                  <div style={{ ...muted, fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>
                    {t(`stats.${key}`, { defaultValue: key })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grades bar chart */}
          {data.gradeDistribution?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.gradeDistribution', { defaultValue: 'Grade Distribution' })}</div>
              <BarChart
                ariaLabel={t('stats.gradeDistribution', { defaultValue: 'Grade Distribution' })}
                bars={data.gradeDistribution.map(g => ({ label: g.grade, value: Number(g.count) || 0 }))}
              />
            </div>
          )}

          {/* Attendance bar chart */}
          {data.attendanceByClass?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.attendanceByClass', { defaultValue: 'Attendance by Class' })}</div>
              <BarChart
                ariaLabel={t('stats.attendanceByClass', { defaultValue: 'Attendance by Class' })}
                bars={data.attendanceByClass.map(c => ({ label: c.className, value: Number(c.rate) || 0 }))}
              />
            </div>
          )}

          {/* Top performers table – scrollable */}
          {data.topStudents?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.topStudents', { defaultValue: 'Top Students' })}</div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left',  padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.name',  { defaultValue: 'Name'  })}</th>
                      <th style={{ textAlign: 'left',  padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.class', { defaultValue: 'Class' })}</th>
                      <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.avg',   { defaultValue: 'Avg %' })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStudents.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.5rem 0.6rem' }}>{s.name}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: 'var(--muted)' }}>{s.className ?? '—'}</td>
                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>{s.avg !== null ? `${s.avg}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </StudentPage>
  )
}
