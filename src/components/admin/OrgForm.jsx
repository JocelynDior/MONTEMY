import React, { useRef, useState } from 'react'
import { supabase } from '../../supabase/client'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem' }
const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }

export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp'
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

// Returns an error message when the file can't be used as a logo, otherwise ''
export function checkLogoFile(file) {
  if (!LOGO_TYPES.includes(file.type)) return 'Use a PNG, JPG or WebP image for the logo.'
  if (file.size > LOGO_MAX_BYTES) return 'That logo is too big. The limit is 2MB.'
  return ''
}

// Three steps: ask the API for an upload token, send the file straight to Storage, then tell the API to save it
export async function uploadOrgLogo(orgId, file) {
  const problem = checkLogoFile(file)
  if (problem) throw new Error(problem)
  const { path, token } = await apiFetch(`/api/admin/orgs/${orgId}/logo/upload-url`, {
    method: 'POST', body: { mimeType: file.type, size: file.size },
  })
  const { error } = await supabase.storage.from('org-logos').uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) throw new Error('The logo could not be uploaded. Check your connection and try again.')
  const res = await apiFetch(`/api/admin/orgs/${orgId}/logo`, { method: 'POST', body: { path } })
  return res.logoUrl
}

// Round logo, or the first letter of the name when there is no logo yet
export function OrgAvatar({ name, logoUrl, size = 44 }) {
  const box = { width: size, height: size, borderRadius: '12px', flexShrink: 0 }
  if (logoUrl) {
    return <img src={logoUrl} alt="" style={{ ...box, objectFit: 'contain', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} />
  }
  return (
    <div aria-hidden="true" style={{ ...box, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.45,
      color: 'var(--color-primary)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
      {(name || '?').trim().charAt(0).toUpperCase()}
    </div>
  )
}

// Create or edit an organisation. Pass `org` to edit (the type is then fixed).
export function OrgForm({ org, onDone, onCancel }) {
  const editing = !!org
  const [form, setForm] = useState({
    name: org?.name || '',
    type: org?.type || 'school',
    address: org?.address || '',
    country: org?.country || '',
    contactEmail: org?.contactEmail || '',
    specialisation: org?.specialisation || '',
  })
  const [logo, setLogo] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const isTutor = form.type === 'tutor'

  const pickLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const problem = checkLogoFile(file)
    if (problem) { setError(problem); e.target.value = ''; return }
    setError('')
    setLogo(file)
  }

  const save = async (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return setError('Enter the organisation name.')
    setSaving(true); setError('')
    try {
      if (editing) {
        await apiFetch(`/api/admin/orgs/${org.id}`, { method: 'PATCH', body: form })
        onDone('Changes saved.')
      } else {
        const { id } = await apiFetch('/api/admin/orgs', { method: 'POST', body: form })
        let notice = 'Organisation created.'
        if (logo) {
          try { await uploadOrgLogo(id, logo) } catch (err) { notice = `Organisation created, but the logo was not saved: ${err.message}` }
        }
        onDone(notice)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>{editing ? `Edit ${org.name}` : 'New organisation'}</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div style={grid}>
          <div>
            <label style={label} htmlFor="o-name">Name</label>
            <input id="o-name" value={form.name} onChange={set('name')} maxLength={120} style={glassInput} placeholder="e.g. Greenfield High School" />
          </div>
          <div>
            <label style={label} htmlFor="o-type">Type</label>
            <select id="o-type" value={form.type} onChange={set('type')} disabled={editing} style={{ ...glassInput, opacity: editing ? 0.6 : 1 }}>
              <option value="school" style={{ color: '#000' }}>School</option>
              <option value="tutor" style={{ color: '#000' }}>Tutor organisation</option>
            </select>
          </div>
        </div>
        {isTutor && (
          <div>
            <label style={label} htmlFor="o-spec">Specialisation (optional)</label>
            <input id="o-spec" value={form.specialisation} onChange={set('specialisation')} maxLength={120} style={glassInput} placeholder="e.g. Maths and Physical Sciences, Grades 10-12" />
          </div>
        )}
        <div>
          <label style={label} htmlFor="o-address">Address (optional)</label>
          <input id="o-address" value={form.address} onChange={set('address')} maxLength={200} style={glassInput} />
        </div>
        <div style={grid}>
          <div>
            <label style={label} htmlFor="o-country">Country (optional)</label>
            <input id="o-country" value={form.country} onChange={set('country')} maxLength={60} style={glassInput} />
          </div>
          <div>
            <label style={label} htmlFor="o-email">Contact email (optional)</label>
            <input id="o-email" type="email" value={form.contactEmail} onChange={set('contactEmail')} maxLength={120} style={glassInput} />
          </div>
        </div>
        {!editing && (
          <div>
            <label style={label} htmlFor="o-logo">Logo (optional, PNG, JPG or WebP up to 2MB)</label>
            <input id="o-logo" ref={fileRef} type="file" accept={LOGO_ACCEPT} onChange={pickLogo} disabled={saving} style={{ color: 'white', fontSize: '0.9rem' }} />
          </div>
        )}
      </div>
      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button type="submit" disabled={saving} style={smallBtn}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create organisation'}</button>
        <button type="button" disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
      {!editing && <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.75rem' }}>It appears in the sign-up list straight away.</p>}
    </form>
  )
}

// Upload, replace or remove an existing organisation's logo
export function OrgLogoControl({ org, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    try {
      await uploadOrgLogo(org.id, file)
      onChanged('Logo updated.')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  const remove = async () => {
    if (!window.confirm('Remove this logo?')) return
    setBusy(true); setError('')
    try {
      await apiFetch(`/api/admin/orgs/${org.id}/logo`, { method: 'DELETE' })
      onChanged('Logo removed.')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
        <OrgAvatar name={org.name} logoUrl={org.logoUrl} size={64} />
        <input ref={fileRef} type="file" accept={LOGO_ACCEPT} onChange={pick} disabled={busy} style={{ display: 'none' }} aria-label="Choose a logo file" />
        <button disabled={busy} onClick={() => fileRef.current?.click()} style={smallBtn}>
          {busy ? 'Working...' : org.logoUrl ? 'Replace logo' : 'Upload logo'}
        </button>
        {org.logoUrl && !busy && <button onClick={remove} style={dangerBtn}>Remove</button>}
      </div>
      <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.5rem' }}>PNG, JPG or WebP, up to 2MB. This is the organisation's own logo. White label branding is set separately.</p>
      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.85rem', marginTop: '0.4rem' }}>{error}</p>}
    </div>
  )
}
