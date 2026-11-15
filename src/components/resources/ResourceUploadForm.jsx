import React, { useRef, useState } from 'react'
import { useT } from '../../i18n/index.js'
import { ACCEPT, MAX_BYTES, fmtSize, mimeFor, uploadResource } from './resourceUtils'
import { GRADES, SUBJECT_OPTIONS } from '../../config/studentOptions'
import { glassInput } from '../../styles/glass'

const labelStyle = { display: 'block', color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }
const opt = { color: '#000' }
const card = { background: 'var(--surface, rgba(128,128,128,0.08))', border: '1px solid rgba(128,128,128,0.25)', borderRadius: '0.9rem', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }
const primaryBtn = { padding: '0.55rem 1.3rem', borderRadius: '999px', border: 'none', background: 'var(--color-primary)', color: 'var(--color-bg)', fontWeight: 600, cursor: 'pointer' }

// Upload form for teachers (their own school) and admins (pass `orgId`, chosen by the admin).
// Calls onUploaded() after a successful upload.
export default function ResourceUploadForm({ orgId, onUploaded }) {
  const t = useT()
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [isPastPaper, setIsPastPaper] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null
    setDone('')
    if (!f) { setFile(null); setError(''); return }
    if (!mimeFor(f)) { setFile(null); setError(t('shared.resources.errBadType')); e.target.value = ''; return }
    if (f.size > MAX_BYTES) { setFile(null); setError(t('shared.resources.errTooBig')); e.target.value = ''; return }
    setError('')
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 150))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setDone('')
    if (!file) return setError(t('shared.resources.errChooseFile'))
    if (!title.trim()) return setError(t('shared.resources.errNeedTitle'))
    if (!subject) return setError(t('shared.resources.errNeedSubject'))
    setUploading(true)
    try {
      await uploadResource({ file, title: title.trim(), subject, grade, isPastPaper, orgId, t })
      setDone(t('shared.resources.uploadedNotice'))
      setTitle(''); setSubject(''); setGrade(''); setIsPastPaper(false); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onUploaded?.()
    } catch (err) {
      setError(err.message || t('shared.resources.errUploadFailed'))
    }
    setUploading(false)
  }

  return (
    <form onSubmit={submit} style={card}>
      <h3 style={{ color: 'var(--color-primary)', margin: 0, fontSize: '1.05rem' }}>{t('shared.resources.uploadTitle')}</h3>

      <div>
        <label htmlFor="res-file" style={labelStyle}>{t('shared.resources.fileLabel')}</label>
        <input id="res-file" ref={fileRef} type="file" accept={ACCEPT} onChange={pickFile} disabled={uploading}
          style={{ ...glassInput, padding: '0.6rem' }} />
        {file && <div style={{ color: 'var(--fg-muted, rgba(128,128,128,0.9))', fontSize: '0.8rem', marginTop: '0.3rem' }}>{file.name} · {fmtSize(file.size)}</div>}
      </div>

      <div>
        <label htmlFor="res-title" style={labelStyle}>{t('shared.resources.titleLabel')}</label>
        <input id="res-title" value={title} maxLength={150} onChange={e => setTitle(e.target.value)} disabled={uploading} style={glassInput} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 11rem), 1fr))', gap: '1rem' }}>
        <div>
          <label htmlFor="res-subject" style={labelStyle}>{t('shared.resources.subjectLabel')}</label>
          <select id="res-subject" value={subject} onChange={e => setSubject(e.target.value)} disabled={uploading} style={glassInput}>
            <option value="" style={opt}>{t('shared.resources.chooseSubject')}</option>
            {SUBJECT_OPTIONS.map(s => <option key={s} value={s} style={opt}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="res-grade" style={labelStyle}>{t('shared.resources.gradeLabel')}</label>
          <select id="res-grade" value={grade} onChange={e => setGrade(e.target.value)} disabled={uploading} style={glassInput}>
            <option value="" style={opt}>{t('shared.resources.allGrades')}</option>
            {GRADES.map(g => <option key={g} value={g} style={opt}>{t('shared.resources.gradeN', { n: g })}</option>)}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={isPastPaper} onChange={e => setIsPastPaper(e.target.checked)} disabled={uploading} />
        {t('shared.resources.isPastPaper')}
      </label>

      {error && <div style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{error}</div>}
      {done && <div style={{ color: '#7CFC9A', fontSize: '0.9rem' }}>{done}</div>}

      <button type="submit" disabled={uploading} style={{ ...primaryBtn, width: 'auto', alignSelf: 'start', opacity: uploading ? 0.7 : 1 }}>
        {uploading ? t('shared.resources.uploading') : t('shared.resources.upload')}
      </button>
    </form>
  )
}
