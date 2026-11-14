import { useT } from '../../i18n/index.js'
import React from 'react'
import StudentPage from '../../components/student/StudentPage'
import { panel, panelTitle, muted, ErrorBox } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import SkeletonList from '../../components/shared/Skeleton'

// Phase 7 edit: title "School Statistics", grey tokens for chart bars,
// tables in scroll boxes, all strings via t(), no emoji, no hard-coded hex.
// Charts are plain CSS bars (no external chart library is installed).

const BAR_COLOUR      = 'var(--muted)'      // G1 – no hard-coded hex
const BAR_COLOUR_ALT  = 'var(--fg)'

function SimpleBarChart({ data, xKey, yKey, color, unit = '' }) {
  const max = Math.max(1, ...data.map(d => Number(d[yKey]) || 0))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: '12.5rem' }}>
        {data.map((d, i) => {
          const val = Number(d[yKey]) || 0
          const pct = Math.max(val ? 4 : 1, (val / max) * 100)
          return (
            <div key={i} title={`${d[xKey]}: ${val}${unit}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: '100%', height: `${pct}%`, borderRadius: '0.2rem 0.2rem 0 0', background: color }} />
              <div style={{ ...muted, fontSize: 'var(--fs-xs, 0.7rem)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {d[xKey]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
                    {t(`stats.${key}`)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grades bar chart */}
          {data.gradeDistribution?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.gradeDistribution')}</div>
              <SimpleBarChart data={data.gradeDistribution} xKey="grade" yKey="count" color={BAR_COLOUR} />
            </div>
          )}

          {/* Attendance bar chart */}
          {data.attendanceByClass?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.attendanceByClass')}</div>
              <SimpleBarChart data={data.attendanceByClass} xKey="className" yKey="rate" color={BAR_COLOUR_ALT} unit="%" />
            </div>
          )}

          {/* Top performers table – scrollable */}
          {data.topStudents?.length > 0 && (
            <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
              <div style={panelTitle}>{t('stats.topStudents')}</div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left',  padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.name')}</th>
                      <th style={{ textAlign: 'left',  padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.class')}</th>
                      <th style={{ textAlign: 'right', padding: '0.4rem 0.6rem', color: 'var(--muted)' }}>{t('stats.avg')}</th>
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
