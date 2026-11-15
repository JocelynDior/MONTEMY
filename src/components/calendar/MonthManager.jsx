import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { Chip, ghostBtn, smallBtn } from '../parent/parentUi'
import Icon from '../shared/Icon'

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1))

// Admin/principal-only: the chip bar of months currently open on the calendar, each removable,
// plus an "Add month" button that opens a small year/month picker. Students, parents, teachers and
// staff never see this — canManage is checked again on the server, this is just the UI for it.
export default function MonthManager({ year, months, managePath, onChanged }) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [newYear, setNewYear] = useState(year)
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const addMonth = async () => {
    setBusy(true); setError('')
    try {
      await apiFetch(`${managePath}/months`, { method: 'POST', body: { year: Number(newYear), month: Number(newMonth) } })
      setAdding(false)
      onChanged?.()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  const removeMonth = async (m) => {
    setBusy(true); setError('')
    try {
      await apiFetch(`${managePath}/months/${m.id}`, { method: 'DELETE' })
      setConfirmRemove(null)
      onChanged?.()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {months.length === 0 && <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))' }}>{t('shared.calendar.noMonthsOpen')}</span>}
        {months.map(m => {
          const label = MONTH_NAMES[m.month - 1].toLocaleDateString(undefined, { month: 'long' })
          return confirmRemove === m.id ? (
            <div key={m.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#ffaaaa' }}>{t('shared.calendar.confirmRemoveMonth', { month: label, year: m.year })}</span>
              <button disabled={busy} onClick={() => removeMonth(m)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>{t('shared.events.yesDelete')}</button>
              <button disabled={busy} onClick={() => setConfirmRemove(null)} style={ghostBtn}>{t('shared.cancel')}</button>
            </div>
          ) : (
            <Chip key={m.id}>
              {label}
              <button onClick={() => setConfirmRemove(m.id)} aria-label={`${t('shared.calendar.removeMonth')}: ${label}`}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '0.35rem', display: 'inline-flex', verticalAlign: 'middle' }}>
                <Icon name="close" size={11} />
              </button>
            </Chip>
          )
        })}
        {!adding && (
          <button onClick={() => { setAdding(true); setNewYear(year); setError('') }} style={ghostBtn}>
            <Icon name="plus" size={13} style={{ marginRight: '0.3rem' }} />{t('shared.calendar.addMonth')}
          </button>
        )}
      </div>

      {adding && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '0.75rem' }}>
          <div>
            <label htmlFor="cal-add-year" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.25rem' }}>{t('shared.calendar.yearLabel')}</label>
            <input id="cal-add-year" type="number" min={2000} max={2100} value={newYear} onChange={e => setNewYear(e.target.value)} style={{ ...glassInput, width: '6.5rem' }} />
          </div>
          <div>
            <label htmlFor="cal-add-month" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.25rem' }}>{t('shared.calendar.monthLabel')}</label>
            <select id="cal-add-month" value={newMonth} onChange={e => setNewMonth(e.target.value)} style={glassInput}>
              {MONTH_NAMES.map((d, i) => <option key={i} value={i + 1} style={{ color: '#000' }}>{d.toLocaleDateString(undefined, { month: 'long' })}</option>)}
            </select>
          </div>
          <button disabled={busy} onClick={addMonth} style={smallBtn}>{busy ? t('shared.saving') : t('shared.add')}</button>
          <button disabled={busy} onClick={() => setAdding(false)} style={ghostBtn}>{t('shared.cancel')}</button>
        </div>
      )}
      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  )
}
