import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { fmtDate, gradeBarFill, gradeLevelKey, statusColor, statusLabel } from '../../components/student/studentUtils'
import { ACCEPT, fmtSize, kindOf } from '../../components/resources/resourceUtils'
import { openAssignmentFile, uploadAssignmentFile } from '../../components/assignments/assignmentFiles'
import { ErrorBox, ghostBtn, muted, panel as basePanel } from '../../components/parent/parentUi'
import { glassBtn, glassInput } from '../../styles/glass'
import { useT } from '../../i18n'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'

const panel = { ...basePanel, marginBottom: 'var(--sp-4)' }
const label = { display: 'block', color: 'var(--fg)', fontSize: 'var(--fs-sm)', marginBottom: '0.4rem', fontWeight: 600 }

// Live countdown to the due date. serverOffset lines the clock up with the server's time.
function useNow(offset) {
  const [now, setNow] = useState(() => Date.now() + offset)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000)
    return () => clearInterval(t)
  }, [offset])
  return now
}

function countdown(dueIso, now) {
  const diff = new Date(dueIso).getTime() - now
  const abs = Math.abs(diff)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  return { late: diff < 0, d, h, m, s, urgent: diff >= 0 && diff < 86400000 }
}

// "2d 4h 10m" in the user's language (the unit letters are in the translations)
function countdownText(cd, t) {
  if (cd.d > 0) return t('student.cdDays', { d: cd.d, h: cd.h, m: cd.m })
  if (cd.h > 0) return t('student.cdHours', { h: cd.h, m: cd.m, s: cd.s })
  return t('student.cdMinutes', { m: cd.m, s: cd.s })
}

function FileChip({ name, size, mime, onOpen }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const open = async () => {
    setBusy(true); setErr('')
    try { await onOpen() } catch (e) { setErr(e.message || t('student.couldNotOpenFile')) }
    setBusy(false)
  }
  return (
    <div style={{ marginBottom: '0.4rem', maxWidth: '100%' }}>
      <button onClick={open} disabled={busy} style={{ ...ghostBtn, display: 'inline-flex', gap: '0.5rem', alignItems: 'center', textAlign: 'start', maxWidth: '100%' }}>
        <Icon name={kindOf(mime) === 'image' ? 'image' : 'file'} />
        <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{busy ? t('student.opening') : name}</span>
        {size ? <span style={{ ...muted, fontSize: 'var(--fs-xs)' }}>{fmtSize(size)}</span> : null}
        <Icon name="download" />
      </button>
      {err && <div role="alert" style={{ fontSize: 'var(--fs-sm)', marginTop: '0.25rem' }}>{err}</div>}
    </div>
  )
}

function HandIn({ id, data, onDone }) {
  const t = useT()
  const { submission } = data
  const [content, setContent] = useState(submission?.content || '')
  const [file, setFile] = useState(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const hasOldFile = !!submission?.fileName && !removeFile && !file
  const resubmitting = !!submission

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setRemoveFile(false); setError('') }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim() && !file && !hasOldFile) return setError(t('student.errWriteOrAttach'))
    setSaving(true); setError('')
    try {
      let uploaded = null
      if (file) uploaded = await uploadAssignmentFile(`/api/student/assignments/${id}/upload-url`, file)
      await apiFetch(`/api/student/assignments/${id}/submit`, {
        method: 'POST',
        body: { content, path: uploaded?.path, fileName: uploaded?.name, removeFile: removeFile && !file },
      })
      onDone()
    } catch (err) {
      setError(err.message || t('student.errHandIn'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={panel}>
      <h3 style={{ marginBottom: '0.75rem', fontSize: 'var(--fs-lg)' }}>{t(resubmitting ? 'student.handInAgain' : 'student.yourWork')}</h3>
      <label htmlFor="sub-text" style={label}>{t('student.answerLabel')}</label>
      <textarea id="sub-text" value={content} onChange={e => setContent(e.target.value)} maxLength={10000} disabled={saving}
        placeholder={t('student.answerPlaceholder')}
        style={{ ...glassInput, minHeight: '9rem', resize: 'vertical', marginBottom: '1rem' }} />

      <label htmlFor="sub-file" style={label}>{t('student.fileLabel')}</label>
      <input id="sub-file" ref={fileRef} type="file" accept={ACCEPT} onChange={pick} disabled={saving} style={{ color: 'var(--fg)', fontSize: 'var(--fs-sm)', maxWidth: '100%' }} />
      {file && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{t('student.readyToUpload', { name: file.name, size: fmtSize(file.size) })}</div>}
      {hasOldFile && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...muted, overflowWrap: 'anywhere' }}>{t('student.currentFile', { name: submission.fileName })}</span>
          <button type="button" onClick={() => setRemoveFile(true)} style={ghostBtn}>{t('student.removeFile')}</button>
        </div>
      )}
      {removeFile && <div style={{ ...muted, marginTop: '0.4rem' }}>{t('student.fileWillBeRemoved')}</div>}

      {data.assignment.dueDate && new Date(data.assignment.dueDate).getTime() < Date.now() && submission?.status !== 'Reopened' && (
        <p style={{ fontSize: 'var(--fs-sm)', marginTop: '0.9rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}><Icon name="warning" style={{ marginTop: '0.15em' }} /><span style={{ minWidth: 0 }}>{t('student.pastDueWarning')}</span></p>
      )}
      {error && <p role="alert" style={{ fontSize: 'var(--fs-sm)', marginTop: '0.75rem', overflowWrap: 'anywhere' }}>{error}</p>}
      <button type="submit" disabled={saving} style={{ ...glassBtn, width: 'auto', marginTop: '1rem', opacity: saving ? 0.7 : 1 }}>
        {saving ? t('student.handingIn') : t(resubmitting ? 'student.handInAgain' : 'student.handIn')}
      </button>
    </form>
  )
}

export default function StudentAssignment() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData(`/api/student/assignments/${id}`)
  const [notice, setNotice] = useState('')
  const offset = data ? new Date(data.serverTime).getTime() - Date.now() : 0
  const now = useNow(offset)

  const a = data?.assignment
  const sub = data?.submission
  const cd = a?.dueDate ? countdown(a.dueDate, now) : null

  return (
    <StudentPage title={a ? a.title : t('student.assignment')} icon="terms" backPath="/student/dashboard" maxWidth={820}>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <button onClick={() => navigate('/student/academics?tab=homework')} style={ghostBtn}>{t('student.backToHomework')}</button>
      </div>

      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {notice && <p role="status" style={{ fontSize: 'var(--fs-md)', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}><Icon name="check" />{notice}</p>}

      {data && (
        <>
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ ...muted, minWidth: 0, overflowWrap: 'anywhere' }}>{a.className}{a.dueDate ? ` · ${t('student.dueOn', { date: fmtDate(a.dueDate) })}` : ` · ${t('student.noDueDate')}`}</div>
              <span style={{ color: statusColor(sub ? sub.status : (cd?.late ? 'Overdue' : 'Not submitted')), fontWeight: 700 }}>
                {statusLabel(sub ? sub.status : (cd?.late ? 'Overdue' : 'Not submitted'), t)}
              </span>
            </div>

            {cd && !(sub && sub.status !== 'Reopened') && (
              <div style={{ marginTop: '0.9rem' }}>
                <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }} aria-live="off">
                  {cd.late ? t('student.cdOverdue', { time: countdownText(cd, t) }) : t('student.cdLeft', { time: countdownText(cd, t) })}
                  {cd.urgent && <span style={{ ...muted, marginInlineStart: '0.5rem', fontWeight: 400 }}>{t('student.dueSoon')}</span>}
                </div>
              </div>
            )}

            {a.description && <div style={{ marginTop: '0.9rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{a.description}</div>}

            {a.attachments.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ ...muted, marginBottom: '0.4rem' }}>{t('student.filesFromTeacher')}</div>
                {a.attachments.map(f => (
                  <FileChip key={f.index} name={f.name} size={f.size} mime={f.mime} onOpen={() => openAssignmentFile(`/api/assignments/${a.id}/attachments/${f.index}/link`)} />
                ))}
              </div>
            )}
          </div>

          {sub && (
            <div style={panel}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: 'var(--fs-lg)' }}>
                {t(sub.status === 'Reopened' ? 'student.sentBack' : 'student.whatYouHandedIn')}
              </h3>
              <div style={{ ...muted, marginBottom: '0.6rem' }}>
                {t(sub.status === 'Reopened' ? 'student.lastVersionHandedIn' : 'student.handedIn', { date: fmtDate(sub.submittedAt) })}{sub.isLate ? ` · ${t('student.status_late')}` : ''}
              </div>
              {sub.content && <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '0.75rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{sub.content}</div>}
              {sub.fileName && <FileChip name={sub.fileName} size={sub.fileSize} mime={sub.mimeType} onOpen={() => openAssignmentFile(`/api/student/assignments/${a.id}/submission/file-link`)} />}
              {sub.grade !== null && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={muted}>{t('student.grade')} </span>
                  <strong style={{ fontSize: 'var(--fs-xl)' }}>{sub.grade}%</strong>
                  {gradeLevelKey(sub.grade) && <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{t(gradeLevelKey(sub.grade))}</span>}
                  <div role="presentation" style={{ height: '0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', overflow: 'hidden', marginTop: '0.4rem' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, sub.grade))}%`, height: '100%', background: gradeBarFill(sub.grade) }} />
                  </div>
                </div>
              )}
              {sub.feedback && (
                <div style={{ marginTop: '0.6rem' }}>
                  <span style={{ fontWeight: 700 }}>{t(sub.status === 'Reopened' ? 'student.teacherAskedFix' : 'student.teacherFeedback')}: </span>
                  <span style={{ overflowWrap: 'anywhere' }}>{sub.feedback}</span>
                </div>
              )}
            </div>
          )}

          {!data.isVerified && <div style={{ ...panel, ...muted }}>{t('student.needsVerifiedToHandIn')}</div>}
          {data.isVerified && data.canSubmit && (
            <HandIn key={sub?.submittedAt || 'new'} id={id} data={data} onDone={() => { setNotice(t('student.workHandedIn')); reload() }} />
          )}
          {data.isVerified && !data.canSubmit && (
            <div style={{ ...panel, ...muted }}>{t('student.gradedLocked')}</div>
          )}
        </>
      )}
    </StudentPage>
  )
}
