import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { useT } from '../../i18n'
import { glassBtn, glassInput } from '../../styles/glass'
import Icon from '../../components/shared/Icon'
import GradeSubjectFields from '../../components/student/GradeSubjectFields'
import { AuthPage, Card, Field, PasswordInput, Notice, linkStyle } from './authUi'

const API_URL = import.meta.env.VITE_API_URL
const ROLES = ['student', 'tutor', 'parent', 'teacher', 'principal', 'staff']

export default function Register() {
  const { type: rawType } = useParams()
  const type = rawType === 'schoolmember' ? 'staff' : rawType   // the old address still works
  const navigate = useNavigate()
  const t = useT()
  const isAdmin = type === 'admin'
  const validRole = isAdmin || ROLES.includes(type)
  const isStudent = type === 'student'

  const [form, setForm] = useState({ name: '', username: '', org: '', email: '', password: '', adminKey: '' })
  const [unameStatus, setUnameStatus] = useState({ state: 'idle', msg: '' })   // idle | checking | ok | bad
  const [orgSearch, setOrgSearch] = useState('')
  const [orgs, setOrgs] = useState([])
  const [filteredOrgs, setFilteredOrgs] = useState([])
  const [showOrgDropdown, setShowOrgDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [verifyChoice, setVerifyChoice] = useState('now')
  const [grade, setGrade] = useState('')
  const [subjects, setSubjects] = useState([])

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const friendly = (err) => {
    const m = (err?.message || '').toLowerCase()
    if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return t('auth.errExists')
    if (m.includes('password')) return t('auth.errWeak')
    if (m.includes('valid email') || m.includes('invalid email')) return t('auth.errEmail')
    if (m.includes('rate limit') || m.includes('too many')) return t('auth.errRate')
    if (m.includes('failed to fetch')) return t('auth.errNetwork')
    return t('auth.errRegister')
  }

  useEffect(() => {
    if (isAdmin) return
    let cancelled = false
    ;(async () => {
      // A public view that only exposes id, name and type of active organisations
      const { data, error: loadErr } = await supabase.from('organizations_public').select('id, name, type').order('name')
      if (cancelled) return
      if (loadErr) { console.error(loadErr); setError(t('auth.orgLoadFail')); return }
      setOrgs(data || [])
    })()
    return () => { cancelled = true }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Check the username with the API shortly after the user stops typing
  useEffect(() => {
    if (isAdmin) return undefined
    const u = form.username.trim().toLowerCase()
    if (!u) { setUnameStatus({ state: 'idle', msg: '' }); return undefined }
    if (!/^[a-z0-9._]{3,20}$/.test(u)) { setUnameStatus({ state: 'bad', msg: t('auth.unameFormat') }); return undefined }
    setUnameStatus({ state: 'checking', msg: t('auth.unameChecking') })
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/username-available?u=${encodeURIComponent(u)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) setUnameStatus({ state: 'idle', msg: '' })   // the server checks again on submit
        else if (data.available) setUnameStatus({ state: 'ok', msg: t('auth.unameOk') })
        else setUnameStatus({ state: 'bad', msg: t('auth.unameTaken') })
      } catch { if (!cancelled) setUnameStatus({ state: 'idle', msg: '' }) }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [form.username, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOrgSearch = (val) => {
    setOrgSearch(val)
    setForm(f => ({ ...f, org: '' }))
    if (!val) { setFilteredOrgs([]); setShowOrgDropdown(false); return }
    setFilteredOrgs(orgs.filter(o => o.name.toLowerCase().includes(val.toLowerCase())))
    setShowOrgDropdown(true)
  }
  const selectOrg = (org) => { setForm(f => ({ ...f, org: org.id })); setOrgSearch(org.name); setShowOrgDropdown(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const email = form.email.trim().toLowerCase()
    const name = form.name.trim()
    const username = form.username.trim().toLowerCase()

    if (!isAdmin) {
      if (!/^[a-z0-9._]{3,20}$/.test(username)) return setError(t('auth.errUsername'))
      if (unameStatus.state === 'bad') return setError(unameStatus.msg)
      if (!form.org) return setError(t('auth.errOrg'))
    }
    if (isStudent && (!grade || subjects.length === 0)) return setError(t('auth.errGradeSubjects'))

    setLoading(true)
    try {
      if (isAdmin) {
        const res = await fetch(`${API_URL}/api/admin/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password: form.password, adminKey: form.adminKey }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw Object.assign(new Error(data.error || 'register'), res.status === 403 ? { display: t('auth.invalidAdminKey') } : {})
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (signInErr) throw signInErr
        try { localStorage.setItem('montemy_role', 'admin') } catch { /* ignore */ }
        navigate('/admin/dashboard')
        return
      }

      // "Verify later": the server creates the account with the email pre-approved, so the user can sign in now
      if (verifyChoice === 'later') {
        const res = await fetch(`${API_URL}/api/auth/register-later`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email, password: form.password, role: type, orgId: form.org, ...(isStudent ? { grade, subjects } : {}) }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'register')
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (signInErr) throw signInErr
        try { localStorage.setItem('montemy_role', type) } catch { /* ignore */ }
        navigate('/pending-verification')
        return
      }

      // The profile rows are created by a database trigger from the details passed here
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email, password: form.password,
        options: { data: { name, username, role: type, org_id: form.org, ...(isStudent ? { grade, subjects } : {}) }, emailRedirectTo: `${window.location.origin}/login` },
      })
      if (signUpErr) throw signUpErr
      // Supabase hides duplicate emails by returning a user with no identities
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('already exists')
      try { localStorage.setItem('montemy_role', type) } catch { /* ignore */ }
      setConfirmEmail(email)
    } catch (err) {
      console.error(err)
      setError(err.display || friendly(err))
    }
    setLoading(false)
  }

  if (confirmEmail) {
    return (
      <AuthPage backTo="/">
        <Card style={{ textAlign: 'center' }}>
          <div aria-hidden style={{ display: 'inline-flex', marginBottom: 'var(--sp-4)' }}><Icon name="mail" size="3.5rem" strokeWidth={1.5} /></div>
          <h2 style={{ fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-3)' }}>{t('auth.checkEmail')}</h2>
          <p style={{ lineHeight: 1.7, marginBottom: '0.75rem', overflowWrap: 'anywhere' }}>{t('auth.checkEmailText', { email: confirmEmail })}</p>
          <p style={{ color: 'var(--fg-muted)', lineHeight: 1.7, marginBottom: 'var(--sp-5)', fontSize: 'var(--fs-sm)' }}>{t('auth.afterLogin')}</p>
          <button onClick={() => navigate('/login')} style={glassBtn}>{t('auth.goLogin')}</button>
        </Card>
      </AuthPage>
    )
  }

  const unameColor = unameStatus.state === 'bad' ? 'var(--fg)' : 'var(--fg-muted)'

  return (
    <AuthPage backTo="/create-account" maxWidth="32rem">
      <Card>
        <h2 style={{ textAlign: 'center', fontSize: 'var(--fs-2xl)', marginBottom: 'var(--sp-5)' }}>
          {isAdmin ? t('auth.createAdmin') : t('auth.createRole', { role: t(`shell.role_${type}`) })}
        </h2>

        {!validRole && <Notice>{t('auth.unknownType')}</Notice>}
        <Notice>{error}</Notice>

        <form onSubmit={handleSubmit}>
          <Field id="reg-name" label={t('auth.fullName')}>
            <input id="reg-name" style={glassInput} value={form.name} onChange={setField('name')} placeholder={t('auth.fullNamePlaceholder')} autoComplete="name" required />
          </Field>

          {!isAdmin && (
            <Field id="reg-username" label={t('auth.username')}
              hint={unameStatus.msg ? <div role="status" style={{ fontSize: 'var(--fs-xs)', marginTop: '0.4rem', color: unameColor }}>{unameStatus.msg}</div> : null}>
              <input id="reg-username" style={glassInput} value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                placeholder={t('auth.usernamePlaceholder')} maxLength={20} autoComplete="off" autoCapitalize="none" required />
            </Field>
          )}

          {!isAdmin && (
            <div style={{ marginBottom: 'var(--sp-4)', position: 'relative' }}>
              <label htmlFor="reg-org" style={{ display: 'block', fontSize: 'var(--fs-sm)', marginBottom: '0.4rem', fontWeight: 600 }}>{t('auth.orgLabel')}</label>
              <input id="reg-org" style={glassInput} value={orgSearch} onChange={e => handleOrgSearch(e.target.value)}
                placeholder={t('auth.orgPlaceholder')} autoComplete="off" role="combobox" aria-expanded={showOrgDropdown} aria-controls="reg-org-list" />
              {showOrgDropdown && (
                <ul id="reg-org-list" role="listbox" style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, position: 'absolute', insetInline: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', zIndex: 100, maxHeight: '13rem', overflowY: 'auto' }}>
                  {filteredOrgs.length === 0 ? (
                    <li style={{ padding: '1rem', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>{t('auth.noResults')}</li>
                  ) : filteredOrgs.map(org => (
                    <li key={org.id} role="option" aria-selected={form.org === org.id}>
                      <button type="button" onClick={() => selectOrg(org)}
                        style={{ width: '100%', textAlign: 'start', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{org.name}</span>
                        <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-xs)', flexShrink: 0 }}>{org.type === 'tutor' ? t('shell.orgFirm') : t('shell.orgSchool')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isStudent && <GradeSubjectFields grade={grade} subjects={subjects} onGrade={setGrade} onSubjects={setSubjects} />}

          <Field id="reg-email" label={t('auth.email')}>
            <input id="reg-email" style={glassInput} type="email" value={form.email} onChange={setField('email')} placeholder={t('auth.emailPlaceholder')} autoComplete="email" required />
          </Field>

          <Field id="reg-password" label={t('auth.password')}>
            <PasswordInput id="reg-password" value={form.password} onChange={setField('password')} placeholder={t('auth.createPasswordPlaceholder')} autoComplete="new-password" required minLength={6} />
          </Field>

          {isAdmin && (
            <Field id="reg-key" label={t('auth.adminKey')}>
              <input id="reg-key" style={glassInput} type="password" value={form.adminKey} onChange={setField('adminKey')} placeholder={t('auth.adminKeyPlaceholder')} autoComplete="off" required />
            </Field>
          )}

          {!isAdmin && (
            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 var(--sp-5)', minWidth: 0 }}>
              <legend style={{ fontSize: 'var(--fs-sm)', marginBottom: '0.4rem', fontWeight: 600, padding: 0 }}>{t('auth.emailVerification')}</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.75rem' }}>
                {[['now', 'verifyNow'], ['later', 'verifyLater']].map(([val, key]) => (
                  <label key={val} style={{ cursor: 'pointer', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: verifyChoice === val ? '2px solid var(--fg)' : '1px solid var(--border-strong)', background: 'var(--surface)', display: 'block' }}>
                    <input type="radio" name="verify" value={val} checked={verifyChoice === val} onChange={() => setVerifyChoice(val)}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                    <span style={{ display: 'block', fontWeight: 700 }}>{t(`auth.${key}`)}</span>
                    <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 'var(--fs-xs)', marginTop: '0.25rem' }}>{t(`auth.${key}Sub`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button type="submit" disabled={loading || !validRole} style={{ ...glassBtn, opacity: loading || !validRole ? 0.7 : 1 }}>
            {loading ? t('auth.creating') : t('auth.createAccount')}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-4)' }}>
          {t('auth.haveAccount')}{' '}<button type="button" style={linkStyle} onClick={() => navigate('/login')}>{t('auth.loginHere')}</button>
        </p>
      </Card>
    </AuthPage>
  )
}
