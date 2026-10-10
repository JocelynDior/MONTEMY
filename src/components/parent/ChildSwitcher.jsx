import React from 'react'

// Pill buttons to switch between linked children. Renders nothing for a single child.
export default function ChildSwitcher({ items: kids, selectedId, onSelect }) {
  if (kids.length < 2) return null
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {kids.map(c => {
        const active = c.id === selectedId
        return (
          <button key={c.id} onClick={() => onSelect(c.id)}
            style={{
              cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem',
              fontWeight: active ? 700 : 400,
              border: active ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
              background: active ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
            }}>
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
