import React, { useState } from 'react'
import { ghostBtn, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { glassInput } from '../../styles/glass'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }

export default function EventForm({ initial, types, saving, error, onSave, onCancel, isEdit, platform }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{isEdit ? 'Edit event' : platform ? 'New platform-wide event' : 'New event'}</h3>
      {platform && !isEdit && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.9rem' }}>Everyone on Montemy will see this event and be notified.</p>}
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

      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button disabled={saving} onClick={() => onSave(form)} style={smallBtn}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  )
}
