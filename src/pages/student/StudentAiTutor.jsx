import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBranding } from '../../context/BrandingContext'
import { apiFetch, apiStream } from '../../api/apiClient'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassNav, glassBtn, glassInput, C } from '../../styles/glass'

const MAX_MESSAGES_PER_SESSION = 20
const SUGGESTIONS = [
  'Can you explain fractions to me?',
  'Help me understand photosynthesis',
  'How do I start an essay?',
  'I am stuck on an equation',
]

export default function StudentAiTutor() {
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
      setError(err.message || 'Something went wrong. Please try again.')
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', color: 'white' }}>
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
      )}

      <nav style={glassNav}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>
          {logoUrl && <img src={logoUrl} alt="" style={{ height: '1.8rem' }} />}
          {appName}
        </span>
        <button onClick={() => navigate('/student/dashboard')}
          style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem', margin: 0 }}>
          Dashboard
        </button>
      </nav>

      <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: '860px', margin: '0 auto', padding: '1.25rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header: who the tutor is helping */}
        <div style={{ ...glassCard, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ color: C.turquoise, margin: 0, fontSize: '1.4rem' }}>🤖 AI Tutor</h2>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              {ctx === null
                ? 'Loading your details...'
                : <>
                    {ctx.grade ? `Grade ${ctx.grade}` : 'Grade not set'}
                    {subjects.length > 0 && ` · ${subjects.join(', ')}`}
                  </>}
            </div>
          </div>
          <button onClick={newChat} disabled={messages.length === 0}
            style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: messages.length ? 1 : 0.4, cursor: messages.length ? 'pointer' : 'default' }}>
            New chat
          </button>
        </div>

        {/* Conversation */}
        <div style={{ ...glassCard, flex: 1, minHeight: 0, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '480px' }}>
                <div style={{ fontSize: '2.5rem' }}>👋</div>
                <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0.5rem 0 1rem', lineHeight: 1.5 }}>
                  Hi! I'm here to help you learn. I won't just give you the answers, but I'll help you work them out.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(var(--color-primary-rgb),0.4)', color: 'white', borderRadius: '999px', padding: '0.45rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const mine = m.role === 'user'
                const typing = !mine && m.content === '' && sending && i === messages.length - 1
                return (
                  <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                    <div style={{
                      padding: '0.7rem 1rem',
                      borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: mine ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.12)',
                      color: mine ? 'var(--color-bg)' : 'white',
                      fontWeight: mine ? 600 : 400,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}>
                      {typing ? <span style={{ opacity: 0.7 }}>Thinking...</span> : m.content}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.6rem 0.9rem', color: '#ffb3b3', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {limitReached && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(255,200,0,0.15)', border: '1px solid rgba(255,200,0,0.4)', borderRadius: '10px', padding: '0.6rem 0.9rem', color: '#ffe08a', fontSize: '0.9rem' }}>
              You've reached the {MAX_MESSAGES_PER_SESSION} message limit for this chat. Start a new chat to keep going.
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
            <style>{`.tutor-input::placeholder { color: rgba(255,255,255,0.75); }`}</style>
            <textarea
              className="tutor-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question..."
              rows={1}
              maxLength={2000}
              disabled={limitReached}
              style={{ ...glassInput, resize: 'none', minHeight: '3rem', maxHeight: '8rem', flex: 1, fontSize: '16px', lineHeight: 1.4 }}
            />
            <button onClick={() => send()} disabled={sending || limitReached || !input.trim()}
              style={{ ...glassBtn, width: 'auto', padding: '0.85rem 1.4rem', opacity: sending || limitReached || !input.trim() ? 0.5 : 1 }}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
            {userCount}/{MAX_MESSAGES_PER_SESSION} messages · AI can make mistakes, so double-check important answers.
          </div>
        </div>
      </div>
    </div>
  )
}
