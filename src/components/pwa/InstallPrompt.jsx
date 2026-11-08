import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { glassBtn, glassCard } from '../../styles/glass'
import { useT } from '../../i18n'

const KEY = 'montemy_install_dismissed'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

const snoozed = () => {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < SNOOZE_MS } catch { return false }
}
const snooze = () => { try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ } }

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

// "Add to Home Screen" banner for signed-in users. Chrome and Edge give us an install event;
// iOS Safari has none, so there we show the manual steps instead.
export default function InstallPrompt() {
  const t = useT()
  const { session } = useAuth()
  const { appName, logoUrl } = useBranding()
  const [deferred, setDeferred] = useState(null)
  const [hidden, setHidden] = useState(() => snoozed() || isStandalone())

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    const onInstalled = () => { setDeferred(null); setHidden(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const ios = isIos()
  if (!session || hidden || (!deferred && !ios)) return null

  const dismiss = () => { snooze(); setHidden(true) }
  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice.catch(() => ({}))
    setDeferred(null)
    if (outcome !== 'accepted') dismiss()
    else setHidden(true)
  }

  const small = { ...glassBtn, width: 'auto', margin: 0 }
  return (
    <div role="dialog" aria-label={t('common.installTitle', { appName })}
      style={{
        ...glassCard, position: 'fixed', zIndex: 1000, margin: '0 auto', maxWidth: '28rem', overflow: 'visible',
        left: 'calc(var(--page-gutter) + var(--safe-left))', right: 'calc(var(--page-gutter) + var(--safe-right))',
        bottom: 'calc(var(--bottom-bar-h) + var(--safe-bottom) + 0.75rem)',   // sits above the bottom bar
        padding: 'var(--sp-3) var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start',
      }}>
      <img src={logoUrl || '/icons/icon-192%20(2).png'} alt="" width="40" height="40"
        style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t('common.installTitle', { appName })}</div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginBottom: '0.7rem' }}>
          {deferred ? t('common.installText') : t('common.installIos')}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {deferred && <button onClick={install} style={small}>{t('common.install')}</button>}
          <button onClick={dismiss} style={{ ...small, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }}>
            {t('common.notNow')}
          </button>
        </div>
      </div>
    </div>
  )
}
