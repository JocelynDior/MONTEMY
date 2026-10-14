import React, { useState } from 'react'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }
const opt = { background: '#001F3F' }
const AUDIENCES = [
  ['', 'Everyone'], ['student', 'Students'], ['teacher', 'Teachers'], ['parent', 'Parents'],
  ['principal', 'Principals'], ['tutor', 'Tutors'], ['schoolmember', 'School members'],
]
const MAX = 300

// Admin tab: send one notification to everyone (or one role) in an organisation
export default function AdminBroadcast() {
  const orgsReq = useApiData('/api/admin/orgs')
  const [orgId, setOrgId] = useState('')
  const [role, setRole] = useState('')
  const [type, setType] = useState('info')
  const [content, setContent] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const orgs = (orgsReq.data?.orgs || []).filter(o => o.isActive)
  const org = orgs.find(o => o.id === orgId)
  const audience = AUDIENCES.find(([v]) => v === role)?.[1].toLowerCase()

  const ask = (e) => {
    e.preventDefault()
    setError(''); setResult('')
    if (!orgId) return setError('Choose an organisation.')
    if (!content.trim()) return setError('Type a message first.')
    setConfirming(true)
  }

  const send = async () => {
    setSending(true); setError('')
    try {
      const r = await apiFetch('/api/admin/notifications/broadcast', {
        method: 'POST', body: { orgId, role: role || undefined, type, content: content.trim() },
      })
      setResult(`Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'} at ${r.orgName}.`)
      setContent('')
    } catch (err) {
      setError(err.message || 'Could not send the broadcast.')
    }
    setConfirming(false)
    setSending(false)
  }

  return (
    <>
      <h2 style={{ color: C.turquoise, marginBottom: '1.25rem' }}>Broadcast a notification</h2>
      <form onSubmit={ask} style={{ ...glassCard, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="bc-org" style={labelStyle}>Organisation</label>
            <select id="bc-org" value={orgId} onChange={e => { setOrgId(e.target.value); setConfirming(false) }} style={glassInput}>
              <option value="" style={opt}>{orgsReq.loading ? 'Loading...' : 'Choose an organisation'}</option>
              {orgs.map(o => <option key={o.id} value={o.id} style={opt}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bc-role" style={labelStyle}>Send to</label>
            <select id="bc-role" value={role} onChange={e => { setRole(e.target.value); setConfirming(false) }} style={glassInput}>
              {AUDIENCES.map(([v, l]) => <option key={v} value={v} style={opt}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="bc-type" style={labelStyle}>Style</label>
            <select id="bc-type" value={type} onChange={e => setType(e.target.value)} style={glassInput}>
              <option value="info" style={opt}>ℹ️ Information</option>
              <option value="success" style={opt}>✅ Good news</option>
              <option value="warning" style={opt}>⚠️ Important</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="bc-msg" style={labelStyle}>Message</label>
          <textarea id="bc-msg" value={content} maxLength={MAX} rows={3}
            onChange={e => { setContent(e.target.value); setConfirming(false) }}
            style={{ ...glassInput, resize: 'vertical' }} />
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: '0.25rem', textAlign: 'right' }}>{content.length}/{MAX}</div>
        </div>

        {error && <div style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{error}</div>}
        {result && <div style={{ color: '#7CFC9A', fontSize: '0.9rem' }}>{result}</div>}

        {confirming ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem' }}>
              Send this to all verified {audience === 'everyone' ? 'users' : audience} at <strong>{org?.name}</strong>? It can't be unsent.
            </span>
            <button type="button" onClick={send} disabled={sending} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }}>
              {sending ? 'Sending...' : 'Yes, send'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={sending}
              style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="submit" style={{ ...glassBtn, width: 'auto', alignSelf: 'start' }}>Send broadcast</button>
        )}
      </form>
    </>
  )
}
