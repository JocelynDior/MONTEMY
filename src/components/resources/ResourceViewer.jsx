import React, { useEffect, useState } from 'react'
import { fetchPreviewUrl, kindOf } from './resourceUtils'
import { glassBtn, C } from '../../styles/glass'

// Full-screen preview for a PDF or image
export default function ResourceViewer({ resource, onClose, onDownload }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let made = null
    fetchPreviewUrl(resource.id)
      .then(u => { if (cancelled) URL.revokeObjectURL(u); else { made = u; setUrl(u) } })
      .catch(err => { if (!cancelled) setError(err.message || 'Could not load the preview.') })
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made) }
  }, [resource.id])

  const kind = kindOf(resource.mimeType)
  const btn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', margin: 0 }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.navy, border: `2px solid ${C.turquoise}`, borderRadius: '12px', width: '100%', maxWidth: '980px', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.15)', flexWrap: 'wrap' }}>
          <strong style={{ color: C.turquoise, flex: 1, minWidth: '160px', overflowWrap: 'anywhere' }}>{resource.title}</strong>
          {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.turquoise, fontSize: '0.85rem' }}>Open in new tab</a>}
          <button onClick={onDownload} style={btn}>Download</button>
          <button onClick={onClose} aria-label="Close preview"
            style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, background: kind === 'image' ? 'rgba(0,0,0,0.4)' : '#525659', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
          {error ? <p style={{ color: '#ffb3b3', padding: '1rem', textAlign: 'center' }}>{error}</p>
            : !url ? <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading preview...</p>
            : kind === 'image' ? <img src={url} alt={resource.title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <iframe src={url} title={resource.title} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
      </div>
    </div>
  )
}
