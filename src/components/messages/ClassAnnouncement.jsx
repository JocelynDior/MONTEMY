import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { ErrorBox, ghostBtn, muted, smallBtn } from '../parent/parentUi'
import { glassInput, C } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'

const MAX = 1500

// Teacher: one message to every parent of a class. Each parent receives it as a normal chat message.
export default function ClassAnnouncement({ onClose, onSent }) {
  const { data, loading, error, reload } = useApiData('/api/teacher/classes')
  const [classId, setClassId] = useState('')
  const [content, setContent] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState('')

  const classes = data?.classes || []
  const cls = classes.find(c => c.id === classId)

  const ask = (e) => {
    e.preventDefault()
    setFormError(''); setResult('')
    if (!classId) return setFormError('Choose a class.')
    if (!content.trim()) return setFormError('Type a message first.')
    setConfirming(true)
  }

  const send = async () => {
    setSending(true); setFormError('')
    try {
      const r = await apiFetch(`/api/teacher/classes/${classId}/message-parents`, { method: 'POST', body: { content } })
      setResult(`Sent to ${r.sent} ${r.sent === 1 ? 'parent' : 'parents'} of ${r.className}. Their replies will appear in your chats.`)
      setContent(''); setConfirming(false)
      onSent?.()
    } catch (err) {
      setFormError(err.message); setConfirming(false)
    }
    setSending(false)
  }

  return (
    <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
        <strong style={{ color: C.turquoise }}>📢 Message all parents of a class</strong>
        <button onClick={onClose} style={ghostBtn}>Close</button>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}
      {data && classes.length === 0 && <p style={muted}>You haven't added any classes yet. Add one under My Classes first.</p>}

      {data && classes.length > 0 && (
        <form onSubmit={ask} style={{ display: 'grid', gap: '0.8rem' }}>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setConfirming(false); setResult('') }} style={glassInput} aria-label="Class">
            <option value="" style={{ color: '#000' }}>Choose a class</option>
            {classes.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name}</option>)}
          </select>
          <textarea value={content} onChange={(e) => { setContent(e.target.value); setConfirming(false) }} rows={5} maxLength={MAX}
            placeholder="e.g. Reminder: the maths test is on Friday." aria-label="Message to parents"
            style={{ ...glassInput, resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ ...muted, fontSize: '0.8rem', textAlign: 'right' }}>{content.length}/{MAX}</div>

          {formError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{formError}</p>}
          {result && <p role="status" style={{ color: '#7be3b1', fontSize: '0.9rem' }}>{result}</p>}

          {confirming ? (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem' }}>Send this to every parent of {cls?.name}?</span>
              <button type="button" disabled={sending} onClick={send} style={smallBtn}>{sending ? 'Sending...' : 'Yes, send'}</button>
              <button type="button" disabled={sending} onClick={() => setConfirming(false)} style={ghostBtn}>Edit</button>
            </div>
          ) : (
            <div><button type="submit" style={smallBtn}>Send to parents</button></div>
          )}
        </form>
      )}
    </div>
  )
}
