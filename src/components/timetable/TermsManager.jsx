import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { fmtTerm } from './ttUtils'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const EMPTY = { title: '', kind: 'term', startDate: '', endDate: '' }

// Term dates and holidays. Everyone in the school sees them on the timetable; only the principal edits.
export default function TermsManager({ canManage }) {
  const { data, loading, error, reload } = useApiData('/api/timetable/terms')
  const [form, setForm] = useState(null)       // null = closed; otherwise the form being edited
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const open = (t) => { setEditId(t?.id || null); setForm(t ? { title: t.title, kind: t.kind, startDate: t.startDate, endDate: t.endDate } : { ...EMPTY }); setFormError('') }

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

  const remove = async (t) => {
    if (!window.confirm(`Remove "${t.title}"?`)) return
    try {
      await apiFetch(`/api/principal/timetable/terms/${t.id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      window.alert(err.message)
    }
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ ...panelTitle, marginBottom: 0 }}>Term dates and holidays</h3>
        {canManage && !form && <button onClick={() => open(null)} style={smallBtn}>+ Add dates</button>}
      </div>

      {form && (
        <div style={{ display: 'grid', gap: '0.9rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={label} htmlFor="tm-title">Title</label>
              <input id="tm-title" value={form.title} onChange={set('title')} maxLength={100} style={glassInput} placeholder="e.g. Term 1 or Easter holiday" />
            </div>
            <div>
              <label style={label} htmlFor="tm-kind">Type</label>
              <select id="tm-kind" value={form.kind} onChange={set('kind')} style={glassInput}>
                <option value="term" style={{ color: '#000' }}>Term</option>
                <option value="holiday" style={{ color: '#000' }}>Holiday (no school)</option>
              </select>
            </div>
            <div>
              <label style={label} htmlFor="tm-start">From</label>
              <input id="tm-start" type="date" value={form.startDate} onChange={set('startDate')} style={glassInput} />
            </div>
            <div>
              <label style={label} htmlFor="tm-end">To</label>
              <input id="tm-end" type="date" value={form.endDate} onChange={set('endDate')} style={glassInput} />
            </div>
          </div>
          {formError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{formError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button disabled={saving} onClick={save} style={smallBtn}>{saving ? 'Saving...' : editId ? 'Save changes' : 'Add'}</button>
            <button disabled={saving} onClick={() => setForm(null)} style={ghostBtn}>Cancel</button>
          </div>
          {!editId && <p style={{ ...muted, fontSize: '0.8rem' }}>Everyone at the school is notified when you add dates.</p>}
        </div>
      )}

      {loading && !data && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.terms.length === 0 && <p style={muted}>No term dates or holidays have been added yet.</p>}
      {data && data.terms.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{t.title} <Chip color={t.kind === 'holiday' ? '#ffb36b' : '#8fd3ff'}>{t.kind === 'holiday' ? 'Holiday' : 'Term'}</Chip></div>
            <div style={{ ...muted, fontSize: '0.8rem' }}>{fmtTerm(t)}</div>
          </div>
          {canManage && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => open(t)} style={ghostBtn}>Edit</button>
              <button onClick={() => remove(t)} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,143,143,0.5)' }}>Remove</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
