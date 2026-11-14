import { useT } from '../../i18n/index.js'
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { ErrorBox, muted } from '../../components/parent/parentUi'
import { glassInput, glassBtn } from '../../styles/glass'
import Icon from '../../components/shared/Icon'
import { useAuth } from '../../context/AuthContext'

// kind comes from route: /chat/staff  or  /chat/parents
export default function GroupChat() {
  const { kind } = useParams()          // 'staff' | 'parents'
  const t = useT()
  const { session } = useAuth()
  const [messages, setMessages] = useState([])
  const [chatId, setChatId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const title  = kind === 'staff'   ? t('chat.staffTitle')   : t('chat.parentsTitle')
  const back   = kind === 'staff'   ? '/staff/dashboard'     : '/principal/dashboard'

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/group-chats/${kind}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      const json = await res.json()
      setChatId(json.chatId)
      setMessages(json.messages)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [kind])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/group-chats/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Error')
      setBody('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const myId = session?.user?.id

  return (
    <StudentPage title={title} icon={kind === 'staff' ? 'Users' : 'Users'} backPath={back}>
      {error && <ErrorBox message={error} onRetry={load} />}
      {loading && <p style={muted}>{t('common:loading')}…</p>}

      {/* Message thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '5rem' }}>
        {messages.map(msg => {
          const isMe = msg.senderId === myId
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <span style={{ ...muted, fontSize: 'var(--fs-xs)', marginBottom: '0.2rem' }}>{msg.senderName}</span>
              )}
              <div style={{
                maxWidth: '75%',
                background: isMe ? 'var(--surface-2)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: isMe ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                padding: '0.6rem 0.9rem',
                fontSize: 'var(--fs-sm)',
                wordBreak: 'break-word',
              }}>
                {msg.body}
              </div>
              <span style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.2rem' }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Sticky input */}
      <form onSubmit={send} style={{
        position: 'fixed', bottom: 'calc(var(--bottom-bar-h) + var(--safe-bottom))',
        left: 0, right: 0, padding: '0.75rem var(--page-gutter)',
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        display: 'flex', gap: '0.5rem',
      }}>
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('chat.placeholder')}
          style={{ ...glassInput, flex: 1, minWidth: 0 }}
          maxLength={2000}
        />
        <button type="submit" disabled={!body.trim() || sending}
          style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Icon name="send" size={16} />
        </button>
      </form>
    </StudentPage>
  )
}
