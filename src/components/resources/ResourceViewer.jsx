import React, { useEffect, useState } from 'react'
import { useT } from '../../i18n/index.js'
import Icon from '../shared/Icon'
import { fetchPreviewUrl, kindOf } from './resourceUtils'

const btn = { padding: '0.45rem 1rem', fontSize: '0.85rem', margin: 0, borderRadius: '999px', border: '1px solid rgba(128,128,128,0.4)', background: 'var(--color-primary)', color: 'var(--color-bg)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }

// Full-screen preview for a PDF or image. Sized to fill the viewport (dvh) so it fits the
// screen on mobile browsers too, where 100vh can overshoot behind the address bar.
export default function ResourceViewer({ resource, onClose, onDownload }) {
  const t = useT()
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let made = null
    fetchPreviewUrl(resource.id)
      .then(u => { if (cancelled) URL.revokeObjectURL(u); else { made = u; setUrl(u) } })
      .catch(err => { if (!cancelled) setError(err.message || t('shared.resources.errPreview')) })
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made) }
  }, [resource.id])

  const kind = kindOf(resource.mimeType)

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-bg)', border: '2px solid var(--color-primary)', borderRadius: '0.9rem', width: '100%', maxWidth: '62rem', height: '94dvh', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(128,128,128,0.25)', flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--color-primary)', flex: 1, minWidth: '10rem', overflowWrap: 'anywhere' }}>{resource.title}</strong>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>{t('shared.resources.openNewTab')}</a>}
          <button onClick={onDownload} style={btn}><Icon name="download" size={14} />{t('shared.resources.download')}</button>
          <button onClick={onClose} aria-label={t('shared.resources.closePreview')}
            style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', display: 'flex', padding: '0.2rem' }}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, background: kind === 'image' ? 'rgba(0,0,0,0.4)' : 'var(--surface, #2b2b2e)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
          {error ? <p style={{ color: '#ffb3b3', padding: '1rem', textAlign: 'center' }}>{error}</p>
            : !url ? <p style={{ color: 'var(--fg-muted, rgba(128,128,128,0.9))' }}>{t('shared.resources.loadingPreview')}</p>
            : kind === 'image' ? <img src={url} alt={resource.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <iframe src={url} title={resource.title} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
      </div>
    </div>
  )
}
