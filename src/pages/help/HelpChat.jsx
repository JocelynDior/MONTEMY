import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import ChatBubble from '../../components/help/ChatBubble'
import OptionChips from '../../components/help/OptionChips'
import ChatHistoryList from '../../components/help/ChatHistoryList'
import Icon from '../../components/shared/Icon'
import { ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n'
import { routeForPage } from '../../config/roleFeatures'
import { ROLE_ROUTES } from '../../supabase/authHelpers'
import { glassInput } from '../../styles/glass'

// Help assistant. The AI tries first (with the app guide), can open pages and change the picture or language,
// and hands the chat to an admin when it cannot solve the problem. Chats are saved with an AI-written title.
export default function HelpChat() {
  const { t, setLang } = useI18n()
  const navigate = useNavigate()
  const { role, refreshProfile } = useAuth()
  const [params, setParams] = useSearchParams()
  const [chats, setChats] = useState([])
  const [chat, setChat] = useState(null)         // the open chat: { id, title, status }
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showList, setShowList] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const endRef = useRef(null)

  const loadList = useCallback(async () => {
    try { setChats((await apiFetch('/api/help/chats')).chats) } catch (err) { setError(err.message) }
  }, [])

  const openChat = useCallback(async (id) => {
    setError(''); setShowList(false)
    try {
      const r = await apiFetch(`/api/help/chats/${id}`)
      setChat(r.chat); setMessages(r.messages)
    } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => {
    loadList()
    const id = params.get('chat')
    if (id) openChat(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, sending])

  const afterAi = async (msgs) => {
    // The assistant may have changed the picture or language: pick the changes up
    for (const m of msgs) for (const o of (m.options || [])) {
      if (o.type === 'language_changed' && o.language) setLang(o.language)
      if (o.type === 'avatar_changed') await refreshProfile()
    }
  }

  const send = async (body) => {
    const value = (body ?? text).trim()
    if (!value || sending) return
    setSending(true); setError(''); setText('')
    const temp = { id: `tmp-${Date.now()}`, sender: 'user', body: value, createdAt: new Date().toISOString() }
    setMessages(m => [...m, temp])
    try {
      const r = chat
        ? await apiFetch(`/api/help/chats/${chat.id}/messages`, { method: 'POST', body: { body: value } })
        : await apiFetch('/api/help/chats', { method: 'POST', body: { message: value } })
      setChat(r.chat)
      setMessages(m => [...m.filter(x => x.id !== temp.id), ...r.messages])
      setParams(p => { const n = new URLSearchParams(p); n.set('chat', r.chat.id); return n }, { replace: true })
      await afterAi(r.messages)
      loadList()
    } catch (err) {
      setMessages(m => m.filter(x => x.id !== temp.id))
      setText(value)
      setError(err.message)
    }
    setSending(false)
  }

  const askAdmin = async () => {
    if (!chat || sending) return
    setSending(true); setError('')
    try {
      const r = await apiFetch(`/api/help/chats/${chat.id}/escalate`, { method: 'POST' })
      setChat(r.chat); setMessages(m => [...m, ...r.messages]); loadList()
    } catch (err) { setError(err.message) }
    setSending(false)
  }

  const newChat = () => { setChat(null); setMessages([]); setError(''); setShowList(false); setParams({}, { replace: true }) }

  const removeChat = async (id) => {
    setBusyId(id)
    try {
      await apiFetch(`/api/help/chats/${id}`, { method: 'DELETE' })
      if (chat?.id === id) newChat()
      await loadList()
    } catch (err) { setError(err.message) }
    setBusyId(null)
  }

  const openPage = (page) => navigate(routeForPage(role, page) || ROLE_ROUTES[role] || '/')

  // Answers to the AI's last message can only be tapped once
  const lastAiIndex = messages.map(m => m.sender).lastIndexOf('ai')
  const waiting = chat?.status === 'waiting_admin'
  const closed = chat?.status === 'closed'

  return (
    <StudentPage title={t('help.title')} icon="help" backPath={ROLE_ROUTES[role] || '/'} maxWidth={760}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
        <button type="button" onClick={newChat} style={smallBtn}>{t('help.newChat')}</button>
        <button type="button" onClick={() => { setShowList(s => !s); loadList() }} aria-expanded={showList} style={ghostBtn}>{t('help.history')}</button>
        {chat && !waiting && !closed && <button type="button" onClick={askAdmin} disabled={sending} style={ghostBtn}>{t('help.talkToAdmin')}</button>}
      </div>

      {showList && (
        <div style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
          <h3 style={panelTitle}>{t('help.history')}</h3>
          <ChatHistoryList chats={chats} activeId={chat?.id} onOpen={openChat} onDelete={removeChat} busyId={busyId} />
          <p style={{ ...muted, marginTop: '0.75rem', fontSize: 'var(--fs-xs)' }}>{t('help.keptDays')}</p>
        </div>
      )}

      {error && <div style={{ marginBottom: 'var(--sp-3)' }}><ErrorBox message={error} /></div>}

      <div style={{ ...panel, padding: 'var(--sp-3)', display: 'grid', gap: '0.75rem', minHeight: '40vh' }}>
        {chat && <div style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{chat.title}</div>}
        {messages.length === 0 && !sending && (
          <div style={{ color: 'var(--fg-muted)' }}>
            <p style={{ marginBottom: '0.5rem' }}>{t('help.intro')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['suggest1', 'suggest2', 'suggest3'].map(k => (
                <button key={k} type="button" onClick={() => send(t(`help.${k}`))}
                  style={{ padding: '0.5rem 1rem', minHeight: '2.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm)' }}>{t(`help.${k}`)}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id}>
            <ChatBubble message={m} />
            {m.sender === 'ai' && <OptionChips options={m.options} disabled={sending || i !== lastAiIndex || waiting}
              onPick={(label) => send(label)} onOpen={openPage} />}
          </div>
        ))}

        {sending && <div role="status" style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>{t('help.thinking')}</div>}
        {waiting && <div role="status" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}><Icon name="clock" />{t('help.waitingAdmin')}</div>}
        {closed && <div role="status" style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}>{t('help.closed')}</div>}
        <div ref={endRef} />
      </div>

      {!closed && (
        <form onSubmit={(e) => { e.preventDefault(); send() }} style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--sp-3)' }}>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder={t('help.placeholder')} aria-label={t('help.placeholder')} style={glassInput} />
          <button type="submit" disabled={sending || !text.trim()} aria-label={t('help.send')}
            style={{ ...smallBtn, minHeight: '2.75rem', padding: '0 1rem', display: 'inline-flex', alignItems: 'center', opacity: sending || !text.trim() ? 0.6 : 1 }}>
            <Icon name="send" />
          </button>
        </form>
      )}
    </StudentPage>
  )
}
