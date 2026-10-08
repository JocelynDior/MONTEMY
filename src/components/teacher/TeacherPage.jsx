import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassNav, glassBtn, C } from '../../styles/glass'

// Page frame for teacher sub-pages: background, branded navbar, title
export default function TeacherPage({ title, icon, children, maxWidth = 960 }) {
  const navigate = useNavigate()
  const { appName, logoUrl } = useBranding()

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
      )}

      <nav style={glassNav}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: '1.8rem' }} />}
          {appName}
        </span>
        <button onClick={() => navigate('/teacher/dashboard')}
          style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }}>
          Dashboard
        </button>
      </nav>

      <div style={{ maxWidth, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h2 style={{ color: C.turquoise, fontSize: '1.8rem', marginBottom: '1.25rem' }}>{icon} {title}</h2>
        {children}
      </div>
    </div>
  )
}
