import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { useT } from '../../i18n'
import { logout } from '../../supabase/authHelpers'
import { getAvatar } from '../../config/avatars'
import { PAGE_ICONS, featureLabelKey, featuresFor, isLocked, routeForPage } from '../../config/roleFeatures'
import FeatureIcon from '../shared/FeatureIcon'
import Icon from '../shared/Icon'

// Slides the panel in from the menu side: the right in English, the left in Arabic and Urdu.
const CSS = `
@keyframes mm-drawer-in { from { transform: translateX(var(--mm-from)); } to { transform: none; } }
@keyframes mm-veil-in { from { opacity: 0; } to { opacity: 1; } }
.mm-drawer { --mm-from: 100%; animation: mm-drawer-in 0.22s ease-out; }
[dir="rtl"] .mm-drawer { --mm-from: -100%; }
.mm-veil { animation: mm-veil-in 0.2s ease-out; }
@media (prefers-reduced-motion: reduce) { .mm-drawer, .mm-veil { animation: none; } }
`

function Avatar({ profile, size = '3.5rem' }) {
  const picture = getAvatar(profile?.avatar_key) || profile?.avatar_url || null
  const initial = (profile?.name || '?').trim().charAt(0).toUpperCase()
  return (
    <span aria-hidden style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-2)', border: '1px solid var(--border-strong)', boxSizing: 'border-box',
    }}>
      {picture
        ? <img src={picture} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.7rem', lineHeight: 1 }}>{initial}</span>}
    </span>
  )
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: '0.85rem', width: '100%', minHeight: '2.9rem', padding: '0.45rem 1.1rem',
  background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer', color: 'var(--fg)', textAlign: 'start',
  fontSize: 'var(--fs-md)', minWidth: 0,
}
const textStyle = { minWidth: 0, flex: 1, overflowWrap: 'anywhere', lineHeight: 1.25 }

// The menu opened from the top bar. From the top: profile picture with the name beside it and the role under the name;
// the features the user has; Settings, Help, Privacy Policy, Terms and Conditions, More Info and Log Out; and last a line
// labelled Home Features followed by the home circles.
export default function SideDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const t = useT()
  const { profile, role, isVerified } = useAuth()
  const { isFirm } = useOrgTerms()
  const closeRef = useRef(null)
  const features = featuresFor(role)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    // The page behind does not scroll while the menu is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const go = (route) => { onClose(); navigate(route) }
  const goFeature = (entry) => go(isLocked(entry, role, isVerified) ? '/pending-verification' : entry.route)
  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/')
  }

  const featureRow = (entry) => {
    const locked = isLocked(entry, role, isVerified)
    return (
      <li key={entry.page + entry.route}>
        <button onClick={() => goFeature(entry)} style={{ ...rowStyle, opacity: locked ? 0.6 : 1 }}>
          <FeatureIcon name={PAGE_ICONS[entry.label || entry.page] || PAGE_ICONS[entry.page]} size="2.1rem" />
          <span style={textStyle}>{t(featureLabelKey(entry, isFirm))}</span>
          {locked && <Icon name="lock" size="1rem" />}
        </button>
      </li>
    )
  }

  const plain = (icon, label, route) => (
    <li key={route}>
      <button onClick={() => go(route)} style={rowStyle}>
        <Icon name={icon} size="1.5rem" style={{ marginInline: '0.3rem' }} />
        <span style={textStyle}>{label}</span>
      </button>
    </li>
  )

  const list = { listStyle: 'none', margin: 0, padding: 0 }
  const divider = { height: 1, background: 'var(--border)', margin: '0.5rem 0' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <style>{CSS}</style>
      <div className="mm-veil" onClick={onClose} aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
      <aside className="mm-drawer" role="dialog" aria-modal="true" aria-label={t('shell.menu')}
        style={{
          position: 'absolute', top: 0, bottom: 0, insetInlineEnd: 0, width: 'min(21rem, 88vw)', background: 'var(--bg)', color: 'var(--fg)',
          borderInlineStart: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column',
          paddingBottom: 'var(--safe-bottom)', paddingTop: 'var(--safe-top)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem 0.6rem 1rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <Avatar profile={profile} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', lineHeight: 1.2, overflowWrap: 'anywhere' }}>{profile?.name || ''}</div>
            {role && <div style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: '0.15rem' }}>{t(`shell.role_${role}`)}</div>}
          </div>
          <button ref={closeRef} onClick={onClose} aria-label={t('shell.closeMenu')}
            style={{ width: '2.75rem', height: '2.75rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', padding: 0 }}>
            <Icon name="close" size="1.4rem" />
          </button>
        </div>

        <nav style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '0.5rem 0' }}>
          {features.menu.length > 0 && (
            <>
              <ul style={list}>{features.menu.map(featureRow)}</ul>
              <div style={divider} />
            </>
          )}

          <ul style={list}>
            {plain('settings', t('shell.settings'), '/settings')}
            {plain('help', t('shell.f_help'), routeForPage(role, 'help') || '/help')}
            {plain('privacy', t('shell.privacyPolicy'), '/privacy')}
            {plain('terms', t('shell.termsAndConditions'), '/terms')}
            {plain('info', t('shell.moreInfo'), '/more-info')}
            <li>
              <button onClick={handleLogout} style={rowStyle}>
                <Icon name="logout" size="1.5rem" style={{ marginInline: '0.3rem' }} />
                <span style={textStyle}>{t('shell.logOut')}</span>
              </button>
            </li>
          </ul>

          <div style={divider} />
          <h2 style={{ margin: 0, padding: '0.6rem 1.1rem 0.35rem', fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('shell.homeFeatures')}
          </h2>
          <ul style={list}>{features.circles.map(featureRow)}</ul>
        </nav>
      </aside>
    </div>
  )
}
