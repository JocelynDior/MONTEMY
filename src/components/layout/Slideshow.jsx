import React, { useEffect, useState } from 'react'
import { useOrg } from '../../context/OrgContext'
import { useBranding } from '../../context/BrandingContext'
import { useT } from '../../i18n'

const LOGO = '4.75rem'       // the school logo is a circle this wide
const INTERVAL_MS = 2000     // a new slide every 2 seconds

// The banner under the top bar. It shows the school's slides, changing every 2 seconds (paused while the tab is hidden),
// or a plain black and white placeholder when the school has none. The school logo sits at the bottom-left corner, half over
// the banner and half below it, like a profile photo over a cover image (bottom-right in right-to-left languages).
// Slides come from OrgContext, which the admin fills in School Management.
export default function Slideshow() {
  const t = useT()
  const { slides, logoUrl, orgName } = useOrg()
  const { appName } = useBranding()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  const [logoBroken, setLogoBroken] = useState(false)
  const count = slides.length

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  // Start again from the first slide if the list changes (for example after the admin removes one)
  useEffect(() => { setIndex(0) }, [count])
  useEffect(() => { setLogoBroken(false) }, [logoUrl])

  useEffect(() => {
    if (count < 2 || !visible) return undefined
    const id = setInterval(() => setIndex(i => (i + 1) % count), INTERVAL_MS)
    return () => clearInterval(id)
  }, [count, visible])

  const name = orgName || appName
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  // Fetch the next slide in the background so it is ready when it fades in
  const nextUrl = count > 1 ? slides[(index + 1) % count]?.imageUrl : null
  useEffect(() => {
    if (!nextUrl) return
    const img = new Image()
    img.src = nextUrl
  }, [nextUrl])

  return (
    <section aria-label={t('shell.slideshowLabel')} style={{ position: 'relative', width: '100%', marginBottom: `calc(${LOGO} / 2 + var(--sp-3))` }}>
      <div style={{
        position: 'relative', width: '100%', height: 'clamp(8.5rem, 30vw, 19rem)', overflow: 'hidden',
        background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
      }}>
        {count === 0 ? (
          // No slides yet: a plain placeholder with a thin diagonal pattern, so it reads as "empty" in both modes
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(var(--fg-rgb), 0.07) 14px 15px)',
          }} />
        ) : slides.map((s, i) => (
          <img key={s.id || s.imageUrl} src={s.imageUrl} alt={s.caption || ''} draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: i === index ? 1 : 0, transition: 'opacity 0.5s ease', pointerEvents: 'none',
            }} />
        ))}
        {count > 0 && slides[index]?.caption && (
          <div style={{
            position: 'absolute', insetInline: 0, bottom: 0, padding: '0.4rem var(--page-gutter)',
            paddingInlineStart: `calc(var(--page-gutter) + ${LOGO} + 0.75rem)`,
            background: 'rgba(var(--bg-rgb), 0.82)', color: 'var(--fg)', fontSize: 'var(--fs-sm)', overflowWrap: 'anywhere',
          }}>
            {slides[index].caption}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', insetInlineStart: 'calc(var(--page-gutter) + var(--safe-left))', bottom: `calc(${LOGO} / -2)`,
        width: LOGO, height: LOGO, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg)', border: '3px solid var(--bg)',
        boxShadow: '0 0 0 1px var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
      }}>
        {logoUrl && !logoBroken ? (
          <img src={logoUrl} alt={name} draggable={false} onError={() => setLogoBroken(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <span aria-hidden style={{ fontFamily: 'var(--font-brand)', fontSize: '2.2rem', lineHeight: 1, color: 'var(--fg)' }}>{initial}</span>
        )}
      </div>
    </section>
  )
}
