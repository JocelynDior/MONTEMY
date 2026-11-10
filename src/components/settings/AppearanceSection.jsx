import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useT } from '../../i18n'
import { apiFetch } from '../../api/apiClient'
import Icon from '../shared/Icon'
import { muted, panel, panelTitle } from '../parent/parentUi'

// A group of big radio buttons (one choice). Used by Appearance and Session.
export function ChoiceList({ label, value, options, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gap: '0.6rem' }}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button key={String(o.value)} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(o.value)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'start', padding: '0.75rem 1rem', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: '1rem',
              color: 'var(--fg)', background: on ? 'var(--surface-2)' : 'var(--surface)', border: on ? '2px solid var(--fg)' : '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', minHeight: '3rem' }}>
            <span aria-hidden style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: '2px solid var(--fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {on && <span style={{ width: '0.6rem', height: '0.6rem', borderRadius: '50%', background: 'var(--fg)' }} />}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>{o.label}</span>
              {o.hint && <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>{o.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function SavedNote({ text, error }) {
  if (!text && !error) return null
  return (
    <p role={error ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--fs-sm)', marginTop: '0.75rem' }}>
      <Icon name={error ? 'warning' : 'check'} />{error || text}
    </p>
  )
}

// Dark, Light or Default (Default follows the phone). The choice applies at once and is also saved to the account.
export default function AppearanceSection() {
  const t = useT()
  const { theme, setTheme } = useTheme()
  const [note, setNote] = useState({ text: '', error: '' })

  const choose = async (value) => {
    setTheme(value)
    setNote({ text: t('settings.saved'), error: '' })
    try { await apiFetch('/api/account/profile', { method: 'PUT', body: { preferredTheme: value } }) }
    catch { /* the choice still works on this device */ }
  }

  return (
    <section id="appearance" style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
      <h3 style={panelTitle}>{t('settings.appearance')}</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>{t('settings.appearanceText')}</p>
      <ChoiceList label={t('settings.appearance')} value={theme} onChange={choose} options={[
        { value: 'dark', label: t('settings.dark') },
        { value: 'light', label: t('settings.light') },
        { value: 'system', label: t('settings.default'), hint: t('settings.defaultHint') },
      ]} />
      <SavedNote text={note.text} error={note.error} />
    </section>
  )
}
