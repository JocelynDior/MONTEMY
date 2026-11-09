import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useI18n } from '../../i18n'
import Icon from '../shared/Icon'

// Notification types are told apart by their icon, never by colour
const TYPE_ICON = { info: 'info', success: 'check', warning: 'warning' }

// "Just now", "5 min ago", "3 h ago", "2 d ago", then the date in the user's language
function timeAgo(iso, t, lang) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (!Number.isFinite(secs) || secs < 60) return t('shell.justNow')
  const mins = Math.floor(secs / 60)
  if (mins < 60) return t('shell.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('shell.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('shell.daysAgo', { n: days })
  try { return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' }) } catch { return '' }
}

// The bell at the left edge of the top bar: unread badge, a panel with the latest notifications, tap one to open its page.
// The panel is fixed under the top bar and always fits the screen width, so it never runs off a narrow phone.
export default function NotificationBell() {
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { notifications, unread, loaded, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (n) => {
    markRead(n.id)
    if (n.link) { setOpen(false); navigate(n.link) }
  }

  const label = unread ? `${t('shell.notifications')}, ${t('shell.unreadCount', { n: unread })}` : t('shell.notifications')

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'flex' }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="true" aria-expanded={open} aria-label={label}
        style={{ position: 'relative', width: '2.75rem', height: '2.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', padding: 0 }}>
        <Icon name="bell" size="1.5rem" />
        {unread > 0 && (
          <span aria-hidden style={{ position: 'absolute', top: '-0.1rem', insetInlineEnd: '-0.25rem', minWidth: '1.15rem', height: '1.15rem', padding: '0 0.28rem', borderRadius: 'var(--radius-pill)', background: 'var(--fg)', color: 'var(--on-fg)', fontSize: '0.68rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)', boxSizing: 'content-box' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label={t('shell.notifications')}
          style={{
            position: 'fixed', top: 'calc(3.5rem + var(--safe-top))', insetInlineStart: 'calc(var(--page-gutter) + var(--safe-left))',
            width: 'min(24rem, calc(100vw - 2 * var(--page-gutter) - var(--safe-left) - var(--safe-right)))',
            maxHeight: 'calc(var(--app-height) - 5rem - var(--safe-top) - var(--bottom-bar-h))',
            display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)', zIndex: 200, overflow: 'hidden', color: 'var(--fg)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{t('shell.notifications')}</strong>
            <button onClick={markAllRead} disabled={unread === 0}
              style={{ background: 'none', border: 'none', color: unread ? 'var(--fg)' : 'var(--fg-subtle)', textDecoration: unread ? 'underline' : 'none', cursor: unread ? 'pointer' : 'default', fontSize: 'var(--fs-sm)', fontWeight: 600, padding: '0.25rem', textAlign: 'end' }}>
              {t('shell.markAllRead')}
            </button>
          </div>

          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {!loaded ? (
              <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>{t('common.loading')}</p>
            ) : notifications.length === 0 ? (
              <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>{t('shell.allCaughtUp')}</p>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => openItem(n)}
                style={{ display: 'flex', gap: '0.7rem', width: '100%', textAlign: 'start', padding: '0.8rem 1rem', background: n.read ? 'transparent' : 'var(--surface-2)', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', cursor: n.link || !n.read ? 'pointer' : 'default', fontFamily: 'inherit', borderRadius: 0 }}>
                <Icon name={TYPE_ICON[n.type] || 'info'} size="1.15rem" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--fs-sm)', lineHeight: 1.4, overflowWrap: 'anywhere', fontWeight: n.read ? 400 : 700 }}>{n.content}</span>
                  <span style={{ display: 'block', fontSize: 'var(--fs-xs)', marginTop: '0.2rem', color: 'var(--fg-muted)' }}>{timeAgo(n.createdAt, t, lang)}</span>
                </span>
                {!n.read && <span aria-hidden style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', background: 'var(--fg)', marginTop: '0.4rem', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
