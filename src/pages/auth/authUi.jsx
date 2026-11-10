import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'
import { useT } from '../../i18n'
import Background from '../../components/shared/Background'
import Icon from '../../components/shared/Icon'
import { glassCard, glassInput, glassNav } from '../../styles/glass'

// Shared pieces of the sign-in and registration pages (black and white, tokens only, right-to-left safe).

export const labelStyle = { display: 'block', fontSize: 'var(--fs-sm)', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--fg)' }

// Page frame: plain background, a top bar with a back button and the app name, then a centred column.
export function AuthPage({ children, backTo = '/', maxWidth = '28rem' }) {
  const navigate = useNavigate()
  const t = useT()
  const { appName } = useBranding()
  return (
    <div style={{ minHeight: 'var(--app-height)', position: 'relative', color: 'var(--fg)' }}>
      <Background />
      <nav style={{ ...glassNav, justifyContent: 'flex-start', flexWrap: 'nowrap', gap: '0.75rem' }}>
        <button type="button" onClick={() => navigate(backTo)} aria-label={t('common.back')}
          style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', display: 'inline-flex', padding: '0.4rem', margin: '-0.4rem' }}>
          <Icon name="back" size="1.4rem" />
        </button>
        <span style={{ fontFamily: 'var(--font-brand)', fontSize: 'var(--fs-2xl)', lineHeight: 1.1, minWidth: 0, overflowWrap: 'anywhere' }}>{appName}</span>
      </nav>
      <div style={{ maxWidth, margin: '0 auto', minWidth: 0, padding: 'var(--sp-5) calc(var(--page-gutter) + var(--safe-right)) calc(var(--sp-6) + var(--safe-bottom)) calc(var(--page-gutter) + var(--safe-left))' }}>
        {children}
      </div>
    </div>
  )
}

export function Card({ children, style }) {
  return <div style={{ ...glassCard, padding: 'var(--sp-5)', ...style }}>{children}</div>
}

export function Field({ id, label, hint, children }) {
  return (
    <div style={{ marginBottom: 'var(--sp-4)', minWidth: 0 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      {children}
      {hint}
    </div>
  )
}

// Password box with an SVG show/hide button
export function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'current-password', required, minLength }) {
  const t = useT()
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        autoComplete={autoComplete} required={required} minLength={minLength}
        style={{ ...glassInput, paddingInlineEnd: '3rem' }} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={show}
        style={{ position: 'absolute', insetInlineEnd: '0.4rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', display: 'inline-flex', padding: '0.5rem' }}>
        <Icon name={show ? 'eye-off' : 'eye'} size="1.25rem" />
      </button>
    </div>
  )
}

export function Notice({ children, kind = 'error' }) {
  if (!children) return null
  return (
    <div role={kind === 'error' ? 'alert' : 'status'}
      style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>
      <Icon name={kind === 'error' ? 'warning' : 'check'} style={{ marginTop: '0.15em', flexShrink: 0 }} />
      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  )
}

export const linkStyle = { background: 'none', border: 'none', padding: 0, color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
