import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { glassBtn, C } from '../../styles/glass'

const ICONS = { info: 'ℹ️', success: '✅', warning: '⚠️' }
const ACCENT = { info: '#8fd3ff', success: '#7CFC9A', warning: '#ffe08a' }

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (!Number.isFinite(secs) || secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// Navbar bell: unread badge, dropdown of recent notifications, click to open the related page
export default function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, unread, loaded, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (n) => {
    markRead(n.id)
    if (n.link) { setOpen(false); navigate(n.link) }
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="true" aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1rem', margin: 0, position: 'relative' }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '1.2rem', height: '1.2rem', padding: '0 0.3rem', borderRadius: '999px', background: '#ff5a5f', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.navy}` }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Notifications"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 0.6rem)', width: 'min(380px, 92vw)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', background: C.navy, border: `1px solid ${C.turquoise}`, borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <strong style={{ color: C.turquoise }}>Notifications</strong>
            <button onClick={markAllRead} disabled={unread === 0}
              style={{ background: 'none', border: 'none', color: unread ? C.turquoise : 'rgba(255,255,255,0.35)', cursor: unread ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: 600 }}>
              Mark all as read
            </button>
          </div>

          <div style={{ overflowY: 'auto' }}>
            {!loaded ? (
              <p style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Loading...</p>
            ) : notifications.length === 0 ? (
              <p style={{ padding: '1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', textAlign: 'center' }}>You're all caught up.</p>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => openItem(n)}
                style={{ display: 'flex', gap: '0.7rem', width: '100%', textAlign: 'left', padding: '0.8rem 1rem', background: n.read ? 'transparent' : 'rgba(var(--color-primary-rgb),0.12)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: n.link || !n.read ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '1.1rem', lineHeight: 1.3 }}>{ICONS[n.type] || ICONS.info}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.88rem', lineHeight: 1.4, overflowWrap: 'anywhere', fontWeight: n.read ? 400 : 600 }}>{n.content}</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.2rem', color: ACCENT[n.type] || ACCENT.info }}>{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span aria-label="Unread" style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', background: '#ff5a5f', marginTop: '0.4rem', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
