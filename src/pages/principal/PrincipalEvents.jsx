import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from '../../components/student/studentUtils'
import { glassInput } from '../../styles/glass'

const FALLBACK_TYPES = ['General', 'Academic', 'Sports', 'Meeting', 'Holiday', 'Other']
const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }

const pad = (n) => String(n).padStart(2, '0')
// ISO string → value for <input type="datetime-local"> in the browser's own time zone
function toLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY = { title: '', date: '', location: '', type: 'General', description: '' }

function EventForm({ initial, types, saving, error, onSave, onCancel, isEdit }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{isEdit ? 'Edit event' : 'New event'}</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="ev-title">Title</label>
          <input id="ev-title" value={form.title} onChange={set('title')} maxLength={150} style={glassInput} placeholder="e.g. Sports Day" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="ev-date">Date and time</label>
            <input id="ev-date" type="datetime-local" value={form.date} onChange={set('date')} style={glassInput} />
          </div>
          <div>
            <label style={label} htmlFor="ev-type">Type</label>
            <select id="ev-type" value={form.type} onChange={set('type')} style={glassInput}>
              {types.map(t => <option key={t} value={t} style={{ color: '#000' }}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={label} htmlFor="ev-loc">Location (optional)</label>
          <input id="ev-loc" value={form.location} onChange={set('location')} maxLength={150} style={glassInput} placeholder="e.g. Main hall" />
        </div>
        <div>
          <label style={label} htmlFor="ev-desc">Description (optional)</label>
          <textarea id="ev-desc" value={form.description} onChange={set('description')} maxLength={2000} rows={4}
            style={{ ...glassInput, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>

      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button disabled={saving} onClick={() => onSave(form)} style={smallBtn}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  )
}

export default function PrincipalEvents() {
  const { data, loading, error, reload } = useApiData('/api/principal/events')
  const [view, setView] = useState('Upcoming')
  const [formMode, setFormMode] = useState(null)   // null | 'new' | event id being edited
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionError, setActionError] = useState('')

  const types = data?.types || FALLBACK_TYPES
  const all = data?.events || []
  const now = Date.now()
  const upcoming = all.filter(e => new Date(e.date).getTime() >= now).sort((a, b) => new Date(a.date) - new Date(b.date))
  const past = all.filter(e => new Date(e.date).getTime() < now)   // already newest first
  const list = view === 'Upcoming' ? upcoming : past

  const save = async (form) => {
    setSaving(true); setFormError('')
    try {
      if (!form.date) throw new Error('Please choose a date and time.')
      const body = { ...form, date: new Date(form.date).toISOString() }
      if (formMode === 'new') await apiFetch('/api/principal/events', { method: 'POST', body })
      else await apiFetch(`/api/principal/events/${formMode}`, { method: 'PUT', body })
      setFormMode(null)
      await reload()
    } catch (err) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const remove = async (id) => {
    setActionError('')
    try {
      await apiFetch(`/api/principal/events/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const editing = formMode && formMode !== 'new' ? all.find(e => e.id === formMode) : null

  return (
    <StudentPage title="School Events" icon="📅" backPath="/principal/dashboard">
      {loading && !data && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          {formMode ? (
            <EventForm
              key={formMode}
              isEdit={formMode !== 'new'}
              initial={editing
                ? { title: editing.title || '', date: toLocalInput(editing.date), location: editing.location || '', type: editing.type || 'General', description: editing.description || '' }
                : EMPTY}
              types={types} saving={saving} error={formError}
              onSave={save} onCancel={() => { setFormMode(null); setFormError('') }}
            />
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <button onClick={() => { setFormMode('new'); setFormError('') }} style={smallBtn}>+ New event</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {['Upcoming', 'Past'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem',
                  fontWeight: view === v ? 700 : 400,
                  border: view === v ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
                  background: view === v ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
                }}>
                {v} ({v === 'Upcoming' ? upcoming.length : past.length})
              </button>
            ))}
          </div>

          {actionError && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

          {list.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
              {view === 'Upcoming' ? 'No upcoming events. Create one and everyone at your school will see it.' : 'No past events.'}
            </div>
          ) : list.map(ev => (
            <div key={ev.id} style={{ ...panel, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>{ev.title}</span>
                {ev.type && <Chip color="#8fd3ff">{ev.type}</Chip>}
              </div>
              <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem' }}>
                {fmtDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}
              </div>
              {ev.description && <p style={{ ...muted, marginTop: '0.5rem' }}>{ev.description}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                {confirmDelete === ev.id ? (
                  <>
                    <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Delete this event for everyone?</span>
                    <button onClick={() => remove(ev.id)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, delete</button>
                    <button onClick={() => setConfirmDelete(null)} style={ghostBtn}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setFormMode(ev.id); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={ghostBtn}>Edit</button>
                    <button onClick={() => setConfirmDelete(ev.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
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
