import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { fmtDate, gradeColor, statusColor } from '../../components/student/studentUtils'
import { ACCEPT, fmtSize, iconFor } from '../../components/resources/resourceUtils'
import { openAssignmentFile, uploadAssignmentFile } from '../../components/assignments/assignmentFiles'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const ghostBtn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }

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
  const parts = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
  return { late: diff < 0, text: parts, urgent: diff >= 0 && diff < 86400000 }
}

function FileChip({ name, size, mime, onOpen }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const open = async () => {
    setBusy(true); setErr('')
    try { await onOpen() } catch (e) { setErr(e.message || 'Could not open the file.') }
    setBusy(false)
  }
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <button onClick={open} disabled={busy} style={{ ...ghostBtn, display: 'inline-flex', gap: '0.5rem', alignItems: 'center', textAlign: 'left' }}>
        <span aria-hidden="true">{iconFor(mime)}</span>
        <span style={{ overflowWrap: 'anywhere' }}>{busy ? 'Opening...' : name}</span>
        {size ? <span style={{ ...muted, fontSize: '0.75rem' }}>{fmtSize(size)}</span> : null}
      </button>
      {err && <div role="alert" style={{ color: '#ffb3b3', fontSize: '0.85rem', marginTop: '0.25rem' }}>{err}</div>}
    </div>
  )
}

function HandIn({ id, data, onDone }) {
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
    if (!content.trim() && !file && !hasOldFile) return setError('Write your answer or attach a file before handing in.')
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
      setError(err.message || 'Could not hand in your work. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={panel}>
      <h3 style={{ color: C.turquoise, marginBottom: '0.75rem' }}>{resubmitting ? 'Hand in again' : 'Your work'}</h3>
      <label htmlFor="sub-text" style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Answer (optional if you attach a file)</label>
      <textarea id="sub-text" value={content} onChange={e => setContent(e.target.value)} maxLength={10000} disabled={saving}
        placeholder="Type your answer here"
        style={{ ...glassInput, minHeight: '140px', resize: 'vertical', marginBottom: '1rem' }} />

      <label htmlFor="sub-file" style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>File (PDF, Word, PowerPoint or image, up to 10MB)</label>
      <input id="sub-file" ref={fileRef} type="file" accept={ACCEPT} onChange={pick} disabled={saving} style={{ color: 'white', fontSize: '0.9rem' }} />
      {file && <div style={{ ...muted, marginTop: '0.4rem' }}>Ready to upload: {file.name} ({fmtSize(file.size)})</div>}
      {hasOldFile && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={muted}>Current file: {submission.fileName}</span>
          <button type="button" onClick={() => setRemoveFile(true)} style={{ ...ghostBtn, color: '#ffb3b3' }}>Remove file</button>
        </div>
      )}
      {removeFile && <div style={{ ...muted, marginTop: '0.4rem' }}>The current file will be removed when you hand in.</div>}

      {data.assignment.dueDate && new Date(data.assignment.dueDate).getTime() < Date.now() && submission?.status !== 'Reopened' && (
        <p style={{ color: '#ffb36b', fontSize: '0.9rem', marginTop: '0.9rem' }}>The due date has passed, so this will be marked late.</p>
      )}
      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      <button type="submit" disabled={saving} style={{ ...glassBtn, width: 'auto', marginTop: '1rem', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Handing in...' : resubmitting ? 'Hand in again' : 'Hand in'}
      </button>
    </form>
  )
}

export default function StudentAssignment() {
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
    <StudentPage title={a ? a.title : 'Assignment'} icon="📝" backPath="/student/dashboard" maxWidth={820}>
      <div style={{ marginBottom: '1.25rem' }}>
        <button onClick={() => navigate('/student/academics')} style={ghostBtn}>Back to homework</button>
      </div>

      {loading && !data && <SkeletonList />}
      {error && <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}><p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p><button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button></div>}
      {notice && <p role="status" style={{ color: '#7CFC9A', fontSize: '0.95rem', marginBottom: '1rem' }}>{notice}</p>}

      {data && (
        <>
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={muted}>{a.className}{a.dueDate ? ` · Due ${fmtDate(a.dueDate)}` : ' · No due date'}</div>
              <span style={{ color: statusColor(sub ? sub.status : (cd?.late ? 'Overdue' : 'Not submitted')), fontWeight: 700 }}>
                {sub ? sub.status : (cd?.late ? 'Overdue' : 'Not submitted')}
              </span>
            </div>

            {cd && !(sub && sub.status !== 'Reopened') && (
              <div style={{ marginTop: '0.9rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: cd.late ? '#ff8f8f' : cd.urgent ? '#ffb36b' : C.turquoise }} aria-live="off">
                  {cd.late ? `${cd.text} overdue` : `${cd.text} left`}
                </div>
              </div>
            )}

            {a.description && <div style={{ marginTop: '0.9rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{a.description}</div>}

            {a.attachments.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ ...muted, marginBottom: '0.4rem' }}>Files from your teacher</div>
                {a.attachments.map(f => (
                  <FileChip key={f.index} name={f.name} size={f.size} mime={f.mime} onOpen={() => openAssignmentFile(`/api/assignments/${a.id}/attachments/${f.index}/link`)} />
                ))}
              </div>
            )}
          </div>

          {sub && (
            <div style={panel}>
              <h3 style={{ color: C.turquoise, marginBottom: '0.5rem' }}>
                {sub.status === 'Reopened' ? 'Sent back for revision' : 'What you handed in'}
              </h3>
              <div style={{ ...muted, marginBottom: '0.6rem' }}>
                {sub.status === 'Reopened' ? 'Your last version, handed in' : 'Handed in'} {fmtDate(sub.submittedAt)}{sub.isLate ? ' · Late' : ''}
              </div>
              {sub.content && <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{sub.content}</div>}
              {sub.fileName && <FileChip name={sub.fileName} size={sub.fileSize} mime={sub.mimeType} onOpen={() => openAssignmentFile(`/api/student/assignments/${a.id}/submission/file-link`)} />}
              {sub.grade !== null && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span style={muted}>Grade </span>
                  <strong style={{ color: gradeColor(sub.grade), fontSize: '1.4rem' }}>{sub.grade}%</strong>
                </div>
              )}
              {sub.feedback && (
                <div style={{ marginTop: '0.6rem' }}>
                  <span style={{ color: C.turquoise }}>{sub.status === 'Reopened' ? 'Your teacher asked you to fix: ' : 'Teacher feedback: '}</span>
                  <span style={{ overflowWrap: 'anywhere' }}>{sub.feedback}</span>
                </div>
              )}
            </div>
          )}

          {!data.isVerified && <div style={{ ...panel, ...muted }}>Your account needs to be verified by an admin before you can hand in work.</div>}
          {data.isVerified && data.canSubmit && (
            <HandIn key={sub?.submittedAt || 'new'} id={id} data={data} onDone={() => { setNotice('Your work was handed in.'); reload() }} />
          )}
          {data.isVerified && !data.canSubmit && (
            <div style={{ ...panel, ...muted }}>This work has been graded. If you need to change it, ask your teacher to reopen it.</div>
          )}
        </>
      )}
    </StudentPage>
  )
}
