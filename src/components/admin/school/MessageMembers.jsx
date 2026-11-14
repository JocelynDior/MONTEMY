import { useT } from '../../../i18n/index.js'
import React, { useState } from 'react'
import { apiFetch } from '../../../api/apiClient'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../parent/parentUi'
import { glassInput } from '../../../styles/glass'

const ROLES = ['', 'student', 'teacher', 'parent', 'principal', 'tutor', 'staff', 'admin']
const TYPES = ['info', 'success', 'warning']
const opt = { color: '#000' }

export default function MessageMembers({ orgId }) {
  const t = useT()
  const [role, setRole] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  const send = async () => {
    if (!body.trim()) return setError(t('school.message.bodyRequired'))
    if (body.length > 300) return setError(t('school.message.bodyTooLong'))
    setSending(true); setError(''); setSent(null)
    try {
      const res = await apiFetch(`/api/admin/school/${orgId}/message`, {
        method: 'POST',
        body: { role: role || undefined, body: body.trim(), type: msgType },
      })
      setSent(res.sent)
      setBody('')
    } catch (err) {
      setError(err.message)
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={panel}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...glassInput, flex: '1 1 140px' }} aria-label={t('school.message.audience')}>
              {ROLES.map(r => (
                <option key={r} value={r} style={opt}>
                  {r === '' ? t('school.message.everyone') : r === 'staff' ? 'Staff Member' : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <select value={msgType} onChange={e => setMsgType(e.target.value)} style={{ ...glassInput, flex: '1 1 110px' }} aria-label={t('school.message.type')}>
              {TYPES.map(tp => <option key={tp} value={tp} style={opt}>{tp.charAt(0).toUpperCase() + tp.slice(1)}</option>)}
            </select>
          </div>

          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder={t('school.message.placeholder')}
            style={{ ...glassInput, resize: 'vertical', fontSize: '0.95rem' }}
          />
          <div style={{ ...muted, fontSize: '0.8rem', textAlign: 'right' }}>{body.length}/300</div>

          {error && <ErrorBox message={error} />}
          {sent !== null && (
            <p role="status" style={{ color: '#7CFC9A', fontSize: '0.9rem' }}>
              {t('school.message.sent', { count: sent })}
            </p>
          )}

          <button disabled={sending || !body.trim()} onClick={send} style={smallBtn}>
            {sending ? '…' : t('school.message.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
