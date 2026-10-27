import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { glassBtn, glassCard, C } from '../../styles/glass'

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
  const { session } = useAuth()
  const { appName } = useBranding()
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

  return (
    <div role="dialog" aria-label={`Install ${appName}`}
      style={{ ...glassCard, position: 'fixed', left: '1rem', right: '1rem', bottom: '1rem', maxWidth: '28rem', margin: '0 auto', padding: '0.9rem 1rem', zIndex: 1000, color: 'white' }}>
      <div style={{ fontWeight: 700, color: C.turquoise, marginBottom: '0.25rem' }}>Install {appName}</div>
      {deferred ? (
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.7rem' }}>Add it to your home screen for quick access, like an app.</p>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.7rem' }}>
          In Safari, tap the Share button, then choose <strong>Add to Home Screen</strong>.
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        {deferred && <button onClick={install} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }}>Install</button>}
        <button onClick={dismiss}
          style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0, background: 'transparent', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
          Not now
        </button>
      </div>
    </div>
  )
}
