import React from 'react'
import { AVATARS } from '../../config/avatars'
import { useT } from '../../i18n'

// A grid of the 10 avatars. value = the chosen key, onChange(key). Photos cannot be uploaded.
// Used by Settings and by the Help chat when the assistant offers to change the picture.
export default function AvatarPicker({ value, onChange, disabled, size = '3.5rem' }) {
  const t = useT()
  return (
    <div role="radiogroup" aria-label={t('settings.avatar')} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${size}, 1fr))`, gap: '0.6rem', justifyItems: 'center' }}>
      {AVATARS.map(a => {
        const on = a.key === value
        return (
          <button key={a.key} type="button" role="radio" aria-checked={on} aria-label={t('settings.avatarN', { n: a.label })} disabled={disabled} onClick={() => onChange(a.key)}
            style={{ padding: 2, width: size, height: size, borderRadius: '50%', cursor: disabled ? 'default' : 'pointer', background: 'var(--bg)',
              border: on ? '3px solid var(--fg)' : '1px solid var(--border-strong)', outline: 'none', opacity: disabled ? 0.6 : 1, boxSizing: 'border-box' }}>
            <img src={a.file} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block' }} />
          </button>
        )
      })}
    </div>
  )
}
