import React, { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { ghostBtn, smallBtn } from '../parent/parentUi'
import Icon from '../shared/Icon'
import { CALENDAR_ENTRY_TYPE_KEYS, iconPathsFor, typeLabelKey } from './eventTypes'
import { fmtLongDate } from '../events/eventUtils'

const ROTATE_MS = 4000

function TypeIcon({ type, size = 18 }) {
  const paths = iconPathsFor(type)
  if (!paths) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const EMPTY_FORM = { type: 'other', title: '' }

// Opens on a day tap. Shows that day's items (School Events merged with Calendar entries), one at
// a time with prev/next arrows for the day itself; when a day has more than one item they rotate
// automatically every few seconds. Admins/principals can add, edit or remove calendar entries here
// (never School Events — those stay managed from the Events page).
export default function DayModal({ dateIso, entries, canManage, managePath, onClose, onPrevDay, onNextDay, onMutated }) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const [form, setForm] = useState(null)       // null = closed; { id?, type, title }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const timer = useRef(null)

  useEffect(() => { setIndex(0); setForm(null); setError(''); setConfirmRemove(false) }, [dateIso])

  useEffect(() => {
    clearInterval(timer.current)
    if (entries.length > 1 && !form) {
      timer.current = setInterval(() => setIndex(i => (i + 1) % entries.length), ROTATE_MS)
    }
    return () => clearInterval(timer.current)
  }, [entries.length, form])

  const current = entries[Math.min(index, entries.length - 1)] || null

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setError('') }
  const openEdit = (entry) => { setForm({ id: entry.id, type: entry.type, title: entry.title }); setError('') }

  const save = async () => {
    setSaving(true); setError('')
    try {
      const body = { date: dateIso, type: form.type, title: form.title.trim() }
      if (!body.title) throw new Error(t('shared.calendar.entryTitleLabel'))
      if (form.id) await apiFetch(`${managePath}/entries/${form.id}`, { method: 'PUT', body })
      else await apiFetch(`${managePath}/entries`, { method: 'POST', body })
      setForm(null)
      onMutated?.()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const remove = async (entry) => {
    setSaving(true); setError('')
    try {
      await apiFetch(`${managePath}/entries/${entry.id}`, { method: 'DELETE' })
      setConfirmRemove(false)
      setIndex(0)
      onMutated?.()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(0.5rem, 3vw, 1.5rem)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-bg)', border: '1px solid rgba(128,128,128,0.3)', borderRadius: '0.9rem', width: '100%', maxWidth: '28rem', maxHeight: '90dvh', overflowY: 'auto', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={onPrevDay} aria-label={t('shared.previous')} style={ghostBtn}><Icon name="chevron-left" size={14} /></button>
          <strong style={{ flex: 1, textAlign: 'center', fontSize: '0.95rem' }}>{fmtLongDate(dateIso)}</strong>
          <button onClick={onNextDay} aria-label={t('shared.next')} style={ghostBtn}><Icon name="chevron" size={14} /></button>
          <button onClick={onClose} aria-label={t('shared.close')} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', display: 'flex' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {!form && (
          entries.length === 0 ? (
            <p style={{ color: 'var(--fg-muted, rgba(128,128,128,0.9))', textAlign: 'center', padding: '1rem 0' }}>{t('shared.calendar.noEntriesOnDay')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', textAlign: 'center', padding: '0.5rem 0' }}>
              <TypeIcon type={current.type} size={28} />
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{current.title}</div>
              {current.type !== 'other' && <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))' }}>{t(typeLabelKey(current.type))}</div>}
              {entries.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => setIndex(i => (i - 1 + entries.length) % entries.length)} aria-label={t('shared.previous')} style={ghostBtn}><Icon name="chevron-left" size={12} /></button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))' }}>{t('shared.calendar.ofN', { n: index + 1, total: entries.length })}</span>
                  <button onClick={() => setIndex(i => (i + 1) % entries.length)} aria-label={t('shared.next')} style={ghostBtn}><Icon name="chevron" size={12} /></button>
                </div>
              )}
              {canManage && current.source === 'calendar' && current.canEdit && (
                confirmRemove ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#ffaaaa' }}>{t('shared.calendar.confirmRemoveEntry')}</span>
                    <button disabled={saving} onClick={() => remove(current)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>{t('shared.events.yesDelete')}</button>
                    <button disabled={saving} onClick={() => setConfirmRemove(false)} style={ghostBtn}>{t('shared.cancel')}</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(current)} style={ghostBtn}>{t('shared.edit')}</button>
                    <button onClick={() => setConfirmRemove(true)} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,80,80,0.4)' }}>{t('shared.remove')}</button>
                  </div>
                )
              )}
            </div>
          )
        )}

        {form && (
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <div>
              <label htmlFor="cal-entry-type" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.3rem' }}>{t('shared.calendar.entryTypeLabel')}</label>
              <select id="cal-entry-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={glassInput}>
                {CALENDAR_ENTRY_TYPE_KEYS.map(k => <option key={k} value={k} style={{ color: '#000' }}>{t(typeLabelKey(k))}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cal-entry-title" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.3rem' }}>{t('shared.calendar.entryTitleLabel')}</label>
              <input id="cal-entry-title" value={form.title} maxLength={150} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={glassInput} placeholder={t('shared.calendar.entryTitlePlaceholder')} />
            </div>
            {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.85rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={saving} onClick={save} style={smallBtn}>{saving ? t('shared.saving') : t('shared.saveChanges')}</button>
              <button disabled={saving} onClick={() => setForm(null)} style={ghostBtn}>{t('shared.cancel')}</button>
            </div>
          </div>
        )}

        {!form && canManage && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button onClick={openAdd} style={ghostBtn}><Icon name="plus" size={13} style={{ marginRight: '0.3rem' }} />{t('shared.calendar.addEntry')}</button>
          </div>
        )}
        {error && !form && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    </div>
  )
}
