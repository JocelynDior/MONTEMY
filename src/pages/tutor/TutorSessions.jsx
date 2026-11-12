import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { SegmentedTabs, fmtDuration, sessionStatusColor, sessionStatusLabel } from '../../components/tutor/tutorUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDate } from '../../components/student/studentUtils'
import { glassBtn, glassInput } from '../../styles/glass'

const DURATIONS = [30, 45, 60, 90, 120]
const pad = (n) => String(n).padStart(2, '0')

function toLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SessionForm({ initial, students, isEdit, saving, error, onSave, onCancel, t }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const durations = DURATIONS.includes(Number(form.durationMinutes))
    ? DURATIONS
    : [...DURATIONS, Number(form.durationMinutes)].sort((a, b) => a - b)

  const lbl = { display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--fg-muted)' }
  const inp = { ...glassInput, width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-3)' }}>
        {isEdit ? t('tutor.editSession') : t('tutor.newSession')}
      </div>
      <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
        <label style={lbl}>{t('tutor.student')}
          <select value={form.studentId} onChange={set('studentId')} disabled={isEdit} style={inp}>
            <option value="">{t('tutor.chooseStudent')}</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: 'var(--sp-3)' }}>
          <label style={lbl}>{t('tutor.dateAndTime')}
            <input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} style={inp} />
          </label>
          <label style={lbl}>{t('tutor.duration')}
            <select value={form.durationMinutes} onChange={set('durationMinutes')} style={inp}>
              {durations.map((d) => <option key={d} value={d}>{fmtDuration(d)}</option>)}
            </select>
          </label>
        </div>
        <label style={lbl}>{t('tutor.subject')}
          <input value={form.subject} onChange={set('subject')} maxLength={100} style={inp} placeholder={t('tutor.subjectPlaceholder')} />
        </label>
        <label style={lbl}>{t('tutor.notes')}
          <textarea
            value={form.notes}
            onChange={set('notes')}
            maxLength={2000}
            rows={4}
            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder={t('tutor.notesPlaceholder')}
          />
        </label>
        <label style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
          <input
            type="checkbox"
            checked={form.shareNotesWithParents}
            onChange={(e) => setForm((f) => ({ ...f, shareNotesWithParents: e.target.checked }))}
          />
          {t('tutor.shareNotesWithParents')}
        </label>
      </div>

      {error && <p style={{ color: 'var(--fg)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 'var(--sp-2)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
        <button disabled={saving} onClick={() => onSave(form)} style={glassBtn}>
          {saving ? t('settings.saving') : isEdit ? t('common.save') : t('tutor.bookSession')}
        </button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>{t('common.cancel')}</button>
      </div>
    </div>
  )
}

export default function TutorSessions() {
  const t = useT('tutor')
  const [params, setParams] = useSearchParams()
  const sessionsReq = useApiData('/api/tutor/sessions')
  const studentsReq = useApiData('/api/tutor/students')
  const [view, setView] = useState('upcoming')
  const [formMode, setFormMode] = useState(params.get('student') ? 'new' : null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const students = studentsReq.data?.students || []
  const all = sessionsReq.data?.sessions || []
  const now = Date.now()
  const upcoming = all
    .filter((s) => s.status === 'scheduled' && new Date(s.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
  const past = all.filter((s) => !(s.status === 'scheduled' && new Date(s.startsAt).getTime() >= now))
  const list = view === 'upcoming' ? upcoming : past

  const closeForm = () => {
    setFormMode(null)
    setFormError('')
    if (params.get('student')) setParams({}, { replace: true })
  }

  const save = async (form) => {
    setSaving(true); setFormError('')
    try {
      if (formMode === 'new' && !form.studentId) throw new Error(t('tutor.errChooseStudent'))
      if (!form.startsAt) throw new Error(t('tutor.errChooseDate'))
      const body = {
        startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        subject: form.subject,
        notes: form.notes,
        shareNotesWithParents: form.shareNotesWithParents,
      }
      if (formMode === 'new') {
        await apiFetch('/api/tutor/sessions', { method: 'POST', body: { ...body, studentId: form.studentId } })
      } else {
        await apiFetch(`/api/tutor/sessions/${formMode}`, { method: 'PUT', body })
      }
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

  const editing = formMode && formMode !== 'new' ? all.find((s) => s.id === formMode) : null
  const isLoading = (sessionsReq.loading && !sessionsReq.data) || (studentsReq.loading && !studentsReq.data)
  const loadError = sessionsReq.error || studentsReq.error

  const tabs = [
    { key: 'upcoming', label: `${t('tutor.tabUpcoming')} (${upcoming.length})` },
    { key: 'past', label: `${t('tutor.tabPast')} (${past.length})` },
  ]

  return (
    <StudentPage title={t('tutor.pageSessions')} backPath="/tutor/dashboard">
      {isLoading && <p style={muted}>{t('common.loading')}</p>}
      {loadError && <ErrorBox message={loadError} onRetry={() => { sessionsReq.reload(); studentsReq.reload() }} />}

      {sessionsReq.data && studentsReq.data && (
        <>
          {formMode ? (
            <SessionForm
              key={formMode}
              isEdit={formMode !== 'new'}
              initial={
                editing
                  ? { studentId: editing.studentId, startsAt: toLocalInput(editing.startsAt), durationMinutes: editing.durationMinutes, subject: editing.subject || '', notes: editing.notes || '', shareNotesWithParents: editing.shareNotesWithParents }
                  : { studentId: params.get('student') || '', startsAt: '', durationMinutes: 60, subject: '', notes: '', shareNotesWithParents: false }
              }
              students={students}
              saving={saving}
              error={formError}
              onSave={save}
              onCancel={closeForm}
              t={t}
            />
          ) : (
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <button
                onClick={() => { setFormMode('new'); setFormError('') }}
                style={{ ...glassBtn, display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
                disabled={students.length === 0}
              >
                {t('tutor.newSession')}
              </button>
              {students.length === 0 && (
                <span style={{ ...muted, marginInlineStart: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}>{t('tutor.addStudentFirst')}</span>
              )}
            </div>
          )}

          <SegmentedTabs value={view} onChange={setView} tabs={tabs} />

          {actionError && (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg)', background: 'var(--surface-2)', padding: 'var(--sp-2)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--sp-3)' }}>
              {actionError}
            </p>
          )}

          {list.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6)' }}>
              {view === 'upcoming' ? t('tutor.noUpcomingSessions') : t('tutor.noPastSessions')}
            </div>
          ) : (
            list.map((s) => (
              <div key={s.id} style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, overflowWrap: 'break-word' }}>{s.studentName}{s.subject ? ` · ${s.subject}` : ''}</span>
                  <Chip label={sessionStatusLabel(s.status, t)} color={sessionStatusColor(s.status)} />
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>
                  {fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}
                </div>
                {s.notes && <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)', overflowWrap: 'break-word' }}>{s.notes}</p>}
                {s.notes && (
                  <p style={{ color: 'var(--fg-subtle)', fontSize: 'var(--fs-xs)', marginTop: '0.2rem' }}>
                    {s.shareNotesWithParents ? t('tutor.sharedWithParents') : t('tutor.privateToYou')}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
                  {confirmDelete === s.id ? (
                    <>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>{t('tutor.confirmDeleteSession')}</span>
                      <button onClick={() => remove(s.id)} style={smallBtn}>{t('common.yes')}</button>
                      <button onClick={() => setConfirmDelete(null)} style={ghostBtn}>{t('common.cancel')}</button>
                    </>
                  ) : (
                    <>
                      {s.status === 'scheduled' && (
                        <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'completed')} style={smallBtn}>{t('tutor.markCompleted')}</button>
                      )}
                      {s.status === 'scheduled' && (
                        <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'cancelled')} style={ghostBtn}>{t('tutor.cancelSession')}</button>
                      )}
                      {s.status !== 'scheduled' && (
                        <button disabled={busyId === s.id} onClick={() => setStatus(s.id, 'scheduled')} style={ghostBtn}>{t('tutor.reopen')}</button>
                      )}
                      <button onClick={() => { setFormMode(s.id); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={ghostBtn}>{t('common.edit')}</button>
                      <button onClick={() => setConfirmDelete(s.id)} style={ghostBtn}>{t('common.delete')}</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </StudentPage>
  )
}
