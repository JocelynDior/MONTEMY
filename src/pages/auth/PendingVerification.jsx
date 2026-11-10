import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import { logout, ROLE_ROUTES } from '../../supabase/authHelpers'
import Background from '../../components/shared/Background'
import Icon from '../../components/shared/Icon'
import { glassCard, glassBtn } from '../../styles/glass'

export default function PendingVerification() {
  const navigate = useNavigate()
  const t = useT()
  const { role, isVerified, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(false)

  // As soon as the account is approved, go to the real home page
  useEffect(() => {
    if (isVerified && role && ROLE_ROUTES[role]) navigate(ROLE_ROUTES[role], { replace: true })
  }, [isVerified, role, navigate])

  const handleLogout = async () => { await logout(); navigate('/') }
  const handleCheck = async () => { setChecking(true); await refreshProfile(); setChecking(false); setChecked(true) }

  const outline = { ...glassBtn, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }

  return (
    <div style={{ minHeight: 'var(--app-height)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'var(--fg)',
      padding: 'var(--sp-5) calc(var(--page-gutter) + var(--safe-right)) var(--sp-5) calc(var(--page-gutter) + var(--safe-left))' }}>
      <Background />
      <div style={{ ...glassCard, padding: 'var(--sp-6) var(--sp-5)', maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
        <div aria-hidden style={{ display: 'inline-flex', marginBottom: 'var(--sp-4)' }}><Icon name="clock" size="3.5rem" strokeWidth={1.5} /></div>
        <h2 style={{ fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-4)' }}>{t('auth.pendingTitle')}</h2>
        <div style={{ height: 1, background: 'var(--border)', margin: 'var(--sp-4) 0' }} />
        <p style={{ lineHeight: 1.7, marginBottom: '0.75rem' }}>{t('auth.pendingIntro')}</p>
        <p style={{ color: 'var(--fg-muted)', lineHeight: 1.7, marginBottom: 'var(--sp-4)', fontSize: 'var(--fs-sm)' }}>{t('auth.pendingText')}</p>

        {checked && !isVerified && <p role="status" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>{t('auth.stillWaiting')}</p>}

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <button onClick={() => navigate(ROLE_ROUTES[role] || '/login')} style={glassBtn}>{t('auth.viewHome')}</button>
          <button onClick={handleCheck} disabled={checking} style={{ ...outline, opacity: checking ? 0.7 : 1 }}>{checking ? t('auth.checking') : t('auth.checkStatus')}</button>
          <button onClick={handleLogout} style={outline}>{t('shell.logOut')}</button>
        </div>
      </div>
    </div>
  )
}
