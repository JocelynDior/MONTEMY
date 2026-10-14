import React, { useRef, useState } from 'react'
import { ACCEPT, MAX_BYTES, fmtSize, mimeFor, uploadResource } from './resourceUtils'
import { GRADES, SUBJECT_OPTIONS } from '../../config/studentOptions'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }
const opt = { background: '#001F3F' }

// Upload form for teachers (their own school) and admins (pass `orgId`, chosen by the admin).
// Calls onUploaded() after a successful upload.
export default function ResourceUploadForm({ orgId, onUploaded }) {
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
    if (!mimeFor(f)) { setFile(null); setError('That file type is not allowed. Use a PDF, Word, PowerPoint or image file.'); e.target.value = ''; return }
    if (f.size > MAX_BYTES) { setFile(null); setError('That file is too big. The limit is 10MB.'); e.target.value = ''; return }
    setError('')
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 150))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setDone('')
    if (!file) return setError('Choose a file to upload.')
    if (!title.trim()) return setError('Please give the resource a title.')
    if (!subject) return setError('Please choose a subject.')
    setUploading(true)
    try {
      await uploadResource({ file, title: title.trim(), subject, grade, isPastPaper, orgId })
      setDone('Uploaded. Students can see it now.')
      setTitle(''); setSubject(''); setGrade(''); setIsPastPaper(false); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onUploaded?.()
    } catch (err) {
      setError(err.message || 'The upload failed. Please try again.')
    }
    setUploading(false)
  }

  return (
    <form onSubmit={submit} style={{ ...glassCard, padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
      <h3 style={{ color: C.turquoise, margin: 0, fontSize: '1.05rem' }}>Upload study material</h3>

      <div>
        <label htmlFor="res-file" style={labelStyle}>File (PDF, Word, PowerPoint or image, up to 10MB)</label>
        <input id="res-file" ref={fileRef} type="file" accept={ACCEPT} onChange={pickFile} disabled={uploading}
          style={{ ...glassInput, padding: '0.6rem' }} />
        {file && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{file.name} · {fmtSize(file.size)}</div>}
      </div>

      <div>
        <label htmlFor="res-title" style={labelStyle}>Title</label>
        <input id="res-title" value={title} maxLength={150} onChange={e => setTitle(e.target.value)} disabled={uploading} style={glassInput} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div>
          <label htmlFor="res-subject" style={labelStyle}>Subject</label>
          <select id="res-subject" value={subject} onChange={e => setSubject(e.target.value)} disabled={uploading} style={glassInput}>
            <option value="" style={opt}>Choose a subject</option>
            {SUBJECT_OPTIONS.map(s => <option key={s} value={s} style={opt}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="res-grade" style={labelStyle}>Grade</label>
          <select id="res-grade" value={grade} onChange={e => setGrade(e.target.value)} disabled={uploading} style={glassInput}>
            <option value="" style={opt}>All grades</option>
            {GRADES.map(g => <option key={g} value={g} style={opt}>Grade {g}</option>)}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={isPastPaper} onChange={e => setIsPastPaper(e.target.checked)} disabled={uploading} />
        This is a past paper
      </label>

      {error && <div style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{error}</div>}
      {done && <div style={{ color: '#7CFC9A', fontSize: '0.9rem' }}>{done}</div>}

      <button type="submit" disabled={uploading} style={{ ...glassBtn, width: 'auto', alignSelf: 'start', opacity: uploading ? 0.7 : 1 }}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
}
