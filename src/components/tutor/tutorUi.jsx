import React from 'react'

export const sessionStatusColor = (status) =>
  status === 'completed' ? '#7CFC9A' : status === 'cancelled' ? '#ff8f8f' : '#8fd3ff'

export const sessionStatusLabel = (status) =>
  status === 'completed' ? 'Completed' : status === 'cancelled' ? 'Cancelled' : 'Scheduled'

export const fmtDuration = (mins) => {
  if (!mins) return ''
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          style={{
            cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem',
            fontWeight: value === t.key ? 700 : 400,
            border: value === t.key ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
            background: value === t.key ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
