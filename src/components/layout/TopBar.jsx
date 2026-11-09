import React from 'react'
import { useBranding } from '../../context/BrandingContext'
import { useOrg } from '../../context/OrgContext'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'
import NotificationBell from './NotificationBell'

// The bar at the top of every home screen: notification bell on the left, the school or firm name in the
// centre (in the brand font), the menu icon on the right. Admins have no organisation, so they see Montemy.
// The order mirrors in right-to-left languages.
export default function TopBar({ onMenu, menuOpen }) {
  const t = useT()
  const { appName } = useBranding()
  const { orgName } = useOrg()
  const title = orgName || appName

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg)', borderBottom: '1px solid var(--border)',
      padding: 'var(--safe-top) calc(var(--page-gutter) - 0.5rem + var(--safe-right)) 0 calc(var(--page-gutter) - 0.5rem + var(--safe-left))',
    }}>
      <div style={{ height: '3.5rem', display: 'grid', gridTemplateColumns: '2.75rem minmax(0, 1fr) 2.75rem', alignItems: 'center', gap: '0.25rem' }}>
        <NotificationBell />
        <h1 style={{
          margin: 0, textAlign: 'center', fontFamily: 'var(--font-brand)', fontWeight: 400, fontSize: 'var(--fs-2xl)', lineHeight: 1.15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>
          {title}
        </h1>
        <button onClick={onMenu} aria-label={t('shell.openMenu')} aria-haspopup="dialog" aria-expanded={!!menuOpen}
          style={{ width: '2.75rem', height: '2.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', padding: 0 }}>
          <Icon name="menu" size="1.5rem" />
        </button>
      </div>
    </header>
  )
}
