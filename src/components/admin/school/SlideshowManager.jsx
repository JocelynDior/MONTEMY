import { useT } from '../../../i18n/index.js'
import React, { useRef, useState } from 'react'
import { apiFetch } from '../../../api/apiClient'
import { useApiData } from '../../../hooks/useApiData'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../parent/parentUi'
import { glassInput } from '../../../styles/glass'
import SkeletonList from '../../shared/Skeleton'
import Icon from '../../icons/Icon'

const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result) // data URL
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function SlideshowManager({ orgId }) {
  const t = useT()
  const fileRef = useRef(null)
  const { data, loading, error, reload } = useApiData(`/api/slideshow?orgId=${orgId}`)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const slides = data?.slides || []

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setUploadError('Use an image file (PNG, JPG or WebP).')
    if (file.size > 5 * 1024 * 1024) return setUploadError('The image is too large. Maximum is 5 MB.')
    setUploadError(''); setUploading(true)
    try {
      const image = await toBase64(file)
      await apiFetch('/api/slideshow', { method: 'POST', body: { orgId, image, caption: caption.trim() || undefined } })
      setCaption('')
      reload()
    } catch (err) {
      setUploadError(err.message)
    }
    setUploading(false)
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await apiFetch(`/api/slideshow/${id}`, { method: 'DELETE' })
      setConfirmId(null)
      reload()
    } catch {}
    setBusy(false)
  }

  const moveUp = async (index) => {
    if (index === 0) return
    const ids = slides.map(s => s.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    await apiFetch('/api/slideshow/order', { method: 'PUT', body: { orgId, ids } })
    reload()
  }

  const moveDown = async (index) => {
    if (index === slides.length - 1) return
    const ids = slides.map(s => s.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    await apiFetch('/api/slideshow/order', { method: 'PUT', body: { orgId, ids } })
    reload()
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Upload form */}
      <div style={panel}>
        <p style={{ ...muted, marginBottom: '0.75rem', fontSize: '0.88rem' }}>{t('school.slideshow.addImage')} — PNG, JPG or WebP, up to 5 MB.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={120} placeholder={t('school.slideshow.caption')}
            style={{ ...glassInput, flex: '1 1 200px' }} />
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} style={{ display: 'none' }} />
          <button disabled={uploading} onClick={() => fileRef.current?.click()} style={smallBtn}>
            <Icon name="upload" size={15} style={{ marginRight: '0.4rem' }} />
            {uploading ? 'Uploading…' : t('school.slideshow.upload')}
          </button>
        </div>
        {uploadError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.5rem' }}>{uploadError}</p>}
      </div>

      {/* Slide list */}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}
      {data && slides.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('school.slideshow.noSlides')}</div>
      )}

      {slides.map((slide, i) => (
        <div key={slide.id} style={{ ...panel, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={slide.imageUrl} alt={slide.caption || 'Slide'} style={{ width: 100, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: '120px', ...muted, fontSize: '0.88rem' }}>{slide.caption || <em>No caption</em>}</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button disabled={i === 0} onClick={() => moveUp(i)} style={ghostBtn} aria-label="Move up"><Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} /></button>
            <button disabled={i === slides.length - 1} onClick={() => moveDown(i)} style={ghostBtn} aria-label="Move down"><Icon name="chevron" size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
            {confirmId === slide.id ? (
              <>
                <button disabled={busy} onClick={() => remove(slide.id)} style={dangerBtn}>{busy ? '…' : 'Yes, remove'}</button>
                <button onClick={() => setConfirmId(null)} style={ghostBtn}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmId(slide.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Live preview */}
      {slides.length > 0 && (
        <div style={panel}>
          <p style={{ ...muted, fontSize: '0.88rem', marginBottom: '0.6rem' }}>{t('school.slideshow.livePreview')}</p>
          <img src={slides[0].imageUrl} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10 }} />
        </div>
      )}
    </div>
  )
}
