import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'
import SkeletonList from '../shared/Skeleton'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { fmtDuration } from '../tutor/tutorUi'
import { fmtDay } from '../student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'
import { glassInput } from '../../styles/glass'

const label = { display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: '0.35rem' }
const field = { minWidth: 0 }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: 'var(--sp-3)' }
const EMPTY = { classId: '', subject: '', title: '', date: '', startTime: '', durationMinutes: '', venue: '', totalMarks: '' }

// Create, edit and delete exams for a class and enter the marks. Uses the endpoints in api/routes/exams.js.
export default function ExamManager() {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/exams')
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState(null)         // null = closed, otherwise the fields (with id when editing)
  const [marksFor, setMarksFor] = useState(null) // the exam whose marks are open
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')

  const classes = data?.classes || []
  const canWrite = !!data?.canWrite
  const isPrincipal = data?.role === 'principal'
  const exams = (data?.exams || [])
    .filter(e => !filter || e.classId === filter)
    .sort((a, b) => (a.date + (a.startTime || '')).localeCompare(b.date + (b.startTime || '')))

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const openNew = () => {
    setFormError(''); setMarksFor(null)
    setForm({ ...EMPTY, classId: filter || (classes.length === 1 ? classes[0].id : '') })
  }
  const openEdit = (e) => {
    setFormError(''); setMarksFor(null)
    setForm({
      id: e.id, classId: e.classId || '', subject: e.subject, title: e.title, date: e.date,
      startTime: e.startTime || '', durationMinutes: e.durationMinutes ?? '', venue: e.venue || '', totalMarks: e.totalMarks ?? '',
    })
  }

  const save = async (ev) => {
    ev.preventDefault()
    if (!form.classId && !isPrincipal) return setFormError(t('teacher.errExamClass'))
    if (!form.subject.trim()) return setFormError(t('teacher.errExamSubject'))
    if (!form.title.trim()) return setFormError(t('teacher.errExamTitle'))
    if (!form.date) return setFormError(t('teacher.errExamDate'))
    setBusy(true); setFormError('')
    const body = {
      classId: form.classId || null, subject: form.subject.trim(), title: form.title.trim(), date: form.date,
      startTime: form.startTime || null,
      durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
      venue: form.venue.trim() || null,
      totalMarks: form.totalMarks === '' ? null : Number(form.totalMarks),
    }
    try {
      await apiFetch(form.id ? `/api/exams/${form.id}` : '/api/exams', { method: form.id ? 'PUT' : 'POST', body })
      setForm(null)
      await reload()
    } catch (err) {
      setFormError(err.message || t('common.genericError'))
    }
    setBusy(false)
  }

  const remove = async (id) => {
    setBusy(true); setActionError('')
    try {
      await apiFetch(`/api/exams/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      if (marksFor === id) setMarksFor(null)
      await reload()
    } catch (err) {
      setActionError(err.message || t('common.genericError'))
    }
    setBusy(false)
  }

  if (loading && !data) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <select aria-label={t('teacher.filterClass')} value={filter} onChange={e => setFilter(e.target.value)}
          style={{ ...glassInput, width: 'auto', flex: '1 1 12rem', minWidth: 0, maxWidth: '100%' }}>
          <option value="">{t('teacher.allClasses')}</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {canWrite && !form && (
          <button onClick={openNew} style={{ ...smallBtn, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="plus" />{t('teacher.newExam')}
          </button>
        )}
      </div>

      {!canWrite && <p style={{ ...muted, marginBottom: 'var(--sp-3)' }}>{t('teacher.verifyToSetExams')}</p>}
      {canWrite && classes.length === 0 && !isPrincipal && <p style={{ ...muted, marginBottom: 'var(--sp-3)' }}>{t('teacher.addClassFirst')}</p>}

      {form && (
        <form onSubmit={save} style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
          <h3 style={panelTitle}>{t(form.id ? 'teacher.editExam' : 'teacher.newExam')}</h3>
          <div style={grid}>
            <div style={field}>
              <label style={label} htmlFor="ex-class">{t('teacher.class')}</label>
              <select id="ex-class" value={form.classId} onChange={set('classId')} style={glassInput}>
                <option value="">{isPrincipal ? t('teacher.wholeSchool') : t('teacher.chooseClass')}</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-subject">{t('teacher.subject')}</label>
              <input id="ex-subject" value={form.subject} onChange={set('subject')} maxLength={60} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-title">{t('teacher.examTitle')}</label>
              <input id="ex-title" value={form.title} onChange={set('title')} maxLength={120} placeholder={t('teacher.examTitleExample')} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-date">{t('teacher.date')}</label>
              <input id="ex-date" type="date" value={form.date} onChange={set('date')} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-time">{t('teacher.startTime')}</label>
              <input id="ex-time" type="time" value={form.startTime} onChange={set('startTime')} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-dur">{t('teacher.durationMinutes')}</label>
              <input id="ex-dur" type="number" min="1" inputMode="numeric" value={form.durationMinutes} onChange={set('durationMinutes')} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-venue">{t('teacher.venue')}</label>
              <input id="ex-venue" value={form.venue} onChange={set('venue')} maxLength={100} style={glassInput} />
            </div>
            <div style={field}>
              <label style={label} htmlFor="ex-total">{t('teacher.totalMarks')}</label>
              <input id="ex-total" type="number" min="1" inputMode="numeric" value={form.totalMarks} onChange={set('totalMarks')} style={glassInput} />
            </div>
          </div>
          {formError && <p role="alert" style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}><Icon name="warning" style={{ marginTop: '0.15em' }} /><span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{formError}</span></p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
            <button type="submit" disabled={busy} style={smallBtn}>{busy ? t('settings.saving') : t('common.save')}</button>
            <button type="button" onClick={() => setForm(null)} style={ghostBtn}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {actionError && <ErrorBox message={actionError} />}

      {exams.length === 0 ? (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('teacher.noExams')}</div>
      ) : exams.map(e => (
        <div key={e.id} style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
              <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{subjectLabel(e.subject, t)}: {e.title}</div>
              <div style={{ ...muted, overflowWrap: 'anywhere' }}>
                {[
                  fmtDay(e.date), e.startTime || '', e.durationMinutes ? fmtDuration(e.durationMinutes) : '',
                  e.venue ? t('teacher.venueAt', { venue: e.venue }) : '', e.totalMarks ? t('teacher.outOf', { n: e.totalMarks }) : '',
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <Chip color="var(--fg-muted)">{e.className || t('teacher.wholeSchool')}</Chip>
              <Chip color="var(--fg-muted)">{t('teacher.marksEntered', { n: e.resultCount })}</Chip>
            </div>
          </div>

          {e.canEdit && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: 'var(--sp-3)' }}>
              {confirmDelete === e.id ? (
                <>
                  <span style={{ fontSize: 'var(--fs-sm)', minWidth: 0 }}>{t('teacher.confirmDeleteExam')}</span>
                  <button disabled={busy} onClick={() => remove(e.id)} style={smallBtn}>{t('teacher.yesDelete')}</button>
                  <button onClick={() => setConfirmDelete(null)} style={ghostBtn}>{t('common.cancel')}</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setForm(null); setMarksFor(marksFor === e.id ? null : e.id) }} style={smallBtn}>
                    {t(marksFor === e.id ? 'teacher.hideMarks' : 'teacher.enterMarks')}
                  </button>
                  <button onClick={() => openEdit(e)} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="pencil" />{t('common.edit')}</button>
                  <button onClick={() => setConfirmDelete(e.id)} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="trash" />{t('common.delete')}</button>
                </>
              )}
            </div>
          )}

          {marksFor === e.id && <MarksEditor exam={e} onSaved={reload} />}
        </div>
      ))}
    </div>
  )
}

// One row per student of the class. An empty box means no mark yet.
function MarksEditor({ exam, onSaved }) {
  const t = useT()
  const { data, loading, error, reload } = useApiData(`/api/exams/${exam.id}/results`)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (data) setRows(data.students.map(s => ({ studentId: s.studentId, name: s.name, mark: s.mark ?? '', comment: s.comment || '' })))
  }, [data])

  const change = (id, k, v) => { setMsg(''); setRows(rs => rs.map(r => (r.studentId === id ? { ...r, [k]: v } : r))) }

  const save = async () => {
    const max = exam.totalMarks
    for (const r of rows) {
      if (r.mark === '') continue
      const n = Number(r.mark)
      if (!Number.isFinite(n) || n < 0 || (max && n > max)) return setErr(t('teacher.errMark', { name: r.name, max: max || '' }))
    }
    setBusy(true); setErr(''); setMsg('')
    try {
      await apiFetch(`/api/exams/${exam.id}/results`, {
        method: 'PUT',
        body: { results: rows.map(r => ({ studentId: r.studentId, mark: r.mark === '' ? null : Number(r.mark), comment: r.comment.trim() || null })) },
      })
      setMsg(t('teacher.marksSaved'))
      onSaved()
      reload()
    } catch (e) {
      setErr(e.message || t('common.genericError'))
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border)' }}>
      {loading && !data ? <p style={muted}>{t('common.loading')}...</p> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? (
        <p style={muted}>{t('teacher.noStudentsInClass')}</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {rows.map(r => (
              <div key={r.studentId} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.4rem' }}>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.name}</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input type="number" min="0" max={exam.totalMarks || undefined} step="any" inputMode="decimal" value={r.mark}
                    onChange={e => change(r.studentId, 'mark', e.target.value)} aria-label={t('teacher.markFor', { name: r.name })}
                    placeholder={exam.totalMarks ? `/ ${exam.totalMarks}` : t('teacher.mark')}
                    style={{ ...glassInput, width: '7rem', flex: '0 0 auto', minWidth: 0 }} />
                  <input value={r.comment} maxLength={300} onChange={e => change(r.studentId, 'comment', e.target.value)}
                    aria-label={t('teacher.commentFor', { name: r.name })} placeholder={t('teacher.commentOptional')}
                    style={{ ...glassInput, flex: '1 1 10rem', minWidth: 0 }} />
                </div>
              </div>
            ))}
          </div>
          {err && <p role="alert" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)', overflowWrap: 'anywhere' }}>{err}</p>}
          {msg && <p role="status" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>{msg}</p>}
          <button onClick={save} disabled={busy} style={{ ...smallBtn, marginTop: 'var(--sp-3)' }}>{busy ? t('settings.saving') : t('teacher.saveMarks')}</button>
        </>
      )}
    </div>
  )
}
