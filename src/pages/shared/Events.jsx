import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/index.js'
import StudentPage from '../../components/student/StudentPage'
import EventForm from '../../components/events/EventForm'
import EventCard from '../../components/events/EventCard'
import EventCalendar from '../../components/events/EventCalendar'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import Icon from '../../components/shared/Icon'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useAuth } from '../../context/AuthContext'
import { ROLE_HOME, TIMETABLE_PATH, addDays, dayKey, startOfWeek, toLocalInput } from '../../components/events/eventUtils'
import SkeletonList from '../../components/shared/Skeleton'

const EMPTY = { title: '', date: '', location: '', type: 'General', description: '' }

// One events page for every role: list / month / week views, RSVP, past-event archive.
// Principals manage their school's events here; admins manage platform-wide events.
export default function Events() {
  const t = useT()
  const navigate = useNavigate()
  const { role } = useAuth()
  const { data, loading, error, reload } = useApiData('/api/events')

  const VIEWS = [['List', t('shared.events.viewList')], ['Month', t('shared.events.viewMonth')], ['Week', t('shared.events.viewWeek')]]

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

  const tabStyle = (on) => ({
    cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'var(--fg)', fontSize: '0.9rem', fontFamily: 'inherit',
    fontWeight: on ? 700 : 400,
    border: on ? '1px solid var(--color-primary)' : '1px solid rgba(128,128,128,0.3)',
    background: on ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(128,128,128,0.08)',
  })

  const save = async (form) => {
    setSaving(true); setFormError('')
    try {
      if (!form.date) throw new Error(t('shared.events.dateRequired'))
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
    <StudentPage title={t('shared.events.title')} icon="events" backPath={home} maxWidth={1000}>
      {loading && !data && <SkeletonList />}
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
              {data.canCreate && (
                <button onClick={() => { setFormMode('new'); setFormError('') }} style={smallBtn}>
                  <Icon name="plus" size={14} style={{ marginRight: '0.3rem' }} />
                  {isPlatformManager ? t('shared.events.newPlatformEvent') : t('shared.events.newEvent')}
                </button>
              )}
              {TIMETABLE_PATH[data.role] && <button onClick={() => navigate(TIMETABLE_PATH[data.role])} style={ghostBtn}>{t('shared.events.viewTimetable')}</button>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {VIEWS.map(([v, label]) => <button key={v} onClick={() => setView(v)} style={tabStyle(view === v)}>{label}</button>)}
          </div>

          {actionError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

          {view === 'List' ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[['Upcoming', t('shared.events.upcoming'), upcoming.length], ['Past', t('shared.events.pastEvents'), past.length]].map(([v, label, count]) => (
                  <button key={v} onClick={() => setWhen(v)} style={tabStyle(when === v)}>
                    {label} ({count})
                  </button>
                ))}
              </div>
              {list.length === 0
                ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{when === 'Upcoming' ? t('shared.events.noUpcoming') : t('shared.events.noPast')}</div>
                : list.map(card)}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
                <button onClick={() => step(-1)} aria-label={t('shared.previous')} style={ghostBtn}><Icon name="chevron-left" size={14} /></button>
                <button onClick={() => { setCursor(new Date()); setSelected(dayKey(new Date())) }} style={ghostBtn}>{t('shared.today')}</button>
                <button onClick={() => step(1)} aria-label={t('shared.next')} style={ghostBtn}><Icon name="chevron" size={14} /></button>
                <span style={{ fontWeight: 700, marginLeft: '0.4rem' }}>{heading}</span>
              </div>
              <EventCalendar mode={view === 'Week' ? 'week' : 'month'} cursor={cursor} events={all} selected={selected} onSelect={setSelected} />
              {selected && (
                dayEvents.length === 0
                  ? <div style={{ ...panel, ...muted, textAlign: 'center' }}>{t('shared.events.noEventsOnDay')}</div>
                  : dayEvents.map(card)
              )}
              {!selected && <p style={muted}>{t('shared.events.pickDay')}</p>}
            </>
          )}
        </>
      )}
    </StudentPage>
  )
}
