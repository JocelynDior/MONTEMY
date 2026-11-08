import React from 'react'
import { glassCard, glassBtn } from '../../styles/glass'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'

export const panel = { ...glassCard, padding: 'var(--sp-4)' }
export const panelTitle = { color: 'var(--fg)', fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: '0.75rem', overflowWrap: 'anywhere' }
export const muted = { color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }
export const smallBtn = { ...glassBtn, width: 'auto', padding: '0.45rem 1rem', minHeight: '2.25rem', fontSize: 'var(--fs-sm)', margin: 0 }
export const ghostBtn = { ...smallBtn, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }

// A small label. The text always says what it means, so the colour (a token, grey or black and white) is only decoration.
export function Chip({ children, color = 'var(--fg)' }) {
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-xs)', fontWeight: 700, color, border: `1px solid ${color}`, background: 'var(--surface-2)' }}>
      {children}
    </span>
  )
}

export function ErrorBox({ message, onRetry }) {
  const t = useT()
  return (
    <div role="alert" style={{ ...panel, borderColor: 'var(--border-strong)' }}>
      <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: onRetry ? '0.75rem' : 0 }}>
        <Icon name="warning" style={{ marginTop: '0.15em' }} />
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{message}</span>
      </p>
      {onRetry && <button onClick={onRetry} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>{t('common.tryAgain')}</button>}
    </div>
  )
}
