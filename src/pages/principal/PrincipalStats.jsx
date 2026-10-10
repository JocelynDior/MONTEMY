import React, { useEffect, useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { gradeColor } from '../../components/student/studentUtils'
import { glassInput } from '../../styles/glass'

const th = { textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }
const td = { padding: '0.55rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }

function Avg({ value }) {
  return value === null || value === undefined
    ? <span style={muted}>—</span>
    : <strong style={{ color: gradeColor(value) }}>{value}%</strong>
}

export default function PrincipalStats() {
  const [input, setInput] = useState('50')
  const [threshold, setThreshold] = useState(50)

  // Apply the threshold 600ms after the principal stops typing
  useEffect(() => {
    const n = Math.round(Number(input))
    if (!Number.isFinite(n) || n < 1 || n > 100) return
    const t = setTimeout(() => setThreshold(n), 600)
    return () => clearTimeout(t)
  }, [input])

  const { data, loading, error, reload } = useApiData(`/api/principal/stats?threshold=${threshold}`)

  return (
    <StudentPage title="School Statistics" icon="📊" backPath="/principal/dashboard" maxWidth={1000}>
      {loading && !data && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            <div style={panel}>
              <h3 style={panelTitle}>School average</h3>
              <div style={{ fontSize: '2rem' }}><Avg value={data.average} /></div>
              <p style={{ ...muted, marginTop: '0.25rem' }}>{data.gradedCount} graded submission{data.gradedCount === 1 ? '' : 's'}</p>
            </div>
            <div style={panel}>
              <h3 style={panelTitle}>People</h3>
              <div style={muted}>{data.counts.students} students · {data.counts.teachers} teachers · {data.counts.parents} parents · {data.counts.classes} classes</div>
            </div>
            <div style={panel}>
              <h3 style={panelTitle}>At-risk threshold</h3>
              <input type="number" min="1" max="100" value={input} onChange={e => setInput(e.target.value)}
                style={{ ...glassInput, width: '110px' }} aria-label="At-risk threshold percent" />
              <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>Students averaging below this % are flagged.</p>
            </div>
          </div>

          <div style={panel}>
            <h3 style={panelTitle}>Performance by class</h3>
            {data.classes.length === 0 ? <p style={muted}>No classes at your school yet.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Class</th><th style={th}>Students</th><th style={th}>Assignments</th><th style={th}>Graded</th><th style={th}>Average</th><th style={th}>At risk</th></tr></thead>
                  <tbody>
                    {data.classes.map(c => (
                      <tr key={c.id}>
                        <td style={td}><strong>{c.name}</strong></td>
                        <td style={td}>{c.students}</td>
                        <td style={td}>{c.assignments}</td>
                        <td style={td}>{c.graded}</td>
                        <td style={td}><Avg value={c.average} /></td>
                        <td style={{ ...td, color: c.atRisk ? '#ff8f8f' : undefined }}>{c.atRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={panel}>
            <h3 style={panelTitle}>Average by grade</h3>
            {data.grades.length === 0 ? <p style={muted}>No data yet.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Grade</th><th style={th}>Students</th><th style={th}>Graded</th><th style={th}>Average</th></tr></thead>
                  <tbody>
                    {data.grades.map(g => (
                      <tr key={g.grade}>
                        <td style={td}><strong>Grade {g.grade}</strong></td>
                        <td style={td}>{g.students}</td>
                        <td style={td}>{g.graded}</td>
                        <td style={td}><Avg value={g.average} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.75rem' }}>
              A per-subject breakdown needs assignments to be tagged with a subject, which isn't tracked yet.
            </p>
          </div>

          <div style={panel}>
            <h3 style={panelTitle}>Students at risk ({data.atRiskTotal})</h3>
            {data.atRisk.length === 0 ? <p style={muted}>No students are averaging below {data.threshold}%.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Student</th><th style={th}>Class</th><th style={th}>Average</th><th style={th}>Graded</th></tr></thead>
                  <tbody>
                    {data.atRisk.map(s => (
                      <tr key={s.studentId}>
                        <td style={td}><strong>{s.name}</strong></td>
                        <td style={td}>{s.className}</td>
                        <td style={td}><Avg value={s.average} /></td>
                        <td style={td}>{s.gradedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.atRiskTotal > data.atRisk.length && (
              <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.75rem' }}>Showing the {data.atRisk.length} lowest averages.</p>
            )}
          </div>
        </div>
      )}
    </StudentPage>
  )
}
