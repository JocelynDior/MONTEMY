import React, { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'

// Slim banner while the device has no connection. The app shell still opens offline;
// pages that need fresh data show the last copy if there is one, or a "try again" message.
export default function OfflineBanner() {
  const t = useT()
  const [online, setOnline] = useState(() => navigator.onLine !== false)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  if (online) return null
  return (
    <div role="status" aria-live="polite"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
        padding: 'calc(0.45rem + var(--safe-top)) calc(var(--page-gutter) + var(--safe-right)) 0.45rem calc(var(--page-gutter) + var(--safe-left))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textAlign: 'center',
        fontSize: 'var(--fs-sm)', fontWeight: 600, background: 'var(--fg)', color: 'var(--bg)' }}>
      <Icon name="wifi-off" />
      <span style={{ minWidth: 0 }}>{t('common.offline')}</span>
    </div>
  )
}
