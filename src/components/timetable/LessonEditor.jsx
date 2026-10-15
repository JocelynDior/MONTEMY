import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { ghostBtn, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { DAY_NAMES } from './ttUtils'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const opt = { color: '#000' }

// Add or edit one lesson. `initial` has classId, day, period and (when editing) id, subject, teacherId, room.
export default function LessonEditor({ meta, initial, subjectHints, onClose, onSaved }) {
  const editing = !!initial.id
  const isPrincipal = meta.role === 'principal'
  const classOptions = isPrincipal ? meta.classes : meta.classes.filter(c => c.mine)
  const lessonPeriods = meta.periods.filter(p => !p.isBreak)

  const [form, setForm] = useState({
    classId: initial.classId || classOptions[0]?.id || '',
    day: initial.day,
    period: initial.period,
    subject: initial.subject || '',
    teacherId: initial.teacherId || '',
    room: initial.room || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const body = () => ({
    classId: form.classId,
    day: Number(form.day),
    period: Number(form.period),
    subject: form.subject,
    teacherId: isPrincipal ? (form.teacherId || null) : null,
    room: form.room,
  })

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing) await apiFetch(`/api/timetable/slots/${initial.id}`, { method: 'PUT', body: body() })
      else await apiFetch('/api/timetable/slots', { method: 'POST', body: body() })
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Remove this lesson from the timetable?')) return
    setSaving(true)
    setError('')
    try {
      await apiFetch(`/api/timetable/slots/${initial.id}`, { method: 'DELETE' })
      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="no-print" style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{editing ? 'Edit lesson' : 'Add a lesson'}</h3>
      {classOptions.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>
          {isPrincipal ? 'There are no classes in your school yet.' : 'Add the classes you teach under My Classes first, then you can build their timetable.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="ls-class">Class</label>
              <select id="ls-class" value={form.classId} onChange={set('classId')} disabled={editing} style={{ ...glassInput, opacity: editing ? 0.6 : 1 }}>
                {classOptions.map(c => <option key={c.id} value={c.id} style={opt}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="ls-day">Day</label>
              <select id="ls-day" value={form.day} onChange={set('day')} style={glassInput}>
                {DAY_NAMES.slice(0, meta.maxDay).map((d, i) => <option key={d} value={i + 1} style={opt}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="ls-period">Period</label>
              <select id="ls-period" value={form.period} onChange={set('period')} style={glassInput}>
                {lessonPeriods.map(p => <option key={p.period} value={p.period} style={opt}>{p.label} ({p.start}–{p.end})</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="ls-subject">Subject</label>
              <input id="ls-subject" list="ls-subjects" value={form.subject} onChange={set('subject')} maxLength={60} style={glassInput} placeholder="e.g. Mathematics" />
              <datalist id="ls-subjects">{subjectHints.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label style={label} htmlFor="ls-room">Room (optional)</label>
              <input id="ls-room" value={form.room} onChange={set('room')} maxLength={40} style={glassInput} placeholder="e.g. B12" />
            </div>
            {isPrincipal && (
              <div>
                <label style={label} htmlFor="ls-teacher">Teacher</label>
                <select id="ls-teacher" value={form.teacherId} onChange={set('teacherId')} style={glassInput}>
                  <option value="" style={opt}>Not assigned</option>
                  {meta.teachers.map(t => <option key={t.id} value={t.id} style={opt}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {!isPrincipal && <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)' }}>This lesson will be listed under your name.</p>}
        </div>
      )}

      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {classOptions.length > 0 && <button disabled={saving} onClick={save} style={smallBtn}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Add lesson'}</button>}
        <button disabled={saving} onClick={onClose} style={ghostBtn}>Cancel</button>
        {editing && <button disabled={saving} onClick={remove} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,143,143,0.5)', marginLeft: 'auto' }}>Remove lesson</button>}
      </div>
    </div>
  )
}
