import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { ghostBtn, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { DAY_KEYS } from './ttUtils'

const label = { display: 'block', fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.3rem' }
const opt = { color: '#000' }

// Add or edit one lesson. `initial` has classId, day, period and (when editing) id, subject, teacherId, room.
export default function LessonEditor({ meta, initial, subjectHints, onClose, onSaved }) {
  const t = useT()
  const DAY_NAMES = DAY_KEYS.map(k => t(`shared.timetable.day_${k}`))
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
  const [confirmRemove, setConfirmRemove] = useState(false)
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
      <h3 style={panelTitle}>{editing ? t('shared.timetable.editLesson') : t('shared.timetable.addLesson')}</h3>
      {classOptions.length === 0 ? (
        <p style={label}>
          {isPrincipal ? t('shared.timetable.noClassesYet') : t('shared.timetable.addYourClassesFirst')}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="ls-class">{t('shared.timetable.classLabel')}</label>
              <select id="ls-class" value={form.classId} onChange={set('classId')} disabled={editing} style={{ ...glassInput, opacity: editing ? 0.6 : 1 }}>
                {classOptions.map(c => <option key={c.id} value={c.id} style={opt}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="ls-day">{t('shared.timetable.dayLabel')}</label>
              <select id="ls-day" value={form.day} onChange={set('day')} style={glassInput}>
                {DAY_NAMES.slice(0, meta.maxDay).map((d, i) => <option key={d} value={i + 1} style={opt}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={label} htmlFor="ls-period">{t('shared.timetable.periodLabel')}</label>
              <select id="ls-period" value={form.period} onChange={set('period')} style={glassInput}>
                {lessonPeriods.map(p => <option key={p.period} value={p.period} style={opt}>{p.label} ({p.start}–{p.end})</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="ls-subject">{t('shared.timetable.subjectLabel')}</label>
              <input id="ls-subject" list="ls-subjects" value={form.subject} onChange={set('subject')} maxLength={60} style={glassInput} placeholder={t('shared.timetable.subjectPlaceholder')} />
              <datalist id="ls-subjects">{subjectHints.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label style={label} htmlFor="ls-room">{t('shared.timetable.roomLabel')}</label>
              <input id="ls-room" value={form.room} onChange={set('room')} maxLength={40} style={glassInput} placeholder={t('shared.timetable.roomPlaceholder')} />
            </div>
            {isPrincipal && (
              <div>
                <label style={label} htmlFor="ls-teacher">{t('shared.roles.teacher')}</label>
                <select id="ls-teacher" value={form.teacherId} onChange={set('teacherId')} style={glassInput}>
                  <option value="" style={opt}>{t('shared.timetable.notAssigned')}</option>
                  {meta.teachers.map(tc => <option key={tc.id} value={tc.id} style={opt}>{tc.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {!isPrincipal && <p style={label}>{t('shared.timetable.listedUnderYourName')}</p>}
        </div>
      )}

      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {classOptions.length > 0 && <button disabled={saving} onClick={save} style={smallBtn}>{saving ? t('shared.saving') : editing ? t('shared.saveChanges') : t('shared.timetable.addLesson')}</button>}
        <button disabled={saving} onClick={onClose} style={ghostBtn}>{t('shared.cancel')}</button>
        {editing && (confirmRemove ? (
          <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>{t('shared.timetable.confirmRemove')}</span>
            <button disabled={saving} onClick={remove} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>{saving ? '…' : t('shared.events.yesDelete')}</button>
            <button disabled={saving} onClick={() => setConfirmRemove(false)} style={ghostBtn}>{t('shared.cancel')}</button>
          </span>
        ) : (
          <button disabled={saving} onClick={() => setConfirmRemove(true)} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,143,143,0.5)', marginLeft: 'auto' }}>{t('shared.timetable.removeLesson')}</button>
        ))}
      </div>
    </div>
  )
}
