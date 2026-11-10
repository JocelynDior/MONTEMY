import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StudentPage from '../components/student/StudentPage'
import StudentProfileForm from '../components/student/StudentProfileForm'
import ParentLinks from '../components/student/ParentLinks'
import AppearanceSection, { SavedNote } from '../components/settings/AppearanceSection'
import LanguageSection from '../components/settings/LanguageSection'
import SessionSection from '../components/settings/SessionSection'
import AvatarPicker from '../components/settings/AvatarPicker'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../components/parent/parentUi'
import { apiFetch } from '../api/apiClient'
import { useApiData } from '../hooks/useApiData'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'
import { supabase } from '../supabase/client'
import { logout, ROLE_ROUTES } from '../supabase/authHelpers'
import { getAvatar } from '../config/avatars'
import { SUBJECT_OPTIONS } from '../config/studentOptions'
import { glassInput } from '../styles/glass'
import SkeletonList from '../components/shared/Skeleton'

const label = { display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginBottom: '0.3rem' }
const section = { ...panel, marginBottom: 'var(--sp-4)' }
const NOTIFY_KEYS = ['academic', 'events', 'messages', 'tutoring']

function Picture({ name, avatarKey, url, size = '5rem' }) {
  const src = getAvatar(avatarKey) || url || null
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return src
    ? <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-strong)' }} />
    : <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, background: 'var(--fg)', color: 'var(--bg)' }}>{initial}</span>
}

// ----- Profile: picture (chosen from 10 avatars), name, bio, subjects taught (teachers) -----
function ProfileSection({ account, onSaved }) {
  const t = useT()
  const { refreshProfile } = useAuth()
  const [name, setName] = useState(account.name)
  const [bio, setBio] = useState(account.bio)
  const [subjects, setSubjects] = useState(account.subjectsTaught)
  const [custom, setCustom] = useState('')
  const [avatarKey, setAvatarKey] = useState(account.avatarKey)
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [note, setNote] = useState({ text: '', error: '' })
  const isTeacher = account.role === 'teacher'

  const toggle = (s) => setSubjects(list => list.includes(s) ? list.filter(x => x !== s) : [...list, s])
  const addCustom = () => {
    const v = custom.trim().slice(0, 60)
    if (v && !subjects.some(x => x.toLowerCase() === v.toLowerCase())) setSubjects(list => [...list, v])
    setCustom('')
  }
  const options = [...SUBJECT_OPTIONS, ...subjects.filter(s => !SUBJECT_OPTIONS.includes(s))]

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setNote({ text: '', error: '' })
    if (name.trim().length < 2) { setBusy(false); return setNote({ text: '', error: t('settings.errName') }) }
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: { name, bio, ...(isTeacher ? { subjectsTaught: subjects } : {}) } })
      await refreshProfile()
      setNote({ text: t('settings.saved'), error: '' })
      onSaved()
    } catch (err) { setNote({ text: '', error: err.message }) }
    setBusy(false)
  }

  const pickAvatar = async (key) => {
    const before = avatarKey
    setAvatarKey(key); setAvatarBusy(true); setNote({ text: '', error: '' })
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: { avatarKey: key } })
      await refreshProfile()
      setNote({ text: t('settings.avatarSaved'), error: '' })
    } catch (err) { setAvatarKey(before); setNote({ text: '', error: err.message }) }
    setAvatarBusy(false)
  }

  return (
    <section id="profile" style={section}>
      <h3 style={panelTitle}>{t('settings.profile')}</h3>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Picture name={account.name} avatarKey={avatarKey} url={account.avatarUrl} />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }}>
          {account.username && <Chip>@{account.username}</Chip>}
          <Chip>{t(`shell.role_${account.role}`)}</Chip>
          {account.orgName && <span style={{ ...muted, overflowWrap: 'anywhere' }}>{account.orgName}</span>}
        </div>
      </div>

      <div style={{ marginBottom: '1.1rem' }}>
        <div style={label}>{t('settings.chooseAvatar')}</div>
        <AvatarPicker value={avatarKey} onChange={pickAvatar} disabled={avatarBusy} />
        <p style={{ ...muted, marginTop: '0.5rem', fontSize: 'var(--fs-xs)' }}>{t('settings.noPhotos')}</p>
      </div>

      <form onSubmit={save} style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="st-name">{t('settings.name')}</label>
          <input id="st-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} style={glassInput} autoComplete="name" />
        </div>
        <div>
          <label style={label} htmlFor="st-bio">{t('settings.bio')}</label>
          <textarea id="st-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3}
            style={{ ...glassInput, resize: 'vertical' }} placeholder={t('settings.bioPlaceholder')} />
        </div>

        {isTeacher && (
          <div>
            <div style={label}>{t('settings.subjectsTaught')}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {options.map(s => {
                const on = subjects.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={on}
                    style={{ cursor: 'pointer', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-sm)', fontFamily: 'inherit', minHeight: '2.25rem',
                      color: on ? 'var(--on-fg)' : 'var(--fg)', background: on ? 'var(--fg)' : 'var(--surface)', border: '1px solid var(--border-strong)' }}>{s}</button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                placeholder={t('settings.addSubject')} aria-label={t('settings.addSubject')} style={glassInput} />
              <button type="button" onClick={addCustom} style={ghostBtn}>{t('settings.add')}</button>
            </div>
          </div>
        )}

        <div><button type="submit" disabled={busy} style={smallBtn}>{busy ? t('settings.saving') : t('settings.saveProfile')}</button></div>
      </form>
      <SavedNote text={note.text} error={note.error} />
    </section>
  )
}

// ----- Students: grade, class and subjects -----
function StudentSection() {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/student/overview')
  const [saved, setSaved] = useState(false)
  const p = data?.profile
  return (
    <section id="student" style={section}>
      <h3 style={panelTitle}>{t('settings.gradeSubjects')}</h3>
      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {p && <StudentProfileForm key={saved ? 'again' : 'first'} initial={{ grade: p.grade || '', subjects: p.subjects || [], letter: p.letter || '' }}
        onSaved={() => { setSaved(s => !s); reload() }} />}
    </section>
  )
}

// ----- Account: email and password (Supabase Auth) -----
function AccountSection({ account }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailMsg, setEmailMsg] = useState({ text: '', error: '' })
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState({ text: '', error: '' })

  const changeEmail = async (e) => {
    e.preventDefault()
    setEmailMsg({ text: '', error: '' })
    const next = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(next)) return setEmailMsg({ text: '', error: t('settings.errEmail') })
    if (next === (account.email || '').toLowerCase()) return setEmailMsg({ text: '', error: t('settings.errSameEmail') })
    setEmailBusy(true)
    const { error } = await supabase.auth.updateUser({ email: next })
    setEmailBusy(false)
    if (error) return setEmailMsg({ text: '', error: t('settings.errGeneric') })
    setEmail('')
    setEmailMsg({ text: t('settings.emailSent'), error: '' })
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwMsg({ text: '', error: '' })
    if (!cur) return setPwMsg({ text: '', error: t('settings.errCurrent') })
    if (pw.length < 6) return setPwMsg({ text: '', error: t('settings.errShort') })
    if (pw !== pw2) return setPwMsg({ text: '', error: t('settings.errMismatch') })
    if (pw === cur) return setPwMsg({ text: '', error: t('settings.errSamePassword') })
    setPwBusy(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: account.email, password: cur })
    if (signErr) { setPwBusy(false); return setPwMsg({ text: '', error: t('settings.errWrongCurrent') }) }
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return setPwMsg({ text: '', error: t('settings.errGeneric') })
    setCur(''); setPw(''); setPw2('')
    setPwMsg({ text: t('settings.passwordChanged'), error: '' })
  }

  return (
    <section id="account" style={section}>
      <h3 style={panelTitle}>{t('settings.account')}</h3>

      <form onSubmit={changeEmail} style={{ display: 'grid', gap: '0.7rem', marginBottom: '1.5rem' }}>
        <div style={{ ...muted, overflowWrap: 'anywhere' }}>{t('settings.signedInAs')} <strong style={{ color: 'var(--fg)' }}>{account.email}</strong></div>
        <div>
          <label style={label} htmlFor="st-email">{t('settings.newEmail')}</label>
          <input id="st-email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={glassInput} autoComplete="email" />
        </div>
        <div><button type="submit" disabled={emailBusy} style={smallBtn}>{emailBusy ? t('settings.sending') : t('settings.changeEmail')}</button></div>
        <SavedNote text={emailMsg.text} error={emailMsg.error} />
      </form>

      <form onSubmit={changePassword} style={{ display: 'grid', gap: '0.7rem' }}>
        <div>
          <label style={label} htmlFor="st-cur">{t('settings.currentPassword')}</label>
          <input id="st-cur" type="password" value={cur} onChange={e => setCur(e.target.value)} style={glassInput} autoComplete="current-password" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))', gap: '0.7rem' }}>
          <div>
            <label style={label} htmlFor="st-pw">{t('settings.newPassword')}</label>
            <input id="st-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} style={glassInput} autoComplete="new-password" />
          </div>
          <div>
            <label style={label} htmlFor="st-pw2">{t('settings.repeatPassword')}</label>
            <input id="st-pw2" type="password" value={pw2} onChange={e => setPw2(e.target.value)} style={glassInput} autoComplete="new-password" />
          </div>
        </div>
        <div><button type="submit" disabled={pwBusy} style={smallBtn}>{pwBusy ? t('settings.changing') : t('settings.changePassword')}</button></div>
        <SavedNote text={pwMsg.text} error={pwMsg.error} />
      </form>
    </section>
  )
}

// ----- Notification preferences -----
function NotificationSection({ account }) {
  const t = useT()
  const [prefs, setPrefs] = useState(account.notificationPrefs)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState({ text: '', error: '' })
  const keys = NOTIFY_KEYS.filter(k => k !== 'messages' || account.role === 'teacher')

  const flip = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next); setBusy(true); setNote({ text: '', error: '' })
    try {
      const r = await apiFetch('/api/account/notification-prefs', { method: 'PUT', body: next })
      setPrefs(r.notificationPrefs)
      setNote({ text: t('settings.saved'), error: '' })
    } catch (err) { setPrefs(prefs); setNote({ text: '', error: err.message }) }
    setBusy(false)
  }

  return (
    <section id="notifications" style={section}>
      <h3 style={panelTitle}>{t('settings.notifications')}</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>{t('settings.notificationsText')}</p>
      {keys.map(key => (
        <label key={key} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!prefs[key]} disabled={busy} onChange={() => flip(key)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--fg)', flexShrink: 0 }} />
          <span style={{ minWidth: 0 }}>{t(`settings.notify_${key}`)}</span>
        </label>
      ))}
      <SavedNote text={note.text} error={note.error} />
    </section>
  )
}

// ----- Linked parents (students) -----
function LinkedParentsSection() {
  const t = useT()
  return (
    <section id="parents" style={section}>
      <h3 style={panelTitle}>{t('settings.linkedParents')}</h3>
      <ParentLinks embedded />
    </section>
  )
}

// ----- Delete account (soft delete) -----
function DeleteSection() {
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const doDelete = async () => {
    setBusy(true); setError('')
    try {
      await apiFetch('/api/account/delete', { method: 'POST', body: { confirm: 'DELETE' } })
      await logout()
      navigate('/')
    } catch (err) { setError(err.message); setBusy(false) }
  }

  return (
    <section id="delete" style={{ ...panel, borderColor: 'var(--border-strong)', borderWidth: 2 }}>
      <h3 style={panelTitle}>{t('settings.deleteAccount')}</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>{t('settings.deleteText')}</p>
      {!open ? (
        <button onClick={() => setOpen(true)} style={ghostBtn}>{t('settings.deleteMine')}</button>
      ) : (
        <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '22rem' }}>
          <label style={label} htmlFor="st-del">{t('settings.typeDelete')}</label>
          <input id="st-del" value={text} onChange={e => setText(e.target.value)} style={glassInput} autoComplete="off" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button disabled={busy || text !== 'DELETE'} onClick={doDelete} style={{ ...smallBtn, opacity: text === 'DELETE' ? 1 : 0.5 }}>{busy ? t('settings.deleting') : t('settings.deleteAccount')}</button>
            <button disabled={busy} onClick={() => { setOpen(false); setText('') }} style={ghostBtn}>{t('common.cancel')}</button>
          </div>
          <SavedNote error={error} />
        </div>
      )}
    </section>
  )
}

export default function Settings() {
  const t = useT()
  const { role } = useAuth()
  const [params] = useSearchParams()
  const { data: account, loading, error, reload } = useApiData('/api/account')
  const wanted = params.get('section')

  // Opens the section named in the address (for example /settings?section=profile)
  useEffect(() => {
    if (!account || !wanted) return
    const el = document.getElementById(wanted)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [account, wanted])

  return (
    <StudentPage title={t('settings.title')} icon="settings" backPath={ROLE_ROUTES[role] || '/'} maxWidth={760}>
      {loading && !account && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {account && (
        <>
          <AppearanceSection />
          <LanguageSection />
          <SessionSection />
          <ProfileSection account={account} onSaved={reload} />
          {account.role === 'student' && <StudentSection />}
          <AccountSection account={account} />
          {account.role !== 'admin' && <NotificationSection account={account} />}
          {account.role === 'student' && <LinkedParentsSection />}
          {account.role !== 'admin' && <DeleteSection />}
        </>
      )}
    </StudentPage>
  )
}
