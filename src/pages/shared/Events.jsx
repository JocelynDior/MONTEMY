import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import EventForm from '../../components/events/EventForm'
import EventCard from '../../components/events/EventCard'
import EventCalendar from '../../components/events/EventCalendar'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useAuth } from '../../context/AuthContext'
import { ROLE_HOME, TIMETABLE_PATH, addDays, dayKey, startOfWeek, toLocalInput } from '../../components/events/eventUtils'

const EMPTY = { title: '', date: '', location: '', type: 'General', description: '' }
const VIEWS = ['List', 'Month', 'Week']

const tabStyle = (on) => ({
  cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem', fontFamily: 'inherit',
  fontWeight: on ? 700 : 400,
  border: on ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
  background: on ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
})

// One events page for every role: list / month / week views, RSVP, past-event archive.
// Principals manage their school's events here; admins manage platform-wide events.
export default function Events() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { data, loading, error, reload } = useApiData('/api/events')

  const [view, setView] = useState('List')
  const [when, setWhen] = useState('Upcoming')            // list view: Upcoming | Past
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(null)         // day key picked in the calendar
  const [formMode, setFormMode] = useState(null)         // null | 'new' | event id
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [actionError, setActionError] = useState('')
  const [rsvpBusy, setRsvpBusy] = useState(false)

  const all = data?.events || []
  const now = Date.now()
  const upcoming = useMemo(() => all.filter(e => new Date(e.date).getTime() >= now).sort((a, b) => new Date(a.date) - new Date(b.date)), [all, now])
  const past = useMemo(() => all.filter(e => new Date(e.date).getTime() < now).sort((a, b) => new Date(b.date) - new Date(a.date)), [all, now])

  const home = ROLE_HOME[role] || '/'
  const isPlatformManager = data?.role === 'admin'
  const canRsvp = !!data?.isVerified && data?.role !== 'admin'

  const save = async (form) => {
    setSaving(true); setFormError('')
    try {
      if (!form.date) throw new Error('Please choose a date and time.')
      const body = { ...form, date: new Date(form.date).toISOString() }
      const base = data.createPath
      if (formMode === 'new') await apiFetch(base, { method: 'POST', body })
      else await apiFetch(`${base}/${formMode}`, { method: 'PUT', body })
      setFormMode(null)
      await reload()
    } catch (err) { setFormError(err.message) }
    setSaving(false)
  }

  const remove = async (id) => {
    setActionError('')
    try {
      await apiFetch(`${data.createPath}/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      await reload()
    } catch (err) { setActionError(err.message) }
  }

  const rsvp = async (ev, status) => {
    setActionError(''); setRsvpBusy(true)
    try {
      await apiFetch(`/api/events/${ev.id}/rsvp`, { method: 'PUT', body: { status } })
      await reload()
    } catch (err) { setActionError(err.message) }
    setRsvpBusy(false)
  }

  const edit = (ev) => { setFormMode(ev.id); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const editing = formMode && formMode !== 'new' ? all.find(e => e.id === formMode) : null

  // Calendar navigation
  const step = (dir) => setCursor(c => view === 'Week' ? addDays(c, 7 * dir) : new Date(c.getFullYear(), c.getMonth() + dir, 1))
  const heading = view === 'Week'
    ? `${startOfWeek(cursor).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const dayEvents = selected ? all.filter(e => dayKey(new Date(e.date)) === selected).sort((a, b) => new Date(a.date) - new Date(b.date)) : []

  const card = (ev) => (
    <EventCard key={ev.id} ev={ev} past={new Date(ev.date).getTime() < now} canRsvp={canRsvp} rsvpBusy={rsvpBusy}
      onRsvp={rsvp} confirmDelete={confirmDelete} onAskDelete={setConfirmDelete} onDelete={remove} onEdit={edit} />
  )

  const list = when === 'Upcoming' ? upcoming : past

  return (
    <StudentPage title="Events" icon="📅" backPath={home} maxWidth={1000}>
      {loading && !data && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          {formMode ? (
            <EventForm
              key={formMode}
              isEdit={formMode !== 'new'}
              platform={isPlatformManager}
              initial={editing
                ? { title: editing.title || '', date: toLocalInput(editing.date), location: editing.location || '', type: editing.type || 'General', description: editing.description || '' }
                : EMPTY}
              types={data.types} saving={saving} error={formError}
              onSave={save} onCancel={() => { setFormMode(null); setFormError('') }}
            />
          ) : (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {data.canCreate && <button onClick={() => { setFormMode('new'); setFormError('') }} style={smallBtn}>{isPlatformManager ? '+ New platform event' : '+ New event'}</button>}
              {TIMETABLE_PATH[data.role] && <button onClick={() => navigate(TIMETABLE_PATH[data.role])} style={ghostBtn}>View timetable</button>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {VIEWS.map(v => <button key={v} onClick={() => setView(v)} style={tabStyle(view === v)}>{v}</button>)}
          </div>

          {actionError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

          {view === 'List' ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {['Upcoming', 'Past'].map(v => (
                  <button key={v} onClick={() => setWhen(v)} style={tabStyle(when === v)}>
                    {v === 'Past' ? 'Past events' : v} ({v === 'Upcoming' ? upcoming.length : past.length})
                  </button>
                ))}
              </div>
              {list.length === 0
                ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{when === 'Upcoming' ? 'No upcoming events.' : 'No past events yet.'}</div>
                : list.map(card)}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                <button onClick={() => step(-1)} aria-label="Previous" style={ghostBtn}>‹</button>
                <button onClick={() => { setCursor(new Date()); setSelected(dayKey(new Date())) }} style={ghostBtn}>Today</button>
                <button onClick={() => step(1)} aria-label="Next" style={ghostBtn}>›</button>
                <span style={{ fontWeight: 700, marginLeft: '0.4rem' }}>{heading}</span>
              </div>
              <EventCalendar mode={view === 'Week' ? 'week' : 'month'} cursor={cursor} events={all} selected={selected} onSelect={setSelected} />
              {selected && (
                dayEvents.length === 0
                  ? <div style={{ ...panel, ...muted, textAlign: 'center' }}>No events on this day.</div>
                  : dayEvents.map(card)
              )}
              {!selected && <p style={muted}>Pick a day to see its events.</p>}
            </>
          )}
        </>
      )}
    </StudentPage>
  )
}
