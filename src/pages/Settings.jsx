import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../components/student/StudentPage'
import StudentProfileForm from '../components/student/StudentProfileForm'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../components/parent/parentUi'
import { apiFetch } from '../api/apiClient'
import { useApiData } from '../hooks/useApiData'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase/client'
import { logout, ROLE_ROUTES } from '../supabase/authHelpers'
import { SUBJECT_OPTIONS } from '../config/studentOptions'
import { glassInput } from '../styles/glass'
import SkeletonList from '../components/shared/Skeleton'

const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const AVATAR_MAX = 2 * 1024 * 1024

const NOTIFY_OPTIONS = [
  ['academic', 'Assignments, grades and study materials'],
  ['events', 'School events, reminders and term dates'],
  ['messages', 'New messages from parents (teachers)'],
  ['tutoring', 'Tutoring sessions'],
]

function Note({ kind, children }) {
  if (!children) return null
  const color = kind === 'error' ? '#ffb3b3' : '#7be3b1'
  return <p role={kind === 'error' ? 'alert' : 'status'} style={{ color, fontSize: '0.9rem', marginTop: '0.75rem' }}>{children}</p>
}

function Avatar({ name, url, size = 84 }) {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  return url
    ? <img src={url} alt="Your profile" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
    : <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size / 2.6, fontWeight: 700, background: 'rgba(var(--color-primary-rgb),0.3)', border: '2px solid rgba(255,255,255,0.3)' }}>{initials}</div>
}

// ----- Profile: photo, name, bio, subjects taught (teachers) -----
function ProfileSection({ account, onSaved }) {
  const { refreshProfile } = useAuth()
  const fileRef = useRef(null)
  const [name, setName] = useState(account.name)
  const [bio, setBio] = useState(account.bio)
  const [subjects, setSubjects] = useState(account.subjectsTaught)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const isTeacher = account.role === 'teacher'

  const toggle = (s) => setSubjects(list => list.includes(s) ? list.filter(x => x !== s) : [...list, s])
  const addCustom = () => {
    const t = custom.trim().slice(0, 60)
    if (t && !subjects.some(x => x.toLowerCase() === t.toLowerCase())) setSubjects(list => [...list, t])
    setCustom('')
  }
  const options = [...SUBJECT_OPTIONS, ...subjects.filter(s => !SUBJECT_OPTIONS.includes(s))]

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setError(''); setOk('')
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: { name, bio, ...(isTeacher ? { subjectsTaught: subjects } : {}) } })
      await refreshProfile()
      setOk('Saved.')
      onSaved()
    } catch (err) { setError(err.message) }
    setBusy(false)
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(''); setOk('')
    if (!AVATAR_TYPES.includes(file.type)) return setError('Use a PNG, JPG or WebP image.')
    if (file.size > AVATAR_MAX) return setError('That photo is too big. The limit is 2MB.')
    setPhotoBusy(true)
    try {
      const { path, token } = await apiFetch('/api/account/avatar/upload-url', { method: 'POST', body: { mimeType: file.type, size: file.size } })
      const { error: upErr } = await supabase.storage.from('avatars').uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (upErr) throw new Error('The photo could not be uploaded. Check your connection and try again.')
      await apiFetch('/api/account/avatar', { method: 'POST', body: { path } })
      await refreshProfile()
      setOk('Photo updated.')
      onSaved()
    } catch (err) { setError(err.message) }
    setPhotoBusy(false)
  }

  const removePhoto = async () => {
    setPhotoBusy(true); setError(''); setOk('')
    try {
      await apiFetch('/api/account/avatar', { method: 'DELETE' })
      await refreshProfile()
      onSaved()
    } catch (err) { setError(err.message) }
    setPhotoBusy(false)
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>Profile</h3>
      <div style={{ display: 'flex', gap: '1.1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <Avatar name={account.name} url={account.avatarUrl} />
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} style={{ display: 'none' }} aria-label="Choose a profile photo" />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" disabled={photoBusy} onClick={() => fileRef.current?.click()} style={smallBtn}>{photoBusy ? 'Working...' : account.avatarUrl ? 'Change photo' : 'Upload photo'}</button>
            {account.avatarUrl && <button type="button" disabled={photoBusy} onClick={removePhoto} style={ghostBtn}>Remove</button>}
          </div>
          <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>PNG, JPG or WebP, up to 2MB.</p>
        </div>
      </div>

      <form onSubmit={save} style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="st-name">Name</label>
          <input id="st-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} style={glassInput} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {account.username && <Chip color="#8fd3ff">@{account.username}</Chip>}
          <Chip color="#ffd166">{account.role}</Chip>
          {account.orgName && <span style={{ ...muted, fontSize: '0.85rem' }}>{account.orgName}</span>}
        </div>
        <div>
          <label style={label} htmlFor="st-bio">Bio (optional)</label>
          <textarea id="st-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3}
            style={{ ...glassInput, resize: 'vertical', fontFamily: 'inherit' }} placeholder="A few words about you" />
        </div>

        {isTeacher && (
          <div>
            <label style={label}>Subjects you teach</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {options.map(s => (
                <button key={s} type="button" onClick={() => toggle(s)} aria-pressed={subjects.includes(s)}
                  style={{ cursor: 'pointer', padding: '0.35rem 0.8rem', borderRadius: '999px', color: 'white', fontSize: '0.85rem', fontFamily: 'inherit',
                    border: subjects.includes(s) ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.25)',
                    background: subjects.includes(s) ? 'rgba(var(--color-primary-rgb),0.3)' : 'rgba(255,255,255,0.06)' }}>{s}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                placeholder="Add another subject" aria-label="Add another subject" style={{ ...glassInput, padding: '0.5rem 0.8rem', fontSize: '0.9rem' }} />
              <button type="button" onClick={addCustom} style={ghostBtn}>Add</button>
            </div>
          </div>
        )}

        <div><button type="submit" disabled={busy} style={smallBtn}>{busy ? 'Saving...' : 'Save profile'}</button></div>
      </form>
      <Note kind="error">{error}</Note>
      <Note>{ok}</Note>
    </div>
  )
}

// ----- Students: grade, class and subjects (the form used on the dashboard) -----
function StudentSection() {
  const { data, loading, error, reload } = useApiData('/api/student/overview')
  const [saved, setSaved] = useState(false)
  const p = data?.profile
  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>Grade, class and subjects</h3>
      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {p && <StudentProfileForm key={saved ? 'again' : 'first'} initial={{ grade: p.grade || '', subjects: p.subjects || [], letter: p.letter || '' }}
        onSaved={() => { setSaved(s => !s); reload() }} />}
    </div>
  )
}

// ----- Account: email and password (Supabase Auth) -----
function AccountSection({ account }) {
  const [email, setEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailMsg, setEmailMsg] = useState({ kind: '', text: '' })
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState({ kind: '', text: '' })

  const changeEmail = async (e) => {
    e.preventDefault()
    setEmailMsg({ kind: '', text: '' })
    const next = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(next)) return setEmailMsg({ kind: 'error', text: 'Enter a valid email address.' })
    if (next === (account.email || '').toLowerCase()) return setEmailMsg({ kind: 'error', text: 'That is already your email.' })
    setEmailBusy(true)
    const { error } = await supabase.auth.updateUser({ email: next })
    setEmailBusy(false)
    if (error) return setEmailMsg({ kind: 'error', text: error.message })
    setEmail('')
    setEmailMsg({ kind: 'ok', text: 'Check your inbox. Your email changes once you confirm the link we sent (you may need to confirm from the old address too).' })
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwMsg({ kind: '', text: '' })
    if (!cur) return setPwMsg({ kind: 'error', text: 'Enter your current password.' })
    if (pw.length < 6) return setPwMsg({ kind: 'error', text: 'The new password must be at least 6 characters.' })
    if (pw !== pw2) return setPwMsg({ kind: 'error', text: 'The new passwords do not match.' })
    if (pw === cur) return setPwMsg({ kind: 'error', text: 'Choose a password different from your current one.' })
    setPwBusy(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: account.email, password: cur })
    if (signErr) { setPwBusy(false); return setPwMsg({ kind: 'error', text: 'Your current password is not correct.' }) }
    const { error } = await supabase.auth.updateUser({ password: pw })
    setPwBusy(false)
    if (error) return setPwMsg({ kind: 'error', text: error.message })
    setCur(''); setPw(''); setPw2('')
    setPwMsg({ kind: 'ok', text: 'Password changed.' })
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>Account</h3>

      <form onSubmit={changeEmail} style={{ display: 'grid', gap: '0.7rem', marginBottom: '1.5rem' }}>
        <div style={muted}>Signed in as <strong style={{ color: 'white' }}>{account.email}</strong></div>
        <div>
          <label style={label} htmlFor="st-email">New email address</label>
          <input id="st-email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={glassInput} autoComplete="email" />
        </div>
        <div><button type="submit" disabled={emailBusy} style={smallBtn}>{emailBusy ? 'Sending...' : 'Change email'}</button></div>
        <Note kind={emailMsg.kind}>{emailMsg.text}</Note>
      </form>

      <form onSubmit={changePassword} style={{ display: 'grid', gap: '0.7rem' }}>
        <div>
          <label style={label} htmlFor="st-cur">Current password</label>
          <input id="st-cur" type="password" value={cur} onChange={e => setCur(e.target.value)} style={glassInput} autoComplete="current-password" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.7rem' }}>
          <div>
            <label style={label} htmlFor="st-pw">New password</label>
            <input id="st-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} style={glassInput} autoComplete="new-password" />
          </div>
          <div>
            <label style={label} htmlFor="st-pw2">Repeat new password</label>
            <input id="st-pw2" type="password" value={pw2} onChange={e => setPw2(e.target.value)} style={glassInput} autoComplete="new-password" />
          </div>
        </div>
        <div><button type="submit" disabled={pwBusy} style={smallBtn}>{pwBusy ? 'Changing...' : 'Change password'}</button></div>
        <Note kind={pwMsg.kind}>{pwMsg.text}</Note>
      </form>
    </div>
  )
}

// ----- Notification preferences -----
function NotificationSection({ account }) {
  const [prefs, setPrefs] = useState(account.notificationPrefs)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const options = NOTIFY_OPTIONS.filter(([k]) => k !== 'messages' || account.role === 'teacher')

  const flip = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next); setBusy(true); setError(''); setOk('')
    try {
      const r = await apiFetch('/api/account/notification-prefs', { method: 'PUT', body: next })
      setPrefs(r.notificationPrefs)
      setOk('Saved.')
    } catch (err) { setPrefs(prefs); setError(err.message) }
    setBusy(false)
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>Notifications</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>Choose what appears in your notification bell. Account and admin notices are always delivered.</p>
      {options.map(([key, text]) => (
        <label key={key} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', padding: '0.5rem 0', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!prefs[key]} disabled={busy} onChange={() => flip(key)} style={{ width: '1.1rem', height: '1.1rem' }} />
          <span>{text}</span>
        </label>
      ))}
      <Note kind="error">{error}</Note>
      <Note>{ok}</Note>
    </div>
  )
}

// ----- Delete account (soft delete) -----
function DeleteSection() {
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
    <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}>
      <h3 style={{ ...panelTitle, color: '#ff9b9b' }}>Delete account</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>Your account will be switched off and you will be signed out. Your data is not erased, and a Montemy admin can restore the account if you change your mind.</p>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete my account</button>
      ) : (
        <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '22rem' }}>
          <label style={label} htmlFor="st-del">Type DELETE to confirm</label>
          <input id="st-del" value={text} onChange={e => setText(e.target.value)} style={glassInput} autoComplete="off" />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={busy || text !== 'DELETE'} onClick={doDelete}
              style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none', opacity: text === 'DELETE' ? 1 : 0.5 }}>{busy ? 'Deleting...' : 'Delete account'}</button>
            <button disabled={busy} onClick={() => { setOpen(false); setText('') }} style={ghostBtn}>Cancel</button>
          </div>
          <Note kind="error">{error}</Note>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const { role } = useAuth()
  const { data: account, loading, error, reload } = useApiData('/api/account')

  // Re-mount the profile form when the saved data changes underneath it (e.g. after a photo upload)
  const [version, setVersion] = useState(0)

  return (
    <StudentPage title="Settings" icon="⚙️" backPath={ROLE_ROUTES[role] || '/'} maxWidth={760}>
      {loading && !account && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {account && (
        <>
          <ProfileSection key={`${account.avatarUrl}-${version}`} account={account} onSaved={() => { setVersion(v => v + 1); reload() }} />
          {account.role === 'student' && <StudentSection />}
          <AccountSection account={account} />
          {account.role !== 'admin' && <NotificationSection account={account} />}
          {account.role !== 'admin' && <DeleteSection />}
        </>
      )}
    </StudentPage>
  )
}
