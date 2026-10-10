import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { SegmentedTabs, fmtDuration, sessionStatusColor, sessionStatusLabel } from '../../components/tutor/tutorUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from '../../components/student/studentUtils'
import { glassInput } from '../../styles/glass'

const DURATIONS = [30, 45, 60, 90, 120]
const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const pad = (n) => String(n).padStart(2, '0')

function toLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SessionForm({ initial, students, isEdit, saving, error, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const durations = DURATIONS.includes(Number(form.durationMinutes)) ? DURATIONS : [...DURATIONS, Number(form.durationMinutes)].sort((a, b) => a - b)

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{isEdit ? 'Edit session' : 'New session'}</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="s-student">Student</label>
          <select id="s-student" value={form.studentId} onChange={set('studentId')} disabled={isEdit} style={glassInput}>
            <option value="" style={{ color: '#000' }}>Choose a student...</option>
            {students.map(s => <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="s-date">Date and time</label>
            <input id="s-date" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} style={glassInput} />
          </div>
          <div>
            <label style={label} htmlFor="s-dur">Duration</label>
            <select id="s-dur" value={form.durationMinutes} onChange={set('durationMinutes')} style={glassInput}>
              {durations.map(d => <option key={d} value={d} style={{ color: '#000' }}>{fmtDuration(d)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={label} htmlFor="s-subject">Subject (optional)</label>
          <input id="s-subject" value={form.subject} onChange={set('subject')} maxLength={100} style={glassInput} placeholder="e.g. Algebra" />
        </div>
        <div>
          <label style={label} htmlFor="s-notes">Notes (optional)</label>
          <textarea id="s-notes" value={form.notes} onChange={set('notes')} maxLength={2000} rows={4}
            style={{ ...glassInput, resize: 'vertical', fontFamily: 'inherit' }} placeholder="What you covered, how it went, what to practise..." />
        </div>
        <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={form.shareNotesWithParents}
            onChange={e => setForm(f => ({ ...f, shareNotesWithParents: e.target.checked }))} />
          Let the student's linked parents read these notes
        </label>
      </div>

      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button disabled={saving} onClick={() => onSave(form)} style={smallBtn}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Book session'}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  )
}

export default function TutorSessions() {
  const [params, setParams] = useSearchParams()
  const sessionsReq = useApiData('/api/tutor/sessions')
  const studentsReq = useApiData('/api/tutor/students')
  const [view, setView] = useState('upcoming')
  const [formMode, setFormMode] = useState(params.get('student') ? 'new' : null)  // null | 'new' | session id
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const students = studentsReq.data?.students || []
  const all = sessionsReq.data?.sessions || []
  const now = Date.now()
  const upcoming = all.filter(s => s.status === 'scheduled' && new Date(s.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  // Past = anything finished, cancelled, or scheduled for a time that has gone by (newest first)
  const past = all.filter(s => !(s.status === 'scheduled' && new Date(s.startsAt).getTime() >= now))
  const list = view === 'upcoming' ? upcoming : past

  const closeForm = () => { setFormMode(null); setFormError(''); if (params.get('student')) setParams({}, { replace: true }) }

  const save = async (form) => {
    setSaving(true); setFormError('')
    try {
      if (formMode === 'new' && !form.studentId) throw new Error('Please choose a student.')
      if (!form.startsAt) throw new Error('Please choose a date and time.')
      const body = {
        startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        subject: form.subject,
        notes: form.notes,
        shareNotesWithParents: form.shareNotesWithParents,
      }
      if (formMode === 'new') await apiFetch('/api/tutor/sessions', { method: 'POST', body: { ...body, studentId: form.studentId } })
      else await apiFetch(`/api/tutor/sessions/${formMode}`, { method: 'PUT', body })
      closeForm()
      await Promise.all([sessionsReq.reload(), studentsReq.reload()])
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const setStatus = async (id, status) => {
    setBusyId(id); setActionError('')
    try {
      await apiFetch(`/api/tutor/sessions/${id}`, { method: 'PUT', body: { status } })
      await Promise.all([sessionsReq.reload(), studentsReq.reload()])
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const remove = async (id) => {
    setActionError('')
    try {
      await apiFetch(`/api/tutor/sessions/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      await Promise.all([sessionsReq.reload(), studentsReq.reload()])
    } catch (err) {
      setActionError(err.message)
    }
  }

  const editing = formMode && formMode !== 'new' ? all.find(s => s.id === formMode) : null
  const loading = (sessionsReq.loading && !sessionsReq.data) || (studentsReq.loading && !studentsReq.data)
  const error = sessionsReq.error || studentsReq.error

  return (
    <StudentPage title="Sessions" icon="📅" backPath="/tutor/dashboard">
      {loading && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={() => { sessionsReq.reload(); studentsReq.reload() }} />}

      {sessionsReq.data && studentsReq.data && (
        <>
          {formMode ? (
            <SessionForm
              key={formMode}
              isEdit={formMode !== 'new'}
              initial={editing
                ? { studentId: editing.studentId, startsAt: toLocalInput(editing.startsAt), durationMinutes: editing.durationMinutes, subject: editing.subject || '', notes: editing.notes || '', shareNotesWithParents: editing.shareNotesWithParents }
                : { studentId: params.get('student') || '', startsAt: '', durationMinutes: 60, subject: '', notes: '', shareNotesWithParents: false }}
              students={students} saving={saving} error={formError}
              onSave={save} onCancel={closeForm}
            />
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <button onClick={() => { setFormMode('new'); setFormError('') }} style={smallBtn} disabled={students.length === 0}>+ New session</button>
              {students.length === 0 && <span style={{ ...muted, marginLeft: '0.75rem' }}>Add a student first (My Students).</span>}
            </div>
          )}

          <SegmentedTabs value={view} onChange={setView} tabs={[
            { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { key: 'past', label: `Past (${past.length})` },
          ]} />

          {actionError && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

          {list.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
              {view === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions.'}
            </div>
          ) : list.map(s => (
            <div key={s.id} style={{ ...panel, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>{s.studentName}{s.subject ? ` · ${s.subject}` : ''}</span>
                <Chip color={sessionStatusColor(s.status)}>{sessionStatusLabel(s.status)}</Chip>
              </div>
              <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem' }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</div>
              {s.notes && <p style={{ ...muted, marginTop: '0.5rem' }}>{s.notes}</p>}
              {s.notes && <p style={{ ...muted, fontSize: '0.75rem', marginTop: '0.2rem' }}>{s.shareNotesWithParents ? 'Shared with parents' : 'Private to you'}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                {confirmDelete === s.id ? (
                  <>
                    <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Delete this session for good?</span>
                    <button onClick={() => remove(s.id)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, delete</button>
                    <button onClick={() => setConfirmDelete(null)} style={ghostBtn}>Cancel</button>
                  </>
                ) : (
                  <>
                    {s.status === 'scheduled' && <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'completed')} style={smallBtn}>Mark completed</button>}
                    {s.status === 'scheduled' && <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'cancelled')} style={ghostBtn}>Cancel session</button>}
                    {s.status !== 'scheduled' && <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'scheduled')} style={ghostBtn}>Reopen</button>}
                    <button onClick={() => { setFormMode(s.id); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={ghostBtn}>Edit</button>
                    <button onClick={() => setConfirmDelete(s.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </StudentPage>
  )
}
