import React, { useEffect, useRef, useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { useT } from '../../i18n'
import { gradeColor, gradeLevelKey, statusLabel } from '../../components/student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'
import { glassCard, glassInput } from '../../styles/glass'

const labelStyle = { display: 'block', fontSize: 'var(--fs-sm)', marginBottom: '0.4rem', fontWeight: 600 }
const stickyCol = { position: 'sticky', insetInlineStart: 0, background: 'var(--surface)', zIndex: 1 }
const th = { padding: '0.55rem 0.7rem', textAlign: 'start', fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', fontWeight: 600, verticalAlign: 'bottom', minWidth: '5.5rem' }
const td = { padding: '0.45rem 0.7rem', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' }

const mean = (list) => (list.length ? Math.round((list.reduce((s, x) => s + x, 0) / list.length) * 10) / 10 : null)
const pct = (v) => (v === null || v === undefined ? '–' : `${v}%`)

// True on phone-sized screens, where the grade book is shown as one card per student
function useNarrow(px = 640) {
  const query = `(max-width: ${px}px)`
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia(query)
    const on = () => setNarrow(m.matches)
    on()
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [query])
  return narrow
}

export default function TeacherProgress() {
  const t = useT()
  const narrow = useNarrow()
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
    const timer = setTimeout(async () => {
      try {
        await apiFetch('/api/teacher/gradebook/threshold', { method: 'PUT', body: { threshold: n } })
        lastSaved.current = n
        setThresholdNote(t('settings.saved'))
      } catch (err) {
        setThresholdNote(err.message || t('common.genericError'))
      }
    }, 700)
    return () => clearTimeout(timer)
  }, [threshold, t])

  const changeClass = (id) => { setClassId(id); setSubject(''); setEditing(null); setActionError('') }

  const limit = Number(threshold) || 0
  const visible = data ? data.assignments.filter(a => !subject || a.subject === subject) : []
  const avgOf = (s) => (subject ? s.bySubject[subject] ?? null : s.average)
  const students = data ? data.students : []
  const classAvg = data ? (subject ? mean(students.map(avgOf).filter(a => a !== null)) : data.classAverage) : null
  const flagged = students.filter(s => avgOf(s) !== null && avgOf(s) < limit).length
  const showSubjectCols = !subject && data && data.subjects.length > 1
  const levelWord = (v) => (gradeLevelKey(v) ? t(gradeLevelKey(v)) : '')

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
      setActionError(err.message || t('teacher.errSaveGrade'))
    }
    setSavingCell(false)
  }

  const exportCsv = async () => {
    setExporting(true); setActionError('')
    try {
      const r = await apiFetch(`/api/teacher/gradebook/export?classId=${encodeURIComponent(classId)}`)
      const blob = new Blob(['﻿' + r.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gradebook-${r.className}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(err.message || t('teacher.errExport'))
    }
    setExporting(false)
  }

  // One grade: a button that turns into a small editor. Used by both the table and the phone cards.
  const Cell = ({ s, a }) => {
    const cell = s.cells[a.id]
    const isEditing = editing && editing.studentId === s.id && editing.assignmentId === a.id
    if (isEditing) {
      return (
        <span style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center' }}>
          <input autoFocus type="number" min="0" max="100" step="0.1" inputMode="decimal" aria-label={t('teacher.gradeFor', { name: s.name, title: a.title })}
            value={editing.value} disabled={savingCell}
            onChange={e => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') saveCell(); if (e.key === 'Escape') setEditing(null) }}
            style={{ ...glassInput, width: '4.5rem', padding: '0.3rem 0.5rem', fontSize: '16px' }} />
          <button onClick={saveCell} disabled={savingCell || editing.value === ''} aria-label={t('teacher.saveGrade')}
            style={{ ...ghostBtn, padding: '0.3rem 0.5rem', minHeight: '2rem' }}><Icon name="check" /></button>
        </span>
      )
    }
    const hasGrade = cell && cell.grade !== null
    const text = !cell ? '—' : hasGrade ? `${cell.grade}` : statusLabel(cell.status, t)
    return (
      <button onClick={() => { setActionError(''); setEditing({ studentId: s.id, assignmentId: a.id, value: cell?.grade ?? '' }) }}
        aria-label={t('teacher.editGradeLabel', { name: s.name, title: a.title, value: text })}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', padding: '0.15rem 0.3rem', borderRadius: 'var(--radius-sm)',
          fontWeight: hasGrade ? 700 : 400, color: hasGrade ? gradeColor(cell.grade) : 'var(--fg-muted)', textDecoration: hasGrade ? 'none' : 'underline dotted' }}>
        {text}{cell?.isLate ? <span title={t('teacher.late')}> ({t('teacher.late')})</span> : null}
      </button>
    )
  }

  return (
    <TeacherPage title={t('shell.f_progress')} icon="eye" maxWidth={1200}>
      {classes.loading && <SkeletonList />}
      {classes.error && <ErrorBox message={classes.error} onRetry={classes.reload} />}

      {classes.data && classList.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('teacher.noClassesProgress')}</div>
      )}

      {classList.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 0, flex: '1 1 10rem' }}>
            <label style={labelStyle} htmlFor="gb-class">{t('teacher.class')}</label>
            <select id="gb-class" style={glassInput} value={classId} onChange={e => changeClass(e.target.value)}>
              {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {data && data.subjects.length > 1 && (
            <div style={{ minWidth: 0, flex: '1 1 10rem' }}>
              <label style={labelStyle} htmlFor="gb-subject">{t('teacher.subject')}</label>
              <select id="gb-subject" style={glassInput} value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">{t('student.allSubjects')}</option>
                {data.subjects.map(sj => <option key={sj} value={sj}>{subjectLabel(sj, t)}</option>)}
              </select>
            </div>
          )}
          <div style={{ minWidth: 0, flex: '0 1 9.5rem' }}>
            <label style={labelStyle} htmlFor="gb-threshold">{t('teacher.flagBelow')}</label>
            <input id="gb-threshold" style={glassInput} type="number" min="1" max="100" inputMode="numeric" value={threshold}
              onChange={e => { setThreshold(e.target.value); setThresholdNote('') }} />
            {thresholdNote && <div role="status" style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.25rem' }}>{thresholdNote}</div>}
          </div>
          <button onClick={exportCsv} disabled={exporting || !data} style={{ ...ghostBtn, opacity: exporting ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="download" />{exporting ? t('teacher.exporting') : t('teacher.downloadCsv')}
          </button>
        </div>
      )}

      {book.loading && classId && !data && <SkeletonList />}
      {book.error && <ErrorBox message={book.error} onRetry={book.reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9rem), 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            <div style={{ ...glassCard, padding: 'var(--sp-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{pct(classAvg)}</div>
              <div style={muted}>{t('teacher.classAverage')}{classAvg !== null ? ` · ${levelWord(classAvg)}` : ''}</div>
            </div>
            <div style={{ ...glassCard, padding: 'var(--sp-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{flagged}</div>
              <div style={muted}>{t('teacher.belowN', { n: limit })}</div>
            </div>
            <div style={{ ...glassCard, padding: 'var(--sp-3)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{visible.length}</div>
              <div style={muted}>{t('teacher.assignments')}</div>
            </div>
          </div>

          {students.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center' }}>{t('teacher.noStudentsInClass')}</div>
          ) : visible.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center' }}>{t(subject ? 'teacher.noAssignmentsSubject' : 'teacher.noAssignmentsYet', { subject: subjectLabel(subject, t) })}</div>
          ) : narrow ? (
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              {students.map(s => {
                const avg = avgOf(s)
                const isFlagged = avg !== null && avg < limit
                return (
                  <div key={s.id} style={{ ...panel, borderColor: isFlagged ? 'var(--fg)' : undefined, borderWidth: isFlagged ? 2 : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
                      <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{s.name}</strong>
                      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{pct(avg)}</span>
                    </div>
                    {avg !== null && <div style={muted}>{levelWord(avg)}{isFlagged ? ` · ${t('teacher.belowN', { n: limit })}` : ''}</div>}
                    <div style={{ display: 'grid', gap: '0.35rem', marginTop: 'var(--sp-2)' }}>
                      {visible.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                          <span style={{ ...muted, minWidth: 0, overflowWrap: 'anywhere' }}>{a.title}</span>
                          <Cell s={s} a={a} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ ...glassCard, padding: 0, overflowX: 'auto', maxWidth: '100%' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, ...stickyCol, minWidth: '9rem' }}>{t('teacher.student')}</th>
                    {visible.map(a => (
                      <th key={a.id} style={th} title={`${a.title} (${subjectLabel(a.subject, t)})`}>
                        <div style={{ color: 'var(--fg)', maxWidth: '7.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontWeight: 400, fontSize: 'var(--fs-xs)' }}>{subjectLabel(a.subject, t)}</div>
                      </th>
                    ))}
                    <th style={{ ...th, color: 'var(--fg)' }}>{subject ? t('teacher.subjectAvg', { subject: subjectLabel(subject, t) }) : t('teacher.average')}</th>
                    {showSubjectCols && data.subjects.map(sj => <th key={sj} style={th}>{t('teacher.subjectAvg', { subject: subjectLabel(sj, t) })}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const avg = avgOf(s)
                    const isFlagged = avg !== null && avg < limit
                    return (
                      <tr key={s.id} style={{ background: isFlagged ? 'var(--surface-2)' : undefined }}>
                        <td style={{ ...td, ...stickyCol, fontWeight: 600 }}>{s.name}{isFlagged && <span style={{ ...muted, fontWeight: 400 }}> · {t('teacher.flagged')}</span>}</td>
                        {visible.map(a => <td key={a.id} style={td}><Cell s={s} a={a} /></td>)}
                        <td style={{ ...td, fontWeight: 700 }}>{pct(avg)}</td>
                        {showSubjectCols && data.subjects.map(sj => <td key={sj} style={{ ...td, color: gradeColor(s.bySubject[sj]) }}>{pct(s.bySubject[sj])}</td>)}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...td, ...stickyCol, ...muted, fontWeight: 600 }}>{t('teacher.classAverage')}</td>
                    {visible.map(a => <td key={a.id} style={{ ...td, color: gradeColor(data.assignmentAverages[a.id]) }}>{pct(data.assignmentAverages[a.id])}</td>)}
                    <td style={{ ...td, fontWeight: 700 }}>{pct(classAvg)}</td>
                    {showSubjectCols && data.subjects.map(sj => <td key={sj} style={td}>{pct(mean(students.map(s => s.bySubject[sj]).filter(a => a !== null)))}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-3)' }}>{t('teacher.clickCellHelp')}</p>
        </>
      )}
    </TeacherPage>
  )
}
