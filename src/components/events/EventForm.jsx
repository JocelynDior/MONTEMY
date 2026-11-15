import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import { ghostBtn, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { glassInput } from '../../styles/glass'

const label = { display: 'block', fontSize: '0.8rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', marginBottom: '0.3rem' }

export default function EventForm({ initial, types, saving, error, onSave, onCancel, isEdit, platform }) {
  const t = useT()
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{isEdit ? t('shared.events.editEvent') : platform ? t('shared.events.newPlatformEvent') : t('shared.events.newEvent')}</h3>
      {platform && !isEdit && <p style={{ ...label, fontSize: '0.85rem', marginBottom: '0.9rem' }}>{t('shared.events.platformNotice')}</p>}
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="ev-title">{t('shared.events.titleLabel')}</label>
          <input id="ev-title" value={form.title} onChange={set('title')} maxLength={150} style={glassInput} placeholder={t('shared.events.titlePlaceholder')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="ev-date">{t('shared.events.dateLabel')}</label>
            <input id="ev-date" type="datetime-local" value={form.date} onChange={set('date')} style={glassInput} />
          </div>
          <div>
            <label style={label} htmlFor="ev-type">{t('shared.events.typeLabel')}</label>
            <select id="ev-type" value={form.type} onChange={set('type')} style={glassInput}>
              {types.map(tp => <option key={tp} value={tp} style={{ color: '#000' }}>{tp}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={label} htmlFor="ev-loc">{t('shared.events.locationLabel')}</label>
          <input id="ev-loc" value={form.location} onChange={set('location')} maxLength={150} style={glassInput} placeholder={t('shared.events.locationPlaceholder')} />
        </div>
        <div>
          <label style={label} htmlFor="ev-desc">{t('shared.events.descriptionLabel')}</label>
          <textarea id="ev-desc" value={form.description} onChange={set('description')} maxLength={2000} rows={4}
            style={{ ...glassInput, resize: 'vertical', fontFamily: 'inherit', minWidth: 0 }} />
        </div>
      </div>

      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button disabled={saving} onClick={() => onSave(form)} style={smallBtn}>{saving ? t('shared.saving') : isEdit ? t('shared.saveChanges') : t('shared.events.createEvent')}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>{t('shared.cancel')}</button>
      </div>
    </div>
  )
}
