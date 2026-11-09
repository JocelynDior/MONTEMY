import React from 'react'
import FeatureIcon from '../shared/FeatureIcon'
import Icon from '../shared/Icon'
import { useT } from '../../i18n'

const GAP = 'clamp(1rem, 5vw, 1.75rem)'
const CIRCLE = 'clamp(5.25rem, 30vw, 8rem)'

// The home circles: 2 columns, more rows added downwards (the page scrolls, nothing slides sideways).
// A last circle on its own row sits in the middle of that row. The name is under each circle, no description.
// items: [{ key, icon, label, locked, onOpen }]. A locked circle shows a lock and its onOpen should lead to the verification page.
export default function FeatureGrid({ items }) {
  const t = useT()
  const odd = items.length % 2 === 1

  return (
    <ul style={{
      listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      columnGap: GAP, rowGap: 'clamp(1.1rem, 5vw, 1.75rem)',
    }}>
      {items.map((it, i) => {
        const last = odd && i === items.length - 1
        return (
          <li key={it.key} style={{
            minWidth: 0, display: 'flex', justifyContent: 'center',
            ...(last ? { gridColumn: '1 / -1' } : null),
          }}>
            <button onClick={it.onOpen}
              aria-label={it.locked ? `${it.label}, ${t('shell.lockedHint')}` : it.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', background: 'none', border: 'none',
                padding: '0.25rem', cursor: 'pointer', color: 'var(--fg)', width: '100%', maxWidth: '11rem', minWidth: 0, borderRadius: 'var(--radius-md)',
              }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ display: 'inline-flex', opacity: it.locked ? 0.4 : 1 }}>
                  <FeatureIcon name={it.icon} size={CIRCLE} />
                </span>
                {it.locked && (
                  // The lock sits on the circle's lower edge
                  <span aria-hidden style={{
                    position: 'absolute', bottom: '0', insetInlineEnd: '0', width: '2rem', height: '2rem', borderRadius: '50%',
                    background: 'var(--bg)', color: 'var(--fg)', border: '2px solid var(--fg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="lock" size="1rem" />
                  </span>
                )}
              </span>
              <span style={{ fontSize: 'var(--fs-md)', fontWeight: 600, textAlign: 'center', lineHeight: 1.25, overflowWrap: 'anywhere', minWidth: 0, maxWidth: '100%' }}>
                {it.label}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
