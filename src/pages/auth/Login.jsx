import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { getProfile, ROLE_ROUTES, homeRouteFor } from '../../supabase/authHelpers'
import { useAuth } from '../../context/AuthContext'
import { useT } from '../../i18n'
import { glassBtn, glassInput } from '../../styles/glass'
import { AuthPage, Card, Field, PasswordInput, Notice, linkStyle } from './authUi'

const API_URL = import.meta.env.VITE_API_URL

// One sign-in form. The password box is checked against the admin key first (on the server, the key stays on Render).
// If it matches, the admin sign-in step opens. Otherwise the normal email and password sign-in runs.
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const { holdRedirect } = useAuth()
  const [step, setStep] = useState(location.pathname === '/admin-login' ? 'admin' : 'user')
  const [form, setForm] = useState({ email: '', password: '' })
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const friendly = (err) => {
    const m = (err?.message || '').toLowerCase()
    if (m.includes('invalid login credentials')) return t('auth.errInvalid')
    if (m.includes('email not confirmed')) return t('auth.errConfirm')
    if (m.includes('failed to fetch') || m.includes('network')) return t('auth.errNetwork')
    if (m.includes('rate limit') || m.includes('too many')) return t('auth.errRate')
    return t('auth.errGeneric')
  }

  // Sign out and show an error (used when a check fails after a successful sign-in)
  const rejectLogin = async (message) => {
    await supabase.auth.signOut()
    try { localStorage.removeItem('montemy_role') } catch { /* ignore */ }
    setError(message)
  }

  // Does what was typed in the password box match the admin key? Any failure counts as "no".
  const matchesAdminKey = async (value) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/validate-key`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminKey: value }),
      })
      if (!res.ok) return false
      const body = await res.json().catch(() => ({}))
      return body.valid === true
    } catch { return false }
  }

  const finish = async (profile) => {
    try { localStorage.setItem('montemy_role', profile.role) } catch { /* ignore */ }
    navigate(homeRouteFor(profile))
  }

  const submitUser = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.password) return setError(t('auth.enterDetails'))
    setLoading(true)
    try {
      if (await matchesAdminKey(form.password)) {
        setAdminKey(form.password)
        setForm(f => ({ ...f, password: '' }))
        setStep('admin')
        return
      }
      const email = form.email.trim().toLowerCase()
      if (!email) return setError(t('auth.enterDetails'))

      holdRedirect(true) // stop the route guard redirecting before our checks finish
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (signInErr) throw signInErr
      const profile = await getProfile(data.user.id)
      if (!profile || !ROLE_ROUTES[profile.role]) return await rejectLogin(t('auth.noProfile'))
      if (profile.role === 'admin') return await rejectLogin(t('auth.adminUseKey'))
      await finish(profile)
    } catch (err) {
      console.error(err)
      setError(friendly(err))
    } finally {
      holdRedirect(false)
      setLoading(false)
    }
  }

  const submitAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    holdRedirect(true)
    try {
      const email = form.email.trim().toLowerCase()
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
      if (signInErr) throw signInErr
      const profile = await getProfile(data.user.id)
      if (!profile || !ROLE_ROUTES[profile.role]) return await rejectLogin(t('auth.noProfile'))
      if (profile.role !== 'admin') return await rejectLogin(t('auth.notAdmin'))

      let res
      try {
        res = await fetch(`${API_URL}/api/admin/login-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ adminKey }),
        })
      } catch { return await rejectLogin(t('auth.errNetwork')) }
      if (!res.ok) return await rejectLogin(t('auth.invalidAdminKey'))
      await finish(profile)
    } catch (err) {
      console.error(err)
      setError(friendly(err))
    } finally {
      holdRedirect(false)
      setLoading(false)
    }
  }

  const isAdminStep = step === 'admin'
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <AuthPage backTo="/">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
          <h1 style={{ fontSize: 'var(--fs-2xl)', marginBottom: '0.25rem' }}>{isAdminStep ? t('auth.adminTitle') : t('auth.welcomeBack')}</h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>{isAdminStep ? t('auth.adminSubtitle') : t('auth.signInSubtitle')}</p>
        </div>

        <Notice>{error}</Notice>

        <form onSubmit={isAdminStep ? submitAdmin : submitUser} noValidate={!isAdminStep}>
          <Field id="login-email" label={t('auth.email')}>
            <input id="login-email" type="email" value={form.email} onChange={set('email')} placeholder={t('auth.emailPlaceholder')}
              autoComplete="email" required={isAdminStep} style={glassInput} />
          </Field>
          <Field id="login-password" label={t('auth.password')}>
            <PasswordInput id="login-password" value={form.password} onChange={set('password')} placeholder={t('auth.passwordPlaceholder')} required={isAdminStep} />
          </Field>

          {isAdminStep && (
            <Field id="login-key" label={t('auth.adminKey')}>
              <PasswordInput id="login-key" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder={t('auth.adminKeyPlaceholder')} autoComplete="off" required />
            </Field>
          )}

          <button type="submit" disabled={loading} style={{ ...glassBtn, opacity: loading ? 0.7 : 1 }}>
            {loading ? t('auth.signingIn') : (isAdminStep ? t('auth.adminSignIn') : t('auth.login'))}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)' }}>
          {isAdminStep ? (
            <button type="button" style={linkStyle} onClick={() => { setStep('user'); setAdminKey(''); setError('') }}>{t('auth.backToSignIn')}</button>
          ) : (
            <>{t('auth.noAccount')}{' '}<button type="button" style={linkStyle} onClick={() => navigate('/create-account')}>{t('auth.createOne')}</button></>
          )}
        </p>
      </Card>
    </AuthPage>
  )
}
