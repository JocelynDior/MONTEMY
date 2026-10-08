import React, { useEffect, useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import { useApiData } from '../../hooks/useApiData'
import { gradeColor } from '../../components/student/studentUtils'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }

export default function TeacherProgress() {
  const classes = useApiData('/api/teacher/classes')
  const [classId, setClassId] = useState('')
  const [threshold, setThreshold] = useState(50)

  const classList = classes.data?.classes || []

  // Select the first class once the list arrives
  useEffect(() => {
    if (!classId && classList.length) setClassId(classList[0].id)
  }, [classList, classId])

  const progress = useApiData(classId ? `/api/teacher/progress?classId=${encodeURIComponent(classId)}` : null)

  const limit = Number(threshold)
  const students = [...(progress.data?.students || [])].sort((a, b) => {
    if (a.average === null) return 1
    if (b.average === null) return -1
    return a.average - b.average
  })
  const flagged = students.filter(s => s.average !== null && s.average < limit)

  return (
    <TeacherPage title="Student Progress" icon="📊">
      {classes.loading && <p style={muted}>Loading...</p>}
      {classes.error && <div style={{ ...panel, color: '#ffb3b3' }}>{classes.error}</div>}

      {classes.data && classList.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You haven't added any classes yet. Add one in My Classes to see progress here.
        </div>
      )}

      {classList.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ minWidth: '200px', flex: 1 }}>
            <label style={labelStyle}>Class</label>
            <select style={glassInput} value={classId} onChange={e => setClassId(e.target.value)}>
              {classList.map(c => <option key={c.id} value={c.id} style={{ background: '#001F3F' }}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ width: '170px' }}>
            <label style={labelStyle}>Flag students below</label>
            <input style={glassInput} type="number" min="0" max="100" value={threshold} onChange={e => setThreshold(e.target.value)} />
          </div>
        </div>
      )}

      {progress.loading && classId && <p style={muted}>Loading...</p>}
      {progress.error && <div style={{ ...panel, color: '#ffb3b3' }}>{progress.error}</div>}

      {progress.data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: progress.data.classAverage === null ? 'white' : gradeColor(progress.data.classAverage) }}>
                {progress.data.classAverage === null ? '–' : `${progress.data.classAverage}%`}
              </div>
              <div style={muted}>Class average</div>
            </div>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: flagged.length ? '#ff8f8f' : '#7CFC9A' }}>{flagged.length}</div>
              <div style={muted}>Below {limit || 0}%</div>
            </div>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{progress.data.assignmentCount}</div>
              <div style={muted}>Assignments set</div>
            </div>
          </div>

          {students.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center' }}>No students are in this class yet.</div>
          ) : students.map(s => {
            const isFlagged = s.average !== null && s.average < limit
            return (
              <div key={s.id} style={{ ...panel, marginBottom: '0.6rem', padding: '0.9rem 1.25rem', borderColor: isFlagged ? 'rgba(255,80,80,0.5)' : undefined, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ ...muted, fontSize: '0.8rem' }}>
                    {s.graded} graded · {s.submitted} handed in · of {progress.data.assignmentCount}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.average === null ? 'rgba(255,255,255,0.5)' : gradeColor(s.average) }}>
                    {s.average === null ? 'No grades' : `${s.average}%`}
                  </div>
                  {isFlagged && <div style={{ color: '#ff8f8f', fontSize: '0.8rem', fontWeight: 700 }}>⚠ Below {limit}%</div>}
                </div>
              </div>
            )
          })}
        </>
      )}
    </TeacherPage>
  )
}
