import React, { useEffect, useRef, useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { gradeColor } from '../../components/student/studentUtils'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600' }
const ghostBtn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }
const stickyCol = { position: 'sticky', left: 0, background: 'var(--color-bg, #001F3F)', zIndex: 1 }
const th = { padding: '0.55rem 0.7rem', textAlign: 'left', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontWeight: 600, verticalAlign: 'bottom', minWidth: '88px' }
const td = { padding: '0.45rem 0.7rem', borderTop: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }

const mean = (list) => (list.length ? Math.round((list.reduce((t, x) => t + x, 0) / list.length) * 10) / 10 : null)
const pct = (v) => (v === null || v === undefined ? '–' : `${v}%`)

export default function TeacherProgress() {
  const classes = useApiData('/api/teacher/classes')
  const [classId, setClassId] = useState('')
  const [subject, setSubject] = useState('')
  const [threshold, setThreshold] = useState('50')
  const [thresholdNote, setThresholdNote] = useState('')
  const [editing, setEditing] = useState(null) // { studentId, assignmentId, value }
  const [savingCell, setSavingCell] = useState(false)
  const [actionError, setActionError] = useState('')
  const [exporting, setExporting] = useState(false)
  const lastSaved = useRef(null)

  const classList = classes.data?.classes || []
  useEffect(() => {
    if (!classId && classList.length) setClassId(classList[0].id)
  }, [classList, classId])

  const book = useApiData(classId ? `/api/teacher/gradebook?classId=${encodeURIComponent(classId)}` : null)
  const data = book.data

  // The saved level arrives with the grade book; after that, typing saves it 700ms after the last keystroke
  useEffect(() => {
    if (data && lastSaved.current === null) {
      lastSaved.current = data.threshold
      setThreshold(String(data.threshold))
    }
  }, [data])
  useEffect(() => {
    const n = Math.round(Number(threshold))
    if (lastSaved.current === null || !Number.isFinite(n) || n < 1 || n > 100 || n === lastSaved.current) return
    const t = setTimeout(async () => {
      try {
        await apiFetch('/api/teacher/gradebook/threshold', { method: 'PUT', body: { threshold: n } })
        lastSaved.current = n
        setThresholdNote('Saved')
      } catch (err) {
        setThresholdNote(err.message || 'Could not save.')
      }
    }, 700)
    return () => clearTimeout(t)
  }, [threshold])

  const changeClass = (id) => { setClassId(id); setSubject(''); setEditing(null); setActionError('') }

  const limit = Number(threshold) || 0
  const visible = data ? data.assignments.filter(a => !subject || a.subject === subject) : []
  const avgOf = (s) => (subject ? s.bySubject[subject] ?? null : s.average)
  const students = data ? data.students : []
  const classAvg = data ? (subject ? mean(students.map(avgOf).filter(a => a !== null)) : data.classAverage) : null
  const flagged = students.filter(s => avgOf(s) !== null && avgOf(s) < limit).length

  const saveCell = async () => {
    if (!editing) return
    const cell = students.find(s => s.id === editing.studentId)?.cells[editing.assignmentId]
    setSavingCell(true); setActionError('')
    try {
      await apiFetch(`/api/teacher/assignments/${editing.assignmentId}/grade`, {
        method: 'PUT', body: { studentId: editing.studentId, grade: editing.value, feedback: cell?.feedback || '' },
      })
      setEditing(null)
      book.reload()
    } catch (err) {
      setActionError(err.message || 'Could not save the grade.')
    }
    setSavingCell(false)
  }

  const exportCsv = async () => {
    setExporting(true); setActionError('')
    try {
      const r = await apiFetch(`/api/teacher/gradebook/export?classId=${encodeURIComponent(classId)}`)
      const blob = new Blob(['\uFEFF' + r.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gradebook-${r.className}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(err.message || 'Could not export the grade book.')
    }
    setExporting(false)
  }

  return (
    <TeacherPage title="Grade Book" icon="📊" maxWidth={1200}>
      {classes.loading && <p style={muted}>Loading...</p>}
      {classes.error && <div style={{ ...panel, color: '#ffb3b3' }}>{classes.error}</div>}

      {classes.data && classList.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You haven't added any classes yet. Add one in My Classes to see the grade book here.
        </div>
      )}

      {classList.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '170px', flex: 1 }}>
            <label style={labelStyle} htmlFor="gb-class">Class</label>
            <select id="gb-class" style={glassInput} value={classId} onChange={e => changeClass(e.target.value)}>
              {classList.map(c => <option key={c.id} value={c.id} style={{ background: '#001F3F' }}>{c.name}</option>)}
            </select>
          </div>
          {data && data.subjects.length > 1 && (
            <div style={{ minWidth: '170px', flex: 1 }}>
              <label style={labelStyle} htmlFor="gb-subject">Subject</label>
              <select id="gb-subject" style={glassInput} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="" style={{ background: '#001F3F' }}>All subjects</option>
                {data.subjects.map(sj => <option key={sj} value={sj} style={{ background: '#001F3F' }}>{sj}</option>)}
              </select>
            </div>
          )}
          <div style={{ width: '150px' }}>
            <label style={labelStyle} htmlFor="gb-threshold">Flag below (%)</label>
            <input id="gb-threshold" style={glassInput} type="number" min="1" max="100" value={threshold}
              onChange={e => { setThreshold(e.target.value); setThresholdNote('') }} />
            {thresholdNote && <div role="status" style={{ ...muted, fontSize: '0.75rem', marginTop: '0.25rem' }}>{thresholdNote}</div>}
          </div>
          <button onClick={exportCsv} disabled={exporting || !data} style={{ ...ghostBtn, opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>
      )}

      {book.loading && classId && !data && <p style={muted}>Loading...</p>}
      {book.error && <div style={{ ...panel, color: '#ffb3b3' }}>{book.error}</div>}
      {actionError && <div role="alert" style={{ ...panel, color: '#ffb3b3', padding: '0.7rem 1rem' }}>{actionError}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: classAvg === null ? 'white' : gradeColor(classAvg) }}>{pct(classAvg)}</div>
              <div style={muted}>Class average</div>
            </div>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: flagged ? '#ff8f8f' : '#7CFC9A' }}>{flagged}</div>
              <div style={muted}>Below {limit}%</div>
            </div>
            <div style={{ ...glassCard, padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{visible.length}</div>
              <div style={muted}>Assignments</div>
            </div>
          </div>

          {students.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center' }}>No students are in this class yet.</div>
          ) : visible.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center' }}>No assignments yet{subject ? ` for ${subject}` : ''}. Set one in Assignments and the grades will appear here.</div>
          ) : (
            <div style={{ ...glassCard, padding: 0, overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, ...stickyCol, minWidth: '150px' }}>Student</th>
                    {visible.map(a => (
                      <th key={a.id} style={th} title={`${a.title} (${a.subject})`}>
                        <div style={{ color: 'white', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontWeight: 400, fontSize: '0.72rem' }}>{a.subject}</div>
                      </th>
                    ))}
                    <th style={{ ...th, color: C.turquoise }}>{subject ? `${subject} avg` : 'Average'}</th>
                    {!subject && data.subjects.length > 1 && data.subjects.map(sj => <th key={sj} style={th}>{sj} avg</th>)}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const avg = avgOf(s)
                    const isFlagged = avg !== null && avg < limit
                    return (
                      <tr key={s.id} style={{ background: isFlagged ? 'rgba(255,80,80,0.12)' : undefined }}>
                        <td style={{ ...td, ...stickyCol, fontWeight: 600 }}>{s.name}{isFlagged && <span title={`Below ${limit}%`} style={{ color: '#ff8f8f' }}> ⚠</span>}</td>
                        {visible.map(a => {
                          const cell = s.cells[a.id]
                          const isEditing = editing && editing.studentId === s.id && editing.assignmentId === a.id
                          if (isEditing) {
                            return (
                              <td key={a.id} style={td}>
                                <input autoFocus type="number" min="0" max="100" step="0.1" aria-label={`Grade for ${s.name}, ${a.title}`}
                                  value={editing.value} disabled={savingCell}
                                  onChange={e => setEditing({ ...editing, value: e.target.value })}
                                  onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditing(null) }}
                                  style={{ ...glassInput, width: '68px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} />
                                <button onClick={saveCell} disabled={savingCell || editing.value === ''} aria-label="Save grade"
                                  style={{ ...ghostBtn, padding: '0.25rem 0.5rem', marginLeft: '0.25rem' }}>✓</button>
                              </td>
                            )
                          }
                          const label = !cell ? '—' : cell.grade !== null ? `${cell.grade}` : cell.status
                          return (
                            <td key={a.id} style={td}>
                              <button onClick={() => { setActionError(''); setEditing({ studentId: s.id, assignmentId: a.id, value: cell?.grade ?? '' }) }}
                                aria-label={`${s.name}, ${a.title}: ${label}. Edit grade`}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.15rem 0.3rem', borderRadius: '6px',
                                  fontWeight: cell?.grade !== null && cell ? 700 : 400,
                                  color: cell?.grade !== null && cell ? gradeColor(cell.grade) : 'rgba(255,255,255,0.55)' }}>
                                {label}{cell?.isLate ? <span title="Handed in late" style={{ color: '#ffb36b' }}> •</span> : null}
                              </button>
                            </td>
                          )
                        })}
                        <td style={{ ...td, fontWeight: 700, color: avg === null ? 'rgba(255,255,255,0.5)' : gradeColor(avg) }}>{pct(avg)}</td>
                        {!subject && data.subjects.length > 1 && data.subjects.map(sj => (
                          <td key={sj} style={{ ...td, color: s.bySubject[sj] === null ? 'rgba(255,255,255,0.5)' : gradeColor(s.bySubject[sj]) }}>{pct(s.bySubject[sj])}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...td, ...stickyCol, ...muted, fontWeight: 600 }}>Class average</td>
                    {visible.map(a => (
                      <td key={a.id} style={{ ...td, color: data.assignmentAverages[a.id] === null ? 'rgba(255,255,255,0.5)' : gradeColor(data.assignmentAverages[a.id]) }}>{pct(data.assignmentAverages[a.id])}</td>
                    ))}
                    <td style={{ ...td, fontWeight: 700, color: classAvg === null ? 'rgba(255,255,255,0.5)' : gradeColor(classAvg) }}>{pct(classAvg)}</td>
                    {!subject && data.subjects.length > 1 && data.subjects.map(sj => {
                      const v = mean(students.map(s => s.bySubject[sj]).filter(a => a !== null))
                      return <td key={sj} style={{ ...td, color: v === null ? 'rgba(255,255,255,0.5)' : gradeColor(v) }}>{pct(v)}</td>
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.75rem' }}>
            Click a cell to enter or change a grade. Every change is kept in the grade history. A dot means the work was handed in late.
          </p>
        </>
      )}
    </TeacherPage>
  )
}
