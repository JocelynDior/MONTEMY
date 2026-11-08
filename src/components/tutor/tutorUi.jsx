import React from 'react'

// Statuses are told apart by their word, never by colour alone. The greys only add emphasis:
// completed is strongest, scheduled is normal, cancelled is faded.
export const sessionStatusColor = (status) =>
  status === 'completed' ? 'var(--fg)' : status === 'cancelled' ? 'var(--fg-subtle)' : 'var(--fg-muted)'

// Pass t (from useT()) to get the word in the user's language; without it the English word is returned.
export const sessionStatusLabel = (status, t) => {
  const key = status === 'completed' ? 'statusCompleted' : status === 'cancelled' ? 'statusCancelled' : 'statusScheduled'
  if (t) return t(`common.${key}`)
  return status === 'completed' ? 'Completed' : status === 'cancelled' ? 'Cancelled' : 'Scheduled'
}

export const fmtDuration = (mins) => {
  if (!mins) return ''
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// The selected tab is filled (white on black or black on white); the others are outlined.
export function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
      {tabs.map(t => {
        const active = value === t.key
        return (
          <button key={t.key} onClick={() => onChange(t.key)} aria-pressed={active}
            style={{
              cursor: 'pointer', padding: '0.5rem 1.1rem', minHeight: '2.5rem', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-sm)',
              fontWeight: active ? 700 : 400, maxWidth: '100%', overflowWrap: 'anywhere',
              color: active ? 'var(--on-fg)' : 'var(--fg)',
              border: active ? '1px solid var(--fg)' : '1px solid var(--border-strong)',
              background: active ? 'var(--fg)' : 'transparent',
            }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
