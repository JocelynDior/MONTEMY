import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../supabase/client'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { buildTheme, DEFAULT_BRANDING } from '../../context/BrandingContext'
import { checkLogoFile, LOGO_ACCEPT } from './OrgForm'
import { ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'
import { glassInput } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }

// WCAG contrast ratio between two #rrggbb colours
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0)
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function Preview({ form }) {
  const theme = useMemo(() => buildTheme({ ...DEFAULT_BRANDING, primaryColor: form.primaryColor, bgColor: form.bgColor }), [form.primaryColor, form.bgColor])
  const name = form.appName.trim() || 'Montemy'
  return (
    <div aria-label="Live preview" style={{ ...theme, borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', color: 'white',
      background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
          {form.logoUrl && <img src={form.logoUrl} alt="" style={{ height: '1.5rem' }} />}{name}
        </span>
        <span style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: '8px', padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 700 }}>Dashboard</span>
      </div>
      <div style={{ padding: '1rem', display: 'grid', gap: '0.7rem' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Student Dashboard</div>
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--color-primary-rgb),0.4)', borderRadius: '12px', padding: '0.8rem' }}>
          <div style={{ fontWeight: 700 }}>📚 My Subjects</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>View your subjects and learning materials</div>
        </div>
        <span style={{ justifySelf: 'start', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: '10px', padding: '0.45rem 1rem', fontWeight: 700, fontSize: '0.85rem' }}>Primary button</span>
      </div>
    </div>
  )
}

// Admin tab: switch an organisation's white label on or off and set its name, colours and logo
export default function WhiteLabelManager() {
  const orgsReq = useApiData('/api/admin/orgs')
  const fileRef = useRef(null)
  const [orgId, setOrgId] = useState('')
  const [form, setForm] = useState(null)       // the values on screen
  const [saved, setSaved] = useState(null)     // the values stored
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const orgs = (orgsReq.data?.orgs || [])
  const org = orgs.find(o => o.id === orgId)

  useEffect(() => {
    if (!orgId) { setForm(null); setSaved(null); return }
    let cancelled = false
    setLoading(true); setError(''); setOk('')
    apiFetch(`/api/admin/orgs/${orgId}/branding`)
      .then(d => { if (!cancelled) { setForm(d.branding); setSaved(d.branding) } })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId])

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setOk('') }
  const dirty = form && saved && ['enabled', 'appName', 'primaryColor', 'bgColor'].some(k => form[k] !== saved[k])
  const ratio = form ? contrast(form.primaryColor, form.bgColor) : 21

  const save = async () => {
    setBusy(true); setError(''); setOk('')
    try {
      const r = await apiFetch(`/api/admin/orgs/${orgId}/branding`, {
        method: 'PUT', body: { enabled: form.enabled, appName: form.appName, primaryColor: form.primaryColor, bgColor: form.bgColor },
      })
      setForm(r.branding); setSaved(r.branding)
      setOk(r.branding.enabled ? 'Saved. People at this organisation see the new branding the next time the app loads.' : 'Saved. White label is off, so this organisation sees the standard Montemy look.')
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setOk('')
    const problem = checkLogoFile(file)
    if (problem) return setError(problem)
    setLogoBusy(true)
    try {
      const { path, token } = await apiFetch(`/api/admin/orgs/${orgId}/logo/upload-url`, { method: 'POST', body: { mimeType: file.type, size: file.size } })
      const { error: upErr } = await supabase.storage.from('org-logos').uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (upErr) throw new Error('The logo could not be uploaded. Check your connection and try again.')
      const r = await apiFetch(`/api/admin/orgs/${orgId}/branding/logo`, { method: 'POST', body: { path } })
      setForm(f => ({ ...f, logoUrl: r.branding.logoUrl })); setSaved(s => ({ ...s, logoUrl: r.branding.logoUrl }))
      setOk('Logo saved.')
    } catch (err) { setError(err.message) }
    setLogoBusy(false)
  }

  const removeLogo = async () => {
    setLogoBusy(true); setError(''); setOk('')
    try {
      await apiFetch(`/api/admin/orgs/${orgId}/branding/logo`, { method: 'DELETE' })
      setForm(f => ({ ...f, logoUrl: '' })); setSaved(s => ({ ...s, logoUrl: '' }))
    } catch (err) { setError(err.message) }
    setLogoBusy(false)
  }

  return (
    <div>
      <p style={{ ...muted, marginBottom: '1rem' }}>
        White label gives an organisation its own app name, colours and logo. Organisations with it switched off see the standard Montemy look.
      </p>

      {orgsReq.error && <ErrorBox message={orgsReq.error} onRetry={orgsReq.reload} />}
      <select aria-label="Organisation" value={orgId} onChange={e => setOrgId(e.target.value)} style={{ ...glassInput, marginBottom: '1.25rem' }}>
        <option value="" style={{ color: '#000' }}>Choose an organisation</option>
        {orgs.map(o => <option key={o.id} value={o.id} style={{ color: '#000' }}>{o.name}{o.isActive ? '' : ' (inactive)'}</option>)}
      </select>

      {loading && <SkeletonList />}
      {error && !form && <ErrorBox message={error} />}

      {form && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '1.25rem', alignItems: 'start' }}>
          <div style={panel}>
            <h3 style={panelTitle}>{org?.name || 'Organisation'}</h3>

            <label style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', cursor: 'pointer', marginBottom: '1rem' }}>
              <input type="checkbox" checked={form.enabled} onChange={e => { setForm(f => ({ ...f, enabled: e.target.checked })); setOk('') }} style={{ width: '1.2rem', height: '1.2rem' }} />
              <span style={{ fontWeight: 700 }}>White label {form.enabled ? 'ON' : 'OFF'}</span>
            </label>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div>
                <label style={label} htmlFor="wl-name">App name</label>
                <input id="wl-name" value={form.appName} onChange={set('appName')} maxLength={30} style={glassInput} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
                <div>
                  <label style={label} htmlFor="wl-primary">Main colour</label>
                  <input id="wl-primary" type="color" value={form.primaryColor} onChange={set('primaryColor')} style={{ ...glassInput, padding: '0.25rem', height: '2.8rem' }} />
                </div>
                <div>
                  <label style={label} htmlFor="wl-bg">Background colour</label>
                  <input id="wl-bg" type="color" value={form.bgColor} onChange={set('bgColor')} style={{ ...glassInput, padding: '0.25rem', height: '2.8rem' }} />
                </div>
              </div>
              {ratio < 4.5 && (
                <p role="alert" style={{ color: '#ffd166', fontSize: '0.85rem' }}>
                  These two colours are hard to tell apart (contrast {ratio.toFixed(1)}:1). Text may be difficult to read. Aim for 4.5:1 or more.
                </p>
              )}

              <div>
                <span style={label}>Logo (also used as the browser tab icon)</span>
                <input ref={fileRef} type="file" accept={LOGO_ACCEPT} onChange={onLogo} style={{ display: 'none' }} aria-label="Choose a logo" />
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {form.logoUrl && <img src={form.logoUrl} alt="Current logo" style={{ height: '2.5rem', maxWidth: '8rem', objectFit: 'contain', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.2rem' }} />}
                  <button type="button" disabled={logoBusy} onClick={() => fileRef.current?.click()} style={ghostBtn}>{logoBusy ? 'Working...' : form.logoUrl ? 'Change logo' : 'Upload logo'}</button>
                  {form.logoUrl && <button type="button" disabled={logoBusy} onClick={removeLogo} style={ghostBtn}>Remove</button>}
                </div>
                <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.3rem' }}>PNG, JPG or WebP, up to 2MB. Logo changes save straight away.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
              <button disabled={busy || !dirty} onClick={save} style={{ ...smallBtn, opacity: busy || !dirty ? 0.6 : 1 }}>{busy ? 'Saving...' : 'Save branding'}</button>
              {dirty && <button disabled={busy} onClick={() => { setForm(saved); setOk('') }} style={ghostBtn}>Discard changes</button>}
            </div>
            {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
            {ok && <p role="status" style={{ color: '#7be3b1', fontSize: '0.9rem', marginTop: '0.75rem' }}>{ok}</p>}
          </div>

          <div>
            <h3 style={{ ...panelTitle, marginBottom: '0.5rem' }}>Live preview {!form.enabled && <span style={{ ...muted, fontSize: '0.8rem' }}>(white label is off, so users see the standard look)</span>}</h3>
            <Preview form={form} />
          </div>
        </div>
      )}
    </div>
  )
}
