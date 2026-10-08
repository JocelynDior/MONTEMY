import React, { useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { dueIn, fmtDate, gradeColor, statusColor } from '../../components/student/studentUtils'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }
const ghostBtn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }
const smallBtn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }
const isLink = (u) => typeof u === 'string' && /^https?:\/\//i.test(u)

// ISO date -> value for <input type="datetime-local">
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function ErrorBox({ children }) {
  return (
    <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ffb3b3', fontSize: '0.9rem' }}>
      {children}
    </div>
  )
}

function AssignmentForm({ classes, assignment, onDone, onCancel }) {
  const editing = !!assignment
  const [classId, setClassId] = useState(assignment?.classId || classes[0]?.id || '')
  const [title, setTitle] = useState(assignment?.title || '')
  const [description, setDescription] = useState(assignment?.description || '')
  const [due, setDue] = useState(toLocalInput(assignment?.dueDate))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const body = { classId, title, description, dueDate: due ? new Date(due).toISOString() : null }
      if (editing) await apiFetch(`/api/teacher/assignments/${assignment.id}`, { method: 'PUT', body })
      else await apiFetch('/api/teacher/assignments', { method: 'POST', body })
      onDone()
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} style={panel}>
      <h3 style={{ color: C.turquoise, marginBottom: '1rem' }}>{editing ? 'Edit assignment' : 'New assignment'}</h3>
      {error && <ErrorBox>{error}</ErrorBox>}

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Class</label>
        <select style={glassInput} value={classId} onChange={e => setClassId(e.target.value)} disabled={editing} required>
          {classes.map(c => <option key={c.id} value={c.id} style={{ background: '#001F3F' }}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Title</label>
        <input style={glassInput} value={title} onChange={e => setTitle(e.target.value)} maxLength={150} required placeholder="e.g. Fractions worksheet" />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={labelStyle}>Instructions</label>
        <textarea style={{ ...glassInput, minHeight: '110px', resize: 'vertical' }} value={description}
          onChange={e => setDescription(e.target.value)} maxLength={5000} placeholder="What should students do?" />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Due date</label>
        <input style={glassInput} type="datetime-local" value={due} onChange={e => setDue(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={saving} style={{ ...glassBtn, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create assignment'}</button>
        <button type="button" onClick={onCancel} style={{ ...glassBtn, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>Cancel</button>
      </div>
    </form>
  )
}

function SubmissionRow({ row, assignmentId, onSaved }) {
  const sub = row.submission
  const [grade, setGrade] = useState(sub?.grade ?? '')
  const [feedback, setFeedback] = useState(sub?.feedback || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }

  const status = !sub ? 'Not submitted' : sub.grade !== null ? 'Graded' : 'Submitted'

  const save = async () => {
    setMsg(null)
    setSaving(true)
    try {
      await apiFetch(`/api/teacher/assignments/${assignmentId}/grade`, {
        method: 'PUT', body: { studentId: row.student.id, grade, feedback },
      })
      setMsg({ ok: true, text: 'Saved' })
      onSaved()
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{row.student.name}</div>
          <div style={{ ...muted, fontSize: '0.8rem' }}>{sub ? `Submitted ${fmtDate(sub.submittedAt)}` : 'Nothing handed in yet'}</div>
        </div>
        <span style={{ color: statusColor(status), fontWeight: 700 }}>{status}</span>
      </div>

      {sub?.content && (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
          {sub.content}
        </div>
      )}
      {isLink(sub?.fileUrl) && (
        <div style={{ marginBottom: '0.75rem' }}>
          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.turquoise, fontWeight: 600 }}>Open attached file</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ width: '110px' }}>
          <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Grade (0-100)</label>
          <input style={{ ...glassInput, padding: '0.6rem 0.8rem' }} type="number" min="0" max="100" step="0.1"
            value={grade} onChange={e => setGrade(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Feedback</label>
          <input style={{ ...glassInput, padding: '0.6rem 0.8rem' }} value={feedback} maxLength={2000}
            onChange={e => setFeedback(e.target.value)} placeholder="Optional comment for the student" />
        </div>
        <button onClick={save} disabled={saving || grade === ''} style={{ ...smallBtn, opacity: saving || grade === '' ? 0.5 : 1 }}>
          {saving ? 'Saving...' : 'Save grade'}
        </button>
      </div>
      {msg && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: msg.ok ? '#7CFC9A' : '#ffb3b3' }}>{msg.text}</div>}
    </div>
  )
}

function SubmissionsPanel({ assignmentId, onBack }) {
  const { data, loading, error, reload } = useApiData(`/api/teacher/assignments/${assignmentId}/submissions`)

  return (
    <>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: '1rem' }}>← Back to assignments</button>
      {loading && <p style={muted}>Loading...</p>}
      {error && <ErrorBox>{error}</ErrorBox>}
      {data && (
        <>
          <div style={panel}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{data.assignment.title}</div>
            <div style={muted}>{data.assignment.className}{data.assignment.dueDate ? ` · Due ${fmtDate(data.assignment.dueDate)}` : ''}</div>
            {data.assignment.description && (
              <div style={{ marginTop: '0.75rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{data.assignment.description}</div>
            )}
          </div>
          {data.rows.length === 0
            ? <div style={{ ...panel, ...muted, textAlign: 'center' }}>No students are in this class yet.</div>
            : data.rows.map(row => (
                <SubmissionRow key={row.student.id} row={row} assignmentId={assignmentId} onSaved={reload} />
              ))}
        </>
      )}
    </>
  )
}

export default function TeacherAssignments() {
  const list = useApiData('/api/teacher/assignments')
  const classes = useApiData('/api/teacher/classes')
  const [form, setForm] = useState(null)      // null | 'new' | assignment being edited
  const [viewing, setViewing] = useState(null) // assignment id whose submissions are open
  const [filter, setFilter] = useState('')
  const [actionError, setActionError] = useState('')

  const classList = classes.data?.classes || []

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? This can't be undone.`)) return
    setActionError('')
    try {
      await apiFetch(`/api/teacher/assignments/${a.id}`, { method: 'DELETE' })
      list.reload()
    } catch (err) {
      setActionError(err.message || 'Could not delete the assignment.')
    }
  }

  if (viewing) {
    return (
      <TeacherPage title="Submissions" icon="📝">
        <SubmissionsPanel assignmentId={viewing} onBack={() => { setViewing(null); list.reload() }} />
      </TeacherPage>
    )
  }

  const shown = (list.data?.assignments || []).filter(a => !filter || a.classId === filter)

  return (
    <TeacherPage title="Assignments" icon="📝">
      {(list.loading || classes.loading) && <p style={muted}>Loading...</p>}
      {list.error && <ErrorBox>{list.error}</ErrorBox>}
      {actionError && <ErrorBox>{actionError}</ErrorBox>}

      {!classes.loading && classes.data && classList.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You need a class before you can set assignments. Add the grade and class you teach in My Classes first.
        </div>
      )}

      {form && (
        <AssignmentForm
          classes={classList}
          assignment={form === 'new' ? null : form}
          onCancel={() => setForm(null)}
          onDone={() => { setForm(null); list.reload() }}
        />
      )}

      {!form && classList.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <button onClick={() => setForm('new')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>+ New assignment</button>
          {classList.length > 1 && (
            <select style={{ ...glassInput, width: 'auto', minWidth: '180px' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="" style={{ background: '#001F3F' }}>All classes</option>
              {classList.map(c => <option key={c.id} value={c.id} style={{ background: '#001F3F' }}>{c.name}</option>)}
            </select>
          )}
        </div>
      )}

      {list.data && classList.length > 0 && shown.length === 0 && !form && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No assignments yet. Create your first one above.</div>
      )}

      {!form && shown.map(a => (
        <div key={a.id} style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{a.title}</div>
              <div style={{ ...muted, fontSize: '0.85rem' }}>
                {a.className} · {a.dueDate ? `${fmtDate(a.dueDate)} · ${dueIn(a.dueDate)}` : 'No due date'}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <div style={muted}>{a.submitted} of {a.studentCount} submitted</div>
              <div style={{ color: a.graded === a.submitted && a.submitted > 0 ? gradeColor(100) : 'rgba(255,255,255,0.6)' }}>{a.graded} graded</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
            <button onClick={() => setViewing(a.id)} style={smallBtn}>Submissions & grading</button>
            <button onClick={() => setForm(a)} style={ghostBtn}>Edit</button>
            <button onClick={() => remove(a)} style={{ ...ghostBtn, color: '#ffb3b3' }}>Delete</button>
          </div>
        </div>
      ))}
    </TeacherPage>
  )
}
