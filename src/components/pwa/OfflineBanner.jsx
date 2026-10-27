import React, { useEffect, useState } from 'react'

// Slim banner while the device has no connection. The app shell still opens offline;
// pages that need fresh data show the last copy if there is one, or a "try again" message.
export default function OfflineBanner() {
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
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000, padding: '0.45rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
        background: '#ffd166', color: '#3a2a00' }}>
      You're offline. Some things may be out of date or unavailable until you reconnect.
    </div>
  )
}
