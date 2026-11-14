import { useT } from '../../i18n/index.js'
import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { glassInput } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/icons/Icon'
import StudentPage from '../../components/shared/StudentPage'

export default function AdminHelpInbox() {
  const t = useT()
  const [activeChat, setActiveChat] = useState(null)
  const { data, loading, error, reload } = useApiData('/api/help/admin/chats')

  const chats = data?.chats || []

  if (activeChat) {
    return (
      <ChatView
        chat={activeChat}
        t={t}
        onBack={() => { setActiveChat(null); reload() }}
      />
    )
  }

  return (
    <StudentPage title={t('help.inbox')}>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}
      {data && chats.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('help.noChats')}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {chats.map(chat => (
          <button key={chat.id} onClick={() => setActiveChat(chat)}
            style={{ ...panel, textAlign: 'left', cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{chat.userName || t('help.anonymous')}</div>
                <div style={{ ...muted, fontSize: '0.82rem' }}>{chat.lastMessage || '—'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 99,
                  background: chat.status === 'open' ? 'rgba(255,209,102,0.2)' : 'rgba(255,255,255,0.08)',
                  color: chat.status === 'open' ? '#ffd166' : 'rgba(255,255,255,0.5)',
                }}>
                  {chat.status}
                </span>
                <span style={{ ...muted, fontSize: '0.75rem' }}>{chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString() : ''}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </StudentPage>
  )
}

function ChatView({ chat, t, onBack }) {
  const { data, loading, error, reload } = useApiData(`/api/help/admin/chats/${chat.id}`)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [closing, setClosing] = useState(false)

  const messages = data?.messages || []

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true); setSendError('')
    try {
      await apiFetch(`/api/help/admin/chats/${chat.id}/reply`, { method: 'POST', body: { message: reply.trim() } })
      setReply('')
      reload()
    } catch (err) {
      setSendError(err.message)
    }
    setSending(false)
  }

  const closeChat = async () => {
    setClosing(true)
    try {
      await apiFetch(`/api/help/admin/chats/${chat.id}/close`, { method: 'POST' })
      onBack()
    } catch {}
    setClosing(false)
  }

  return (
    <StudentPage
      title={chat.userName || t('help.anonymous')}
      headerLeft={
        <button onClick={onBack} style={{ ...ghostBtn, padding: '0.3rem 0.7rem', fontSize: '0.85rem' }}>
          <Icon name="chevron" size={13} style={{ marginRight: '0.3rem', transform: 'rotate(90deg)' }} />
          {t('help.inbox')}
        </button>
      }
    >
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '50dvh', overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map(msg => {
          const isAdmin = msg.senderRole === 'admin'
          return (
            <div key={msg.id} style={{
              alignSelf: isAdmin ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              ...panel,
              background: isAdmin ? 'var(--color-primary)' : undefined,
              padding: '0.6rem 0.9rem',
            }}>
              <div style={{ fontSize: '0.92rem' }}>{msg.message}</div>
              <div style={{ ...muted, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {msg.senderName || (isAdmin ? 'Admin' : t('help.anonymous'))} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>

      {chat.status !== 'closed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={3}
            placeholder={t('help.replyPlaceholder')}
            style={{ ...glassInput, resize: 'vertical' }}
          />
          {sendError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{sendError}</p>}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button disabled={sending || !reply.trim()} onClick={sendReply} style={smallBtn}>
              {sending ? '…' : t('help.send')}
            </button>
            <button disabled={closing} onClick={closeChat} style={{ ...ghostBtn, opacity: 0.7 }}>
              {closing ? '…' : t('help.close')}
            </button>
          </div>
        </div>
      )}

      {chat.status === 'closed' && (
        <p style={{ ...muted, fontSize: '0.88rem', textAlign: 'center' }}>{t('help.chatClosed')}</p>
      )}
    </StudentPage>
  )
}
