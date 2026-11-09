import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { useT } from '../../i18n'
import { BOTTOM_BAR, hasBottomBar, isLocked } from '../../config/roleFeatures'
import Icon from '../shared/Icon'

const BAR_HEIGHT = '3.75rem'

// The fixed bar at the bottom: Messages, School Events (Firm Events in a firm), Settings and Profile.
// Staff Members do not get it. While it is on screen it sets --bottom-bar-h, which pages use to keep their last
// line clear of it. A page that wants the bar renders <BottomBar />.
export default function BottomBar() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const t = useT()
  const { role, isVerified } = useAuth()
  const { events } = useOrgTerms()
  const { unread } = useUnreadMessages()
  const show = hasBottomBar(role)

  useEffect(() => {
    if (!show) return undefined
    document.documentElement.style.setProperty('--bottom-bar-h', BAR_HEIGHT)
    return () => document.documentElement.style.setProperty('--bottom-bar-h', '0px')
  }, [show])

  if (!show) return null

  const labelOf = { messages: t('shell.f_messages'), events, settings: t('shell.settings'), profile: t('shell.f_profile') }
  const here = `${pathname}${search}`

  return (
    <nav aria-label={t('shell.mainNav')} style={{
      position: 'fixed', insetInline: 0, bottom: 0, zIndex: 90, background: 'var(--bg)', borderTop: '1px solid var(--border)',
      padding: `0 var(--safe-right) var(--safe-bottom) var(--safe-left)`,
    }}>
      <div style={{ height: BAR_HEIGHT, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        {BOTTOM_BAR.map((item) => {
          const locked = isLocked(item, role, isVerified)
          // Settings and Profile are the same page, so only the one whose address matches is marked
          const active = item.route.includes('?') ? here === item.route : pathname === item.route && !search.includes('section=profile')
          const badge = item.page === 'messages' && !locked ? unread : 0
          return (
            <button key={item.page} onClick={() => navigate(locked ? '/pending-verification' : item.route)}
              aria-current={active ? 'page' : undefined}
              aria-label={badge ? `${labelOf[item.page]}, ${t('shell.unreadCount', { n: badge })}` : labelOf[item.page]}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', minWidth: 0,
                background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer', padding: '0.25rem 0.15rem',
                color: active ? 'var(--fg)' : 'var(--fg-muted)', opacity: locked ? 0.55 : 1,
              }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon name={item.icon} size="1.55rem" strokeWidth={active ? 2.5 : 2} />
                {locked && <Icon name="lock" size="0.7rem" strokeWidth={2.5} style={{ position: 'absolute', insetInlineEnd: '-0.4rem', bottom: '-0.15rem' }} />}
                {badge > 0 && (
                  <span aria-hidden style={{ position: 'absolute', top: '-0.45rem', insetInlineEnd: '-0.75rem', minWidth: '1.1rem', height: '1.1rem', padding: '0 0.28rem', borderRadius: 'var(--radius-pill)', background: 'var(--fg)', color: 'var(--on-fg)', fontSize: '0.65rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)', boxSizing: 'content-box' }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span style={{ maxWidth: '100%', fontSize: 'var(--fs-xs)', fontWeight: active ? 700 : 400, lineHeight: 1.15, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {labelOf[item.page]}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
