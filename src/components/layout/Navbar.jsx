import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'

const s = { navy: 'var(--color-bg)', turquoise: 'var(--color-primary)' }

export default function Navbar({ title, links = [] }) {
  const navigate = useNavigate()
  const { appName, logoUrl } = useBranding()
  return (
    <nav style={{ background: s.turquoise, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ color: s.navy, fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {!title && logoUrl && <img src={logoUrl} alt="" style={{ height: '1.5rem' }} />}
        {title || appName}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {links.map(link => (
          <button key={link.path} onClick={() => navigate(link.path)}
            style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            {link.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
