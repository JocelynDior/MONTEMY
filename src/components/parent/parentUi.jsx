import React from 'react'
import { glassCard, glassBtn, C } from '../../styles/glass'

export const panel = { ...glassCard, padding: '1.25rem' }
export const panelTitle = { color: C.turquoise, fontSize: '1.05rem', marginBottom: '0.75rem' }
export const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
export const smallBtn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', margin: 0 }
export const ghostBtn = { ...smallBtn, background: 'transparent', color: C.turquoise, border: '1px solid rgba(var(--color-primary-rgb),0.5)', boxShadow: 'none' }

export function Chip({ children, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color, border: `1px solid ${color}`, background: 'rgba(0,0,0,0.15)' }}>
      {children}
    </span>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}>
      <p style={{ color: '#ffb3b3', marginBottom: onRetry ? '0.75rem' : 0 }}>{message}</p>
      {onRetry && <button onClick={onRetry} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>}
    </div>
  )
}
