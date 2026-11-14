import { useT } from '../../i18n/index.js'
import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase/client'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { checkLogoFile, LOGO_ACCEPT } from './OrgForm'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../parent/parentUi'
import { glassInput } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }

// Admin branding: app name and logo only. Theme is black and white — no color pickers.
export default function WhiteLabelManager() {
  const t = useT()
  const orgsReq = useApiData('/api/admin/orgs')
  const fileRef = useRef(null)
  const [orgId, setOrgId] = useState('')
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const orgs = (orgsReq.data?.orgs || [])

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

  const dirty = form && saved && form.appName !== saved.appName

  const save = async () => {
    setBusy(true); setError(''); setOk('')
    try {
      const r = await apiFetch(`/api/admin/orgs/${orgId}/branding`, {
        method: 'PUT',
        body: { enabled: form.enabled, appName: form.appName },
      })
      setForm(r.branding); setSaved(r.branding)
      setOk(t('branding.saved'))
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
      if (upErr) throw new Error('The logo could not be uploaded.')
      const r = await apiFetch(`/api/admin/orgs/${orgId}/branding/logo`, { method: 'POST', body: { path } })
      setForm(f => ({ ...f, logoUrl: r.branding.logoUrl }))
      setSaved(s => ({ ...s, logoUrl: r.branding.logoUrl }))
      setOk(t('branding.logoSaved'))
    } catch (err) { setError(err.message) }
    setLogoBusy(false)
  }

  const removeLogo = async () => {
    setLogoBusy(true); setError(''); setOk('')
    try {
      await apiFetch(`/api/admin/orgs/${orgId}/branding/logo`, { method: 'DELETE' })
      setForm(f => ({ ...f, logoUrl: '' }))
      setSaved(s => ({ ...s, logoUrl: '' }))
    } catch (err) { setError(err.message) }
    setLogoBusy(false)
  }

  return (
    <div>
      <p style={{ ...muted, marginBottom: '1rem', fontSize: '0.9rem' }}>{t('branding.desc')}</p>

      {orgsReq.error && <ErrorBox message={orgsReq.error} onRetry={orgsReq.reload} />}
      <select aria-label={t('branding.chooseOrg')} value={orgId} onChange={e => setOrgId(e.target.value)} style={{ ...glassInput, marginBottom: '1.25rem' }}>
        <option value="" style={{ color: '#000' }}>{t('branding.chooseOrg')}</option>
        {orgs.map(o => <option key={o.id} value={o.id} style={{ color: '#000' }}>{o.name}</option>)}
      </select>

      {loading && <SkeletonList />}
      {error && !form && <ErrorBox message={error} />}

      {form && (
        <div style={{ ...panel, maxWidth: '32rem', display: 'grid', gap: '1rem' }}>
          <label style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.enabled} onChange={e => { setForm(f => ({ ...f, enabled: e.target.checked })); setOk('') }} style={{ width: '1.2rem', height: '1.2rem' }} />
            <span style={{ fontWeight: 700 }}>{t('branding.enabled')} {form.enabled ? t('branding.on') : t('branding.off')}</span>
          </label>

          <div>
            <label style={label} htmlFor="wl-name">{t('branding.appName')}</label>
            <input id="wl-name" value={form.appName} onChange={e => { setForm(f => ({ ...f, appName: e.target.value })); setOk('') }} maxLength={30} style={glassInput} />
          </div>

          <div>
            <span style={label}>{t('branding.logo')}</span>
            <input ref={fileRef} type="file" accept={LOGO_ACCEPT} onChange={onLogo} style={{ display: 'none' }} aria-label={t('branding.chooseLogo')} />
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {form.logoUrl && <img src={form.logoUrl} alt="Logo" style={{ height: '2.5rem', maxWidth: '8rem', objectFit: 'contain', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.2rem' }} />}
              <button type="button" disabled={logoBusy} onClick={() => fileRef.current?.click()} style={ghostBtn}>
                {logoBusy ? '…' : form.logoUrl ? t('branding.changeLogo') : t('branding.uploadLogo')}
              </button>
              {form.logoUrl && <button type="button" disabled={logoBusy} onClick={removeLogo} style={ghostBtn}>{t('branding.removeLogo')}</button>}
            </div>
            <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.3rem' }}>PNG, JPG or WebP, up to 2 MB.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button disabled={busy || !dirty} onClick={save} style={{ ...smallBtn, opacity: busy || !dirty ? 0.6 : 1 }}>
              {busy ? '…' : t('branding.save')}
            </button>
            {dirty && <button disabled={busy} onClick={() => { setForm(saved); setOk('') }} style={ghostBtn}>{t('branding.discard')}</button>}
          </div>
          {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{error}</p>}
          {ok && <p role="status" style={{ color: '#7be3b1', fontSize: '0.9rem' }}>{ok}</p>}
        </div>
      )}
    </div>
  )
}
