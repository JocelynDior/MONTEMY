import React, { useEffect, useRef, useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn, Chip } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { useT } from '../../i18n'
import { subjectLabel } from '../../config/studentOptions'
import { fmtDate, dueIn, statusColor, statusLabel } from '../../components/student/studentUtils'
import { glassBtn, glassCard, glassInput } from '../../styles/glass'
import ExamManager from '../../components/teacher/ExamManager'

/* ------------------------------------------------------------------ icons */
const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

/* ------------------------------------------------------------------ helpers */
function FileButton({ url, label }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontSize: 'var(--fs-sm)' }}
    >
      <FileIcon /> {label}
    </a>
  )
}

/* ------------------------------------------------------------------ AssignmentForm */
function AssignmentForm({ classes, subjects, initial, onSave, onCancel, t }) {
  const [form, setForm] = useState({
    classId: initial?.classId || '',
    subject: initial?.subject || '',
    title: initial?.title || '',
    description: initial?.description || '',
    dueDate: initial?.dueDate || '',
    totalMarks: initial?.totalMarks || '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const fileRef = useRef()

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.classId) return setErr(t('teacher.errAssignClass'))
    if (!form.subject) return setErr(t('teacher.errAssignSubject'))
    if (!form.title.trim()) return setErr(t('teacher.errAssignTitle'))
    setSaving(true); setErr(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v))
      if (file) fd.append('file', file)
      const res = initial?.id
        ? await apiFetch(`/api/teacher/assignments/${initial.id}`, { method: 'PUT', body: fd })
        : await apiFetch('/api/teacher/assignments', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      onSave()
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  const inp = { ...glassInput, width: '100%', boxSizing: 'border-box', marginBottom: 'var(--sp-2)' }
  const lbl = { display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--fg-muted)' }

  return (
    <form onSubmit={submit} style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      {err && <ErrorBox message={err} />}
      <label style={lbl}>{t('teacher.class')}
        <select value={form.classId} onChange={set('classId')} style={inp} required>
          <option value="">{t('teacher.chooseClass')}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label style={lbl}>{t('teacher.subject')}
        <select value={form.subject} onChange={set('subject')} style={inp} required>
          <option value="">{t('common.select')}</option>
          {subjects.map((s) => <option key={s.value} value={s.value}>{subjectLabel(s.value, t)}</option>)}
        </select>
      </label>
      <label style={lbl}>{t('teacher.assignTitle')}
        <input value={form.title} onChange={set('title')} style={inp} placeholder={t('teacher.assignTitleExample')} maxLength={120} required />
      </label>
      <label style={lbl}>{t('teacher.description')}
        <textarea value={form.description} onChange={set('description')} style={{ ...inp, minHeight: '5rem', resize: 'vertical' }} maxLength={2000} />
      </label>
      <label style={lbl}>{t('teacher.dueDate')}
        <input type="date" value={form.dueDate} onChange={set('dueDate')} style={inp} />
      </label>
      <label style={lbl}>{t('teacher.totalMarks')}
        <input type="number" value={form.totalMarks} onChange={set('totalMarks')} style={inp} min={1} max={999} />
      </label>
      <label style={lbl}>{t('teacher.attachFile')}
        <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'block', marginTop: '0.3rem' }} />
      </label>
      {initial?.fileUrl && <FileButton url={initial.fileUrl} label={t('teacher.currentFile')} />}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
        <button type="submit" disabled={saving} style={glassBtn}>{saving ? t('settings.saving') : t('common.save')}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ SubmissionRow */
function SubmissionRow({ sub, totalMarks, onUpdated, t }) {
  const [open, setOpen] = useState(false)
  const [grade, setGrade] = useState(sub.grade ?? '')
  const [feedback, setFeedback] = useState(sub.feedback || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function saveGrade(e) {
    e.preventDefault()
    setSaving(true); setErr(null)
    try {
      const res = await apiFetch(`/api/teacher/submissions/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: grade === '' ? null : Number(grade), feedback }),
      })
      if (!res.ok) throw new Error(await res.text())
      onUpdated()
      setOpen(false)
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  async function reopen() {
    try {
      const res = await apiFetch(`/api/teacher/submissions/${sub.id}/reopen`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      onUpdated()
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    }
  }

  const inp = { ...glassInput, width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', fontWeight: 500 }}>{sub.studentName}</span>
        {sub.grade !== null && sub.grade !== undefined && (
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>
            {sub.grade}{totalMarks ? `/${totalMarks}` : ''}
          </span>
        )}
        <Chip label={sub.status} color={statusColor(sub.status)} />
        {sub.fileUrl && (
          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg-muted)' }} aria-label={t('teacher.downloadSubmission')}>
            <DownloadIcon />
          </a>
        )}
        <button style={ghostBtn} onClick={() => setOpen((o) => !o)} aria-label={t('teacher.gradeLabel')}>
          <PencilIcon />
        </button>
        {sub.status === 'graded' && (
          <button style={ghostBtn} onClick={reopen} aria-label={t('teacher.reopen')}>
            <Icon name="refresh" size={14} />
          </button>
        )}
      </div>
      {sub.submittedAt && (
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
          {t('teacher.submittedAt')} {fmtDate(sub.submittedAt)}
          {sub.history?.length > 0 && <span style={{ marginInlineStart: 'var(--sp-2)' }}>{t('teacher.resubmissions', { n: sub.history.length })}</span>}
        </div>
      )}
      {open && (
        <form onSubmit={saveGrade} style={{ marginTop: 'var(--sp-2)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          {err && <ErrorBox message={err} />}
          <input
            type="number"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder={t('teacher.mark')}
            min={0}
            max={totalMarks || 999}
            style={inp}
          />
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('teacher.feedbackOptional')}
            style={{ ...inp, minHeight: '3.5rem', resize: 'vertical' }}
            maxLength={1000}
          />
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button type="submit" disabled={saving} style={glassBtn}>{saving ? t('settings.saving') : t('common.save')}</button>
            <button type="button" onClick={() => setOpen(false)} style={ghostBtn}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ SubmissionsPanel */
function SubmissionsPanel({ assignment, onClose, t }) {
  const { data, loading, error, reload } = useApiData(`/api/teacher/submissions?assignmentId=${assignment.id}`)

  return (
    <div style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--fs-lg)' }}>{t('teacher.submissionsFor', { title: assignment.title })}</span>
        <button style={ghostBtn} onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
      </div>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        data.submissions?.length
          ? data.submissions.map((s) => (
              <SubmissionRow key={s.id} sub={s} totalMarks={assignment.totalMarks} onUpdated={reload} t={t} />
            ))
          : <p style={muted}>{t('teacher.noSubmissions')}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ AssignmentCard */
function AssignmentCard({ item, onEdit, onDelete, onViewSubs, expanded, t }) {
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, overflowWrap: 'break-word' }}>{item.title}</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
            {item.className} · {subjectLabel(item.subject, t)}
            {item.dueDate && <span> · {dueIn(item.dueDate, t)}</span>}
            {item.totalMarks && <span> · {t('teacher.outOf', { n: item.totalMarks })}</span>}
          </div>
          {item.description && (
            <div style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)', color: 'var(--fg)', overflowWrap: 'break-word' }}>{item.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexShrink: 0 }}>
          {item.fileUrl && (
            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center' }} aria-label={t('common.download')}>
              <DownloadIcon />
            </a>
          )}
          <button style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center' }} onClick={() => onEdit(item)} aria-label={t('common.edit')}>
            <PencilIcon />
          </button>
          <button
            style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', color: confirmDel ? 'var(--fg)' : undefined }}
            onClick={() => confirmDel ? onDelete(item.id) : setConfirmDel(true)}
            aria-label={confirmDel ? t('common.confirm') : t('common.delete')}
          >
            {confirmDel ? <Icon name="check" size={14} /> : <TrashIcon />}
          </button>
          {confirmDel && (
            <button style={ghostBtn} onClick={() => setConfirmDel(false)} aria-label={t('common.cancel')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>
      <div style={{ marginTop: 'var(--sp-2)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)' }}>
          {t('teacher.submittedCount', { n: item.submittedCount ?? 0, total: item.totalStudents ?? 0 })}
        </span>
        <button style={{ ...smallBtn, fontSize: 'var(--fs-xs)' }} onClick={() => onViewSubs(item)}>
          {expanded ? t('teacher.hideSubmissions') : t('teacher.viewSubmissions')}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ AssignmentsTab */
function AssignmentsTab({ t }) {
  const { data, loading, error, reload } = useApiData('/api/teacher/assignments')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewSubs, setViewSubs] = useState(null)

  async function deleteAssignment(id) {
    try {
      const res = await apiFetch(`/api/teacher/assignments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch {
      /* silently reload */
      reload()
    }
  }

  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  const classes = data?.classes || []
  const assignments = data?.assignments || []
  const subjects = data?.subjects || []

  return (
    <>
      {data?.canWrite && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => { setCreating(true); setEditing(null) }}
        >
          <Icon name="plus" size={14} /> {t('teacher.newAssignment')}
        </button>
      )}

      {(creating || editing) && (
        <AssignmentForm
          classes={classes}
          subjects={subjects}
          initial={editing}
          onSave={() => { setCreating(false); setEditing(null); reload() }}
          onCancel={() => { setCreating(false); setEditing(null) }}
          t={t}
        />
      )}

      {assignments.length === 0 && !creating && (
        <p style={muted}>{t('teacher.noAssignments')}</p>
      )}

      {assignments.map((item) => (
        <React.Fragment key={item.id}>
          <AssignmentCard
            item={item}
            onEdit={(a) => { setEditing(a); setCreating(false) }}
            onDelete={deleteAssignment}
            onViewSubs={(a) => setViewSubs(viewSubs?.id === a.id ? null : a)}
            expanded={viewSubs?.id === item.id}
            t={t}
          />
          {viewSubs?.id === item.id && (
            <SubmissionsPanel assignment={viewSubs} onClose={() => setViewSubs(null)} t={t} />
          )}
        </React.Fragment>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ main */
export default function TeacherAssignments() {
  const t = useT('teacher')
  const [tab, setTab] = useState('assignments')

  const tabs = [
    { key: 'assignments', label: t('teacher.tabAssignments') },
    { key: 'exams', label: t('shell.f_exams') },
  ]

  return (
    <TeacherPage title={t('teacher.pageTitle')}>
      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />
      <div style={{ marginTop: 'var(--sp-4)' }}>
        {tab === 'assignments' && <AssignmentsTab t={t} />}
        {tab === 'exams' && <ExamManager />}
      </div>
    </TeacherPage>
  )
}
