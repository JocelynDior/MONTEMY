import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import { useBranding } from '../../context/BrandingContext'
import { useI18n } from '../../i18n'
import Background from '../../components/shared/Background'
import { glassCard, glassBtn } from '../../styles/glass'

export default function Landing() {
  const navigate = useNavigate()
  const { t, lang, setLang, languages } = useI18n()
  const { appName } = useBranding()

  // A visitor who is already signed in goes straight to their home page (the route guards do the same)
  useEffect(() => {
    const go = (session) => {
      if (!session) return
      let role = null
      try { role = localStorage.getItem('montemy_role') } catch { /* ignore */ }
      if (role && ROLE_ROUTES[role]) navigate(ROLE_ROUTES[role])
    }
    supabase.auth.getSession().then(({ data: { session } }) => go(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => go(session))
    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div style={{ minHeight: 'var(--app-height)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'var(--fg)',
      padding: 'var(--sp-5) calc(var(--page-gutter) + var(--safe-right)) var(--sp-5) calc(var(--page-gutter) + var(--safe-left))' }}>
      <Background />

      <div style={{ ...glassCard, padding: 'var(--sp-6) var(--sp-5)', maxWidth: '26rem', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--fs-sm)', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>{t('auth.welcomeTo')}</div>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: 'clamp(2.25rem, 12vw, 3.5rem)', lineHeight: 1.05, marginBottom: '0.75rem', overflowWrap: 'anywhere' }}>{appName}</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-md)', lineHeight: 1.6, marginBottom: 'var(--sp-5)' }}>{t('auth.tagline')}</p>

        <div style={{ height: 1, background: 'var(--border)', marginBottom: 'var(--sp-5)' }} />

        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <button onClick={() => navigate('/login')} style={glassBtn}>{t('auth.login')}</button>
          <button onClick={() => navigate('/create-account')} style={{ ...glassBtn, background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }}>{t('auth.createAccount')}</button>
        </div>

        <div style={{ marginTop: 'var(--sp-5)' }}>
          <label htmlFor="landing-lang" style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginBottom: '0.3rem' }}>{t('auth.language')}</label>
          <select id="landing-lang" value={lang} onChange={(e) => setLang(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: '1rem', fontFamily: 'inherit' }}>
            {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
          </select>
        </div>

        <p style={{ color: 'var(--fg-subtle)', fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-5)' }}>{t('auth.copyright', { year: new Date().getFullYear(), app: appName })}</p>
      </div>
    </div>
  )
}
