import { useT } from '../../i18n/index.js'
import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import SkeletonList from '../../components/shared/Skeleton'
import { glassInput } from '../../styles/glass'

function RiskBadge({ atRisk, t }) {
  return (
    <span style={{
      fontSize: 'var(--fs-xs)',
      border: '1px solid var(--border)',
      borderRadius: '999px',
      padding: '0.1rem 0.55rem',
      color: atRisk ? 'var(--fg)' : 'var(--muted)',
      background: atRisk ? 'rgba(var(--fg-rgb,255,255,255),0.08)' : 'transparent',
    }}>
      {atRisk ? t('progress.atRisk') : t('progress.onTrack')}
    </span>
  )
}

export default function PrincipalStudentProgress() {
  const t = useT()
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [risk, setRisk] = useState('')

  const params = new URLSearchParams({ search, class: classFilter, risk }).toString()
  const { data, loading, error, reload } = useApiData(`/api/principal/progress?${params}`)

  return (
    <StudentPage title={t('progress.title')} icon="BarChart" backPath="/principal/dashboard">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <input
          type="search"
          placeholder={t('progress.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...glassInput, flex: '1 1 180px', minWidth: 0 }}
        />
        {data?.classes?.length > 0 && (
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ ...glassInput, flex: '0 1 160px' }}>
            <option value="">{t('progress.allClasses')}</option>
            {data.classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={risk} onChange={e => setRisk(e.target.value)} style={{ ...glassInput, flex: '0 1 140px' }}>
          <option value="">{t('progress.allStudents')}</option>
          <option value="at-risk">{t('progress.atRisk')}</option>
          <option value="on-track">{t('progress.onTrack')}</option>
        </select>
      </div>

      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        data.students.length === 0
          ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('progress.noStudents')}</div>
          : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {data.students.map(s => (
                <div key={s.id} style={{ ...panel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ ...muted, fontSize: 'var(--fs-sm)' }}>
                      {s.className ?? t('progress.noClass')}
                      {s.graded > 0 && ` · ${s.graded} ${t('progress.graded')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>
                      {s.avg !== null ? `${s.avg}%` : <span style={muted}>—</span>}
                    </span>
                    <RiskBadge atRisk={s.atRisk} t={t} />
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </StudentPage>
  )
}
