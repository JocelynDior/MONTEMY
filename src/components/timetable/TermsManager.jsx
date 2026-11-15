import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { fmtTerm } from './ttUtils'
import SkeletonList from '../../components/shared/Skeleton'

const label = { display: 'block', fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.3rem' }
const EMPTY = { title: '', kind: 'term', startDate: '', endDate: '' }

// Term dates and holidays. Everyone in the school sees them on the timetable; only the principal edits.
export default function TermsManager({ canManage }) {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/timetable/terms')
  const [form, setForm] = useState(null)       // null = closed; otherwise the form being edited
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const open = (term) => { setEditId(term?.id || null); setForm(term ? { title: term.title, kind: term.kind, startDate: term.startDate, endDate: term.endDate } : { ...EMPTY }); setFormError('') }

  const save = async () => {
    setSaving(true)
    setFormError('')
    try {
      await apiFetch(editId ? `/api/principal/timetable/terms/${editId}` : '/api/principal/timetable/terms', { method: editId ? 'PUT' : 'POST', body: form })
      setForm(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (term) => {
    try {
      await apiFetch(`/api/principal/timetable/terms/${term.id}`, { method: 'DELETE' })
      setConfirmRemove(null)
      reload()
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ ...panelTitle, marginBottom: 0 }}>{t('shared.timetable.termsTitle')}</h3>
        {canManage && !form && <button onClick={() => open(null)} style={smallBtn}>{t('shared.timetable.addDates')}</button>}
      </div>

      {form && (
        <div style={{ display: 'grid', gap: '0.9rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="tm-title">{t('shared.timetable.titleLabel')}</label>
              <input id="tm-title" value={form.title} onChange={set('title')} maxLength={100} style={glassInput} placeholder={t('shared.timetable.termTitlePlaceholder')} />
            </div>
            <div>
              <label style={label} htmlFor="tm-kind">{t('shared.timetable.typeLabel')}</label>
              <select id="tm-kind" value={form.kind} onChange={set('kind')} style={glassInput}>
                <option value="term" style={{ color: '#000' }}>{t('shared.timetable.term')}</option>
                <option value="holiday" style={{ color: '#000' }}>{t('shared.timetable.holidayNoSchool')}</option>
              </select>
            </div>
            <div>
              <label style={label} htmlFor="tm-start">{t('shared.timetable.fromLabel')}</label>
              <input id="tm-start" type="date" value={form.startDate} onChange={set('startDate')} style={glassInput} />
            </div>
            <div>
              <label style={label} htmlFor="tm-end">{t('shared.timetable.toLabel')}</label>
              <input id="tm-end" type="date" value={form.endDate} onChange={set('endDate')} style={glassInput} />
            </div>
          </div>
          {formError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button disabled={saving} onClick={save} style={smallBtn}>{saving ? t('shared.saving') : editId ? t('shared.saveChanges') : t('shared.add')}</button>
            <button disabled={saving} onClick={() => setForm(null)} style={ghostBtn}>{t('shared.cancel')}</button>
          </div>
          {!editId && <p style={{ ...muted, fontSize: '0.8rem' }}>{t('shared.timetable.notifyOnAdd')}</p>}
        </div>
      )}

      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.terms.length === 0 && <p style={muted}>{t('shared.timetable.noTerms')}</p>}
      {data && data.terms.map(term => (
        <div key={term.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid rgba(128,128,128,0.2)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{term.title} <Chip color={term.kind === 'holiday' ? '#ffb36b' : '#8fd3ff'}>{term.kind === 'holiday' ? t('shared.timetable.holiday') : t('shared.timetable.term')}</Chip></div>
            <div style={{ ...muted, fontSize: '0.8rem' }}>{fmtTerm(term)}</div>
          </div>
          {canManage && (
            confirmRemove === term.id ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>{t('shared.timetable.confirmRemoveTerm', { title: term.title })}</span>
                <button onClick={() => remove(term)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>{t('shared.events.yesDelete')}</button>
                <button onClick={() => setConfirmRemove(null)} style={ghostBtn}>{t('shared.cancel')}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => open(term)} style={ghostBtn}>{t('shared.edit')}</button>
                <button onClick={() => setConfirmRemove(term.id)} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,143,143,0.5)' }}>{t('shared.remove')}</button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  )
}
