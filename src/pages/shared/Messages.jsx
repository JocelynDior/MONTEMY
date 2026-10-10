import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase/client'
import { apiFetch } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import StudentPage from '../../components/student/StudentPage'
import { panel, muted, smallBtn, ghostBtn, Chip, ErrorBox } from '../../components/parent/parentUi'
import { glassInput, C } from '../../styles/glass'

const ROLE_LABELS = {
  student: 'Student', teacher: 'Teacher', parent: 'Parent', principal: 'Principal',
  tutor: 'Tutor', schoolmember: 'School member', admin: 'Admin',
}
const FILTERS = [['', 'Everyone'], ['teacher', 'Teachers'], ['student', 'Students'], ['parent', 'Parents'], ['principal', 'Principals'], ['tutor', 'Tutors'], ['schoolmember', 'Staff']]
const MAX_LENGTH = 4000

function timeLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function useNarrow() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (e) => setNarrow(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function UnreadDot({ n }) {
  if (!n) return null
  return (
    <span style={{ minWidth: '1.3rem', height: '1.3rem', padding: '0 0.35rem', borderRadius: '999px', background: C.turquoise, color: 'var(--color-bg)', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function Messages() {
  const { user, role } = useAuth()
  const narrow = useNarrow()

  const [inbox, setInbox] = useState(null)       // { conversations, totalUnread }
  const [inboxError, setInboxError] = useState('')
  const [active, setActive] = useState(null)     // the person whose chat is open: { id, name, username, role }
  const [thread, setThread] = useState(null)     // { messages, canSend }
  const [threadError, setThreadError] = useState('')
  const [threadLoading, setThreadLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const [picking, setPicking] = useState(false)  // "New chat" panel
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsError, setContactsError] = useState('')

  const activeRef = useRef(null)
  const bottomRef = useRef(null)
  activeRef.current = active

  const loadInbox = useCallback(async () => {
    try {
      const data = await apiFetch('/api/messages/inbox')
      setInbox(data)
      setInboxError('')
    } catch (err) {
      setInboxError(err.message || 'Could not load your messages.')
    }
  }, [])

  const openThread = useCallback(async (person) => {
    setActive(person)
    setPicking(false)
    setThread(null)
    setThreadError('')
    setSendError('')
    setThreadLoading(true)
    try {
      const data = await apiFetch(`/api/messages/thread/${person.id}`)
      if (activeRef.current?.id !== person.id) return // user already opened someone else
      setActive(data.user)
      setThread({ messages: data.messages, canSend: data.canSend })
      loadInbox() // the unread count for this chat is now zero
    } catch (err) {
      if (activeRef.current?.id === person.id) setThreadError(err.message || 'Could not load this conversation.')
    } finally {
      if (activeRef.current?.id === person.id) setThreadLoading(false)
    }
  }, [loadInbox])

  useEffect(() => { loadInbox() }, [loadInbox])

  // Live updates: new messages to me
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`chat-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new
          if (activeRef.current && m.sender_id === activeRef.current.id) {
            // They are looking at this chat: show it now and mark it read
            setThread(t => t && !t.messages.some(x => x.id === m.id)
              ? { ...t, messages: [...t.messages, { id: m.id, fromMe: false, content: m.content, read: true, createdAt: m.created_at }] }
              : t)
            apiFetch(`/api/messages/read/${m.sender_id}`, { method: 'POST' }).catch(() => {})
          }
          loadInbox()
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, loadInbox])

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [thread?.messages?.length, active?.id])

  // Search people in my organisation
  useEffect(() => {
    if (!picking) return
    let cancelled = false
    setContactsLoading(true)
    setContactsError('')
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (filter) params.set('role', filter)
        const data = await apiFetch(`/api/messages/contacts?${params.toString()}`)
        if (!cancelled) setContacts(data.contacts || [])
      } catch (err) {
        if (!cancelled) setContactsError(err.message || 'Could not load contacts.')
      } finally {
        if (!cancelled) setContactsLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [picking, search, filter])

  const send = async (e) => {
    e?.preventDefault()
    const content = draft.trim()
    if (!content || sending || !active) return
    setSending(true)
    setSendError('')
    try {
      const data = await apiFetch('/api/messages', { method: 'POST', body: { to: active.id, content } })
      setDraft('')
      setThread(t => ({ canSend: true, ...(t || {}), messages: [...(t?.messages || []), data.message] }))
      loadInbox()
    } catch (err) {
      setSendError(err.message || 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showList = !narrow || !active
  const showChat = !narrow || !!active
  const conversations = inbox?.conversations || []

  const personRow = (p, extra) => (
    <div key={p.id} onClick={() => openThread(p)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') openThread(p) }}
      style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', background: active?.id === p.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>{p.name}</span>{' '}
          <span style={{ ...muted, fontSize: '0.8rem' }}>@{p.username || 'unknown'}</span>
        </div>
        {extra}
      </div>
    </div>
  )

  return (
    <StudentPage title="Messages" icon="💬" backPath={ROLE_ROUTES[role] || '/'} maxWidth={1100}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', height: 'calc(100vh - 12rem)', minHeight: '420px' }}>

        {/* Left: conversations / new chat */}
        {showList && (
          <div style={{ ...panel, padding: 0, width: narrow ? '100%' : '340px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <strong style={{ color: C.turquoise }}>{picking ? 'New chat' : 'Chats'}</strong>
              <button style={picking ? ghostBtn : smallBtn} onClick={() => { setPicking(p => !p); setSearch(''); setFilter('') }}>
                {picking ? 'Back' : '+ New chat'}
              </button>
            </div>

            {picking ? (
              <>
                <div style={{ padding: '0.75rem 1rem', display: 'grid', gap: '0.5rem' }}>
                  <input style={{ ...glassInput, padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} value={search}
                    onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or username" aria-label="Search people" autoFocus />
                  <select style={{ ...glassInput, padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} value={filter}
                    onChange={(e) => setFilter(e.target.value)} aria-label="Filter by role">
                    {FILTERS.map(([v, l]) => <option key={v} value={v} style={{ color: 'black' }}>{l}</option>)}
                  </select>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {contactsError ? <p style={{ ...muted, color: '#ffb3b3', padding: '1rem' }}>{contactsError}</p>
                    : contactsLoading ? <p style={{ ...muted, padding: '1rem' }}>Loading...</p>
                    : contacts.length === 0 ? <p style={{ ...muted, padding: '1rem' }}>No one found.</p>
                    : contacts.map(c => personRow(c, <Chip color="#8fd3ff">{ROLE_LABELS[c.role] || c.role}</Chip>))}
                </div>
              </>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {inboxError ? <div style={{ padding: '1rem' }}><ErrorBox message={inboxError} onRetry={loadInbox} /></div>
                  : !inbox ? <p style={{ ...muted, padding: '1rem' }}>Loading...</p>
                  : conversations.length === 0 ? (
                    <p style={{ ...muted, padding: '1.5rem 1rem', textAlign: 'center' }}>No conversations yet. Tap "+ New chat" to message someone.</p>
                  ) : conversations.map(c => (
                    <div key={c.user.id} onClick={() => openThread(c.user)} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') openThread(c.user) }}
                      style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', background: active?.id === c.user.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.user.name}</span>
                        <span style={{ ...muted, fontSize: '0.75rem', flexShrink: 0 }}>{timeLabel(c.lastMessage.createdAt)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ ...muted, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.unread ? 700 : 400, color: c.unread ? 'white' : undefined }}>
                          {c.lastMessage.fromMe ? 'You: ' : ''}{c.lastMessage.content}
                        </span>
                        <UnreadDot n={c.unread} />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Right: open chat */}
        {showChat && (
          <div style={{ ...panel, padding: 0, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {!active ? (
              <div style={{ ...muted, margin: 'auto', textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
                Pick a conversation, or start a new chat.
              </div>
            ) : (
              <>
                <div style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                  {narrow && <button style={ghostBtn} onClick={() => setActive(null)} aria-label="Back to chats">←</button>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{active.name}</div>
                    <div style={{ ...muted, fontSize: '0.8rem' }}>
                      @{active.username || 'unknown'} · {ROLE_LABELS[active.role] || active.role}
                      {active.email ? ` · ${active.email}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {threadError ? <ErrorBox message={threadError} onRetry={() => openThread(active)} />
                    : threadLoading ? <p style={muted}>Loading...</p>
                    : thread && thread.messages.length === 0 ? <p style={{ ...muted, margin: 'auto' }}>No messages yet. Say hello!</p>
                    : (thread?.messages || []).map(m => (
                      <div key={m.id} style={{ alignSelf: m.fromMe ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                        <div style={{
                          padding: '0.55rem 0.8rem', borderRadius: '14px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                          background: m.fromMe ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.14)',
                          color: m.fromMe ? 'var(--color-bg)' : 'white',
                          borderBottomRightRadius: m.fromMe ? '4px' : '14px',
                          borderBottomLeftRadius: m.fromMe ? '14px' : '4px',
                        }}>
                          {m.content}
                        </div>
                        <div style={{ ...muted, fontSize: '0.7rem', marginTop: '0.15rem', textAlign: m.fromMe ? 'right' : 'left' }}>
                          {timeLabel(m.createdAt)}{m.fromMe ? (m.read ? ' ✓✓ Read' : ' ✓ Sent') : ''}
                        </div>
                      </div>
                    ))}
                  <div ref={bottomRef} />
                </div>

                {thread && !thread.canSend ? (
                  <p style={{ ...muted, padding: '0.9rem 1rem', borderTop: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                    You can't send messages in this chat right now. (Your account may still be waiting for verification.)
                  </p>
                ) : (
                  <form onSubmit={send} style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    {sendError && <p style={{ color: '#ffb3b3', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{sendError}</p>}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
                        rows={1} maxLength={MAX_LENGTH} placeholder="Type a message" aria-label="Message"
                        style={{ ...glassInput, padding: '0.65rem 0.9rem', resize: 'none', maxHeight: '8rem', flex: 1 }} />
                      <button type="submit" disabled={sending || !draft.trim() || threadLoading} style={{ ...smallBtn, opacity: sending || !draft.trim() ? 0.6 : 1, padding: '0.7rem 1.2rem' }}>
                        {sending ? '...' : 'Send'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </StudentPage>
  )
}
