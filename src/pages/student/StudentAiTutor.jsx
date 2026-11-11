import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'
import { apiFetch, apiStream } from '../../api/apiClient'
import { useT } from '../../i18n'
import Background from '../../components/shared/Background'
import Icon from '../../components/shared/Icon'
import { gradeLabel, subjectLabel } from '../../config/studentOptions'
import { glassCard, glassNav, glassBtn, glassInput } from '../../styles/glass'

const MAX_MESSAGES_PER_SESSION = 20
const SUGGESTION_KEYS = ['student.sugFractions', 'student.sugPhotosynthesis', 'student.sugEssay', 'student.sugEquation']

const notice = { marginTop: '0.75rem', border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.9rem', fontSize: 'var(--fs-sm)', overflowWrap: 'anywhere', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }

// The tutor's replies come back in the language chosen in Settings (the server reads it from the account).
// The page fills the visible height (--app-height follows the on-screen keyboard), so the message box stays above it.
export default function StudentAiTutor() {
  const t = useT()
  const navigate = useNavigate()
  const { appName, logoUrl } = useBranding()

  const [ctx, setCtx] = useState(null)         // { grade, subjects }
  const [messages, setMessages] = useState([]) // [{ role: 'user' | 'assistant', content }]
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef(null)
  const abortRef = useRef(null)

  const userCount = messages.filter(m => m.role === 'user').length
  const limitReached = userCount >= MAX_MESSAGES_PER_SESSION

  // Pre-warm Render (free instances sleep) and load the student's grade + subjects
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/ping`).catch(() => {})
    apiFetch('/api/student/context').then(setCtx).catch(() => setCtx({ grade: null, subjects: [] }))
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || sending || limitReached) return

    setError('')
    setInput('')
    setSending(true)

    const history = messages.filter(m => m.content) // what the server sees as past context
    setMessages([...history, { role: 'user', content: message }, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await apiStream('/api/ai-tutor', {
        body: { message, history },
        signal: controller.signal,
        onChunk: (chunk) =>
          setMessages(prev => {
            const next = [...prev]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + chunk }
            return next
          }),
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || t('common.somethingWentWrong'))
      // Drop the empty placeholder (and keep the student's question so they can retry)
      setMessages(prev => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev))
      setInput(message)
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const newChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setError('')
    setSending(false)
  }

  const subjects = ctx?.subjects || []
  const canSend = !(sending || limitReached || !input.trim())

  return (
    <div style={{ height: 'var(--app-height)', display: 'flex', flexDirection: 'column', position: 'relative', color: 'var(--fg)' }}>
      <Background />

      <nav style={glassNav}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, fontFamily: 'var(--font-brand)', fontSize: 'var(--fs-2xl)', lineHeight: 1.1 }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: '1.8rem' }} />}
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{appName}</span>
        </span>
        <button onClick={() => navigate('/student/dashboard')}
          style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Icon name="back" />
          {t('common.back')}
        </button>
      </nav>

      <div style={{
        flex: 1, minHeight: 0, width: '100%', maxWidth: '54rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
        padding: `var(--sp-3) calc(var(--page-gutter) + var(--safe-right)) calc(var(--sp-3) + var(--safe-bottom)) calc(var(--page-gutter) + var(--safe-left))`,
      }}>
        {/* Header: who the tutor is helping */}
        <div style={{ ...glassCard, padding: 'var(--sp-3) var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--fs-xl)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Icon name="messages" />{t('shell.f_ai_tutor')}</h2>
            <div style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: '0.3rem', overflowWrap: 'anywhere' }}>
              {ctx === null
                ? t('student.loadingDetails')
                : <>
                    {ctx.grade ? gradeLabel(ctx.grade, t) : t('student.gradeNotSet')}
                    {subjects.length > 0 && ` · ${subjects.map(s => subjectLabel(s, t)).join(', ')}`}
                  </>}
            </div>
          </div>
          <button onClick={newChat} disabled={messages.length === 0}
            style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1rem', margin: 0, fontSize: 'var(--fs-sm)', opacity: messages.length ? 1 : 0.4, cursor: messages.length ? 'pointer' : 'default' }}>
            {t('student.newChat')}
          </button>
        </div>

        {/* Conversation */}
        <div style={{ ...glassCard, flex: 1, minHeight: 0, padding: 'var(--sp-3)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingInlineEnd: '0.25rem' }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '30rem' }}>
                <p style={{ margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>{t('student.tutorIntro')}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {SUGGESTION_KEYS.map(k => (
                    <button key={k} onClick={() => send(t(k))}
                      style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--fg)', borderRadius: 'var(--radius-pill)', padding: '0.5rem 0.95rem', minHeight: '2.5rem', cursor: 'pointer', fontSize: 'var(--fs-sm)', maxWidth: '100%', overflowWrap: 'anywhere' }}>
                      {t(k)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = m.role === 'user'
                const typing = !mine && m.content === '' && sending && i === messages.length - 1
                return (
                  <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', minWidth: 0 }}>
                    <div style={{
                      padding: '0.7rem 1rem',
                      borderRadius: mine ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                      background: mine ? 'var(--fg)' : 'var(--surface-2)',
                      color: mine ? 'var(--on-fg)' : 'var(--fg)',
                      border: mine ? '1px solid var(--fg)' : '1px solid var(--border)',
                      fontWeight: mine ? 600 : 400,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}>
                      {typing ? <span style={{ opacity: 0.7 }}>{t('student.thinking')}</span> : m.content}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div role="alert" style={notice}><Icon name="warning" style={{ marginTop: '0.15em' }} /><span style={{ minWidth: 0 }}>{error}</span></div>}
          {limitReached && <div role="status" style={notice}><Icon name="info" style={{ marginTop: '0.15em' }} /><span style={{ minWidth: 0 }}>{t('student.chatLimit', { n: MAX_MESSAGES_PER_SESSION })}</span></div>}

          {/* Input */}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('student.askPlaceholder')}
              aria-label={t('student.askPlaceholder')}
              rows={1}
              maxLength={2000}
              disabled={limitReached}
              style={{ ...glassInput, resize: 'none', minHeight: '3rem', maxHeight: '8rem', flex: 1, minWidth: 0, fontSize: '16px', lineHeight: 1.4 }}
            />
            <button onClick={() => send()} disabled={!canSend} aria-label={t('common.send')}
              style={{ ...glassBtn, width: 'auto', margin: 0, minHeight: '3rem', padding: '0.5rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', opacity: canSend ? 1 : 0.5, flexShrink: 0 }}>
              <Icon name="send" />
              <span>{sending ? '...' : t('common.send')}</span>
            </button>
          </div>
          <div style={{ color: 'var(--fg-subtle)', fontSize: 'var(--fs-xs)', marginTop: '0.4rem' }}>
            {t('student.messageCount', { n: userCount, max: MAX_MESSAGES_PER_SESSION })}
          </div>
        </div>
      </div>
    </div>
  )
}
