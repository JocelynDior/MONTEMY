import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const EMPTY = { name: '', type: 'school', address: '', country: '', contactEmail: '' }

function CreateOrg({ onDone, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true); setError('')
    try {
      await apiFetch('/api/admin/orgs', { method: 'POST', body: form })
      onDone()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>New organisation</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="o-name">Name</label>
            <input id="o-name" value={form.name} onChange={set('name')} maxLength={120} style={glassInput} placeholder="e.g. Greenfield High School" />
          </div>
          <div>
            <label style={label} htmlFor="o-type">Type</label>
            <select id="o-type" value={form.type} onChange={set('type')} style={glassInput}>
              <option value="school" style={{ color: '#000' }}>School</option>
              <option value="tutor" style={{ color: '#000' }}>Tutor organisation</option>
            </select>
          </div>
        </div>
        <div>
          <label style={label} htmlFor="o-address">Address (optional)</label>
          <input id="o-address" value={form.address} onChange={set('address')} maxLength={200} style={glassInput} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="o-country">Country (optional)</label>
            <input id="o-country" value={form.country} onChange={set('country')} maxLength={60} style={glassInput} />
          </div>
          <div>
            <label style={label} htmlFor="o-email">Contact email (optional)</label>
            <input id="o-email" type="email" value={form.contactEmail} onChange={set('contactEmail')} maxLength={120} style={glassInput} />
          </div>
        </div>
      </div>
      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button disabled={saving} onClick={save} style={smallBtn}>{saving ? 'Creating...' : 'Create organisation'}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
      <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.75rem' }}>It appears in the sign-up list straight away.</p>
    </div>
  )
}

export default function AdminOrgs() {
  const { data, loading, error, reload } = useApiData('/api/admin/orgs')
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const orgs = data?.orgs || []

  return (
    <StudentPage title="Organisations" icon="🏫" backPath="/admin/dashboard" maxWidth={1000}>
      {!creating && <div style={{ marginBottom: '1.25rem' }}><button onClick={() => { setCreating(true); setNotice('') }} style={smallBtn}>+ New organisation</button></div>}
      {creating && <CreateOrg onCancel={() => setCreating(false)} onDone={() => { setCreating(false); setNotice('Organisation created.'); reload() }} />}
      {notice && <p style={{ color: '#7CFC9A', fontSize: '0.9rem', marginBottom: '1rem' }}>{notice}</p>}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}

      {data && (orgs.length === 0
        ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No organisations yet.</div>
        : orgs.map(o => (
          <div key={o.id} style={{ ...panel, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{o.type === 'school' ? '🏫' : '📖'} {o.name}</div>
                <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {[o.address, o.country].filter(Boolean).join(', ') || 'No address'}
                  {o.contactEmail ? ` · ${o.contactEmail}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip color="#8fd3ff">{o.type === 'school' ? 'School' : 'Tutor organisation'}</Chip>
                <Chip color={o.isActive ? '#7CFC9A' : '#ff8f8f'}>{o.isActive ? 'Active' : 'Inactive'}</Chip>
              </div>
            </div>
            <div style={{ ...muted, fontSize: '0.8rem', marginTop: '0.6rem' }}>
              {o.memberCount === null ? '' : `${o.memberCount} member${o.memberCount === 1 ? '' : 's'} · `}created {new Date(o.createdAt).toLocaleDateString()}
            </div>
          </div>
        )))}
    </StudentPage>
  )
}
