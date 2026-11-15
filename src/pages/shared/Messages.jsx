import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n/index.js'
import { supabase } from '../../supabase/client'
import { apiFetch } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import StudentPage from '../../components/student/StudentPage'
import { panel, muted, smallBtn, ghostBtn, Chip, ErrorBox } from '../../components/parent/parentUi'
import { glassInput } from '../../styles/glass'
import ClassAnnouncement from '../../components/messages/ClassAnnouncement'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/shared/Icon'

const PT_COLOR = '#ffd166'
const ROLES = ['teacher', 'student', 'parent', 'principal', 'tutor', 'staff']
const MAX_LENGTH = 4000

function timeLabel(iso, t) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return t('shared.yesterday')
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
    <span style={{ minWidth: '1.3rem', height: '1.3rem', padding: '0 0.35rem', borderRadius: '999px', background: 'var(--color-primary)', color: 'var(--color-bg)', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function Messages() {
  const t = useT()
  const { user, role } = useAuth()
  const narrow = useNarrow()

  const ROLE_LABELS = { student: t('shared.roles.student'), teacher: t('shared.roles.teacher'), parent: t('shared.roles.parent'), principal: t('shared.roles.principal'), tutor: t('shared.roles.tutor'), staff: t('shared.roles.staff'), admin: t('shared.roles.admin') }
  const FILTERS = [['', t('shared.roles.everyone')], ...ROLES.map(r => [r, ROLE_LABELS[r]])]

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
  const [announcing, setAnnouncing] = useState(false)  // teacher: message all parents of a class
  const [myTeachers, setMyTeachers] = useState([])     // parent: teachers of my children
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
      setInboxError(err.message || t('shared.messages.loadError'))
    }
  }, [t])

  const openThread = useCallback(async (person) => {
    setActive(person)
    setPicking(false)
    setAnnouncing(false)
    setThread(null)
    setThreadError('')
    setSendError('')
    setThreadLoading(true)
    try {
      const data = await apiFetch(`/api/messages/thread/${person.id}`)
      if (activeRef.current?.id !== person.id) return // user already opened someone else
      setActive(data.user)
      setThread({ messages: data.messages, canSend: data.canSend, parentTeacher: !!data.parentTeacher })
      loadInbox() // the unread count for this chat is now zero
    } catch (err) {
      if (activeRef.current?.id === person.id) setThreadError(err.message || t('shared.messages.threadError'))
    } finally {
      if (activeRef.current?.id === person.id) setThreadLoading(false)
    }
  }, [loadInbox, t])

  useEffect(() => { loadInbox() }, [loadInbox])

  // Parents get their child's teachers as quick contacts
  useEffect(() => {
    if (role !== 'parent') return
    apiFetch('/api/parent/teachers').then(d => setMyTeachers(d.teachers || [])).catch(() => {})
  }, [role])

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
            setThread(t2 => t2 && !t2.messages.some(x => x.id === m.id)
              ? { ...t2, messages: [...t2.messages, { id: m.id, fromMe: false, content: m.content, read: true, createdAt: m.created_at }] }
              : t2)
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
    const tm = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set('q', search.trim())
        if (filter) params.set('role', filter)
        const data = await apiFetch(`/api/messages/contacts?${params.toString()}`)
        if (!cancelled) setContacts(data.contacts || [])
      } catch (err) {
        if (!cancelled) setContactsError(err.message || t('shared.messages.contactsError'))
      } finally {
        if (!cancelled) setContactsLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(tm) }
  }, [picking, search, filter, t])

  const send = async (e) => {
    e?.preventDefault()
    const content = draft.trim()
    if (!content || sending || !active) return
    setSending(true)
    setSendError('')
    try {
      const data = await apiFetch('/api/messages', { method: 'POST', body: { to: active.id, content } })
      setDraft('')
      setThread(t2 => ({ canSend: true, ...(t2 || {}), messages: [...(t2?.messages || []), data.message] }))
      loadInbox()
    } catch (err) {
      setSendError(err.message || t('shared.messages.sendError'))
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showList = !narrow || (!active && !announcing)
  const showChat = !narrow || !!active || announcing
  const conversations = inbox?.conversations || []

  const personRow = (p, extra) => (
    <div key={p.id} onClick={() => openThread(p)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') openThread(p) }}
      style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', background: active?.id === p.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontWeight: 700 }}>{p.name}</span>{' '}
          <span style={{ ...muted, fontSize: '0.8rem' }}>@{p.username || t('shared.messages.unknown')}</span>
        </div>
        {extra}
      </div>
    </div>
  )

  return (
    <StudentPage title={t('shared.messages.title')} icon="messages" backPath={ROLE_ROUTES[role] || '/'} maxWidth={1100}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', height: 'calc(100dvh - 12rem)', minHeight: '26rem' }}>

        {/* Left: conversations / new chat */}
        {showList && (
          <div style={{ ...panel, padding: 0, width: narrow ? '100%' : '21.25rem', minWidth: 0, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <strong style={{ color: 'var(--color-primary)' }}>{picking ? t('shared.messages.newChat') : t('shared.messages.chats')}</strong>
              <span style={{ display: 'flex', gap: '0.4rem' }}>
                {role === 'teacher' && !picking && (
                  <button style={ghostBtn} onClick={() => { setAnnouncing(true); setActive(null) }} title={t('shared.messages.messageParents')}>
                    <Icon name="messages" size={14} style={{ marginRight: '0.3rem' }} />{t('shared.messages.parentsShort')}
                  </button>
                )}
                <button style={picking ? ghostBtn : smallBtn} onClick={() => { setPicking(p => !p); setSearch(''); setFilter('') }}>
                  {picking ? t('shared.back') : <><Icon name="plus" size={14} style={{ marginRight: '0.3rem' }} />{t('shared.messages.newChat')}</>}
                </button>
              </span>
            </div>

            {picking ? (
              <>
                <div style={{ padding: '0.75rem 1rem', display: 'grid', gap: '0.5rem' }}>
                  <input style={{ ...glassInput, padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} value={search}
                    onChange={(e) => setSearch(e.target.value)} placeholder={t('shared.messages.searchPlaceholder')} aria-label={t('shared.messages.searchPlaceholder')} autoFocus />
                  <select style={{ ...glassInput, padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} value={filter}
                    onChange={(e) => setFilter(e.target.value)} aria-label={t('shared.messages.filterByRole')}>
                    {FILTERS.map(([v, l]) => <option key={v} value={v} style={{ color: '#000' }}>{l}</option>)}
                  </select>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {role === 'parent' && myTeachers.length > 0 && !search.trim() && !filter && (
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                      <div style={{ ...muted, fontSize: '0.75rem', padding: '0.6rem 1rem 0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('shared.messages.yourChildTeachers')}</div>
                      {myTeachers.map(tc => personRow(tc, <Chip color={PT_COLOR}>{tc.children.join(', ') || t('shared.roles.teacher')}</Chip>))}
                    </div>
                  )}
                  {contactsError ? <p style={{ ...muted, color: '#ffb3b3', padding: '1rem' }}>{contactsError}</p>
                    : contactsLoading ? <p style={{ ...muted, padding: '1rem' }}>{t('shared.loading')}</p>
                    : contacts.length === 0 ? <p style={{ ...muted, padding: '1rem' }}>{t('shared.messages.noOneFound')}</p>
                    : contacts.map(c => personRow(c, <Chip color="#8fd3ff">{ROLE_LABELS[c.role] || c.role}</Chip>))}
                </div>
              </>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {inboxError ? <div style={{ padding: '1rem' }}><ErrorBox message={inboxError} onRetry={loadInbox} /></div>
                  : !inbox ? <p style={{ ...muted, padding: '1rem' }}>{t('shared.loading')}</p>
                  : conversations.length === 0 ? (
                    <p style={{ ...muted, padding: '1.5rem 1rem', textAlign: 'center' }}>{t('shared.messages.noConversations')}</p>
                  ) : conversations.map(c => (
                    <div key={c.user.id} onClick={() => openThread(c.user)} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') openThread(c.user) }}
                      style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.08)', background: active?.id === c.user.id ? 'rgba(var(--color-primary-rgb),0.15)' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.user.name}{c.parentTeacher && <span style={{ marginLeft: '0.4rem' }}><Chip color={PT_COLOR}>{t('shared.messages.parentTeacher')}</Chip></span>}</span>
                        <span style={{ ...muted, fontSize: '0.75rem', flexShrink: 0 }}>{timeLabel(c.lastMessage.createdAt, t)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ ...muted, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.unread ? 700 : 400, color: c.unread ? 'var(--fg)' : undefined }}>
                          {c.lastMessage.fromMe ? `${t('shared.messages.you')}: ` : ''}{c.lastMessage.content}
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
            {announcing ? (
              <ClassAnnouncement onClose={() => setAnnouncing(false)} onSent={loadInbox} />
            ) : !active ? (
              <div style={{ ...muted, margin: 'auto', textAlign: 'center', padding: '2rem' }}>
                <Icon name="messages" size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <div>{t('shared.messages.pickConversation')}</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                  {narrow && <button style={ghostBtn} onClick={() => setActive(null)} aria-label={t('shared.back')}><Icon name="back" size={16} /></button>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{active.name}</div>
                    <div style={{ ...muted, fontSize: '0.8rem' }}>
                      @{active.username || t('shared.messages.unknown')} · {ROLE_LABELS[active.role] || active.role}
                      {active.email ? ` · ${active.email}` : ''}
                    </div>
                  </div>
                  {thread?.parentTeacher && <span style={{ marginLeft: 'auto' }}><Chip color={PT_COLOR}>{t('shared.messages.parentTeacher')}</Chip></span>}
                </div>
                {thread?.parentTeacher && (
                  <p style={{ ...muted, fontSize: '0.75rem', padding: '0.4rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {t('shared.messages.parentTeacherNotice')}
                  </p>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {threadError ? <ErrorBox message={threadError} onRetry={() => openThread(active)} />
                    : threadLoading ? <SkeletonList />
                    : thread && thread.messages.length === 0 ? <p style={{ ...muted, margin: 'auto' }}>{t('shared.messages.sayHello')}</p>
                    : (thread?.messages || []).map(m => (
                      <div key={m.id} style={{ alignSelf: m.fromMe ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                        <div style={{
                          padding: '0.55rem 0.8rem', borderRadius: '0.875rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                          background: m.fromMe ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.14)',
                          color: m.fromMe ? 'var(--color-bg)' : 'var(--fg)',
                          borderBottomRightRadius: m.fromMe ? '0.25rem' : '0.875rem',
                          borderBottomLeftRadius: m.fromMe ? '0.875rem' : '0.25rem',
                        }}>
                          {m.content}
                        </div>
                        <div style={{ ...muted, fontSize: '0.7rem', marginTop: '0.15rem', textAlign: m.fromMe ? 'right' : 'left', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                          <span>{timeLabel(m.createdAt, t)}</span>
                          {m.fromMe && (m.read
                            ? <><Icon name="check" size={11} /><Icon name="check" size={11} style={{ marginLeft: '-0.5rem' }} />{t('shared.messages.read')}</>
                            : <><Icon name="check" size={11} />{t('shared.messages.sent')}</>)}
                        </div>
                      </div>
                    ))}
                  <div ref={bottomRef} />
                </div>

                {thread && !thread.canSend ? (
                  <p style={{ ...muted, padding: '0.9rem 1rem', borderTop: '1px solid rgba(255,255,255,0.12)', textAlign: 'center' }}>
                    {t('shared.messages.cannotSend')}
                  </p>
                ) : (
                  <form onSubmit={send} style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    {sendError && <p style={{ color: '#ffb3b3', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{sendError}</p>}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
                        rows={1} maxLength={MAX_LENGTH} placeholder={t('shared.messages.typeMessage')} aria-label={t('shared.messages.typeMessage')}
                        style={{ ...glassInput, padding: '0.65rem 0.9rem', resize: 'none', maxHeight: '8rem', flex: 1, minWidth: 0 }} />
                      <button type="submit" disabled={sending || !draft.trim() || threadLoading} style={{ ...smallBtn, opacity: sending || !draft.trim() ? 0.6 : 1, padding: '0.7rem 1.2rem' }}>
                        {sending ? '…' : <Icon name="send" size={16} />}
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
