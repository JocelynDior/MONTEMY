import React from 'react'
import { useNavigate } from 'react-router-dom'

const s = { navy: 'var(--color-bg)', turquoise: 'var(--color-primary)' }

export default function Sidebar({ links = [], active = '' }) {
  const navigate = useNavigate()
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', width: '220px', minHeight: '100vh', padding: '1rem', flexShrink: 0 }}>
      {links.map(link => (
        <button key={link.path} onClick={() => navigate(link.path)}
          style={{ display: 'block', width: '100%', padding: '0.8rem 1rem', marginBottom: '0.5rem', background: active === link.path ? s.turquoise : 'none', color: active === link.path ? s.navy : 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: active === link.path ? 'bold' : 'normal' }}>
          {link.label}
        </button>
      ))}
    </div>
  )
}
