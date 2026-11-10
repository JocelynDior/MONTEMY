import React from 'react'
import { useT } from '../../i18n'

// One message. The person's own messages sit at the end side, solid; AI and admin messages at the start, outlined.
export default function ChatBubble({ message }) {
  const t = useT()
  const mine = message.sender === 'user'
  const who = message.sender === 'admin' ? t('help.admin') : message.sender === 'ai' ? t('help.assistant') : ''
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', minWidth: 0 }}>
      <div style={{ maxWidth: 'min(85%, 34rem)', minWidth: 0 }}>
        {who && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginBottom: '0.2rem' }}>{who}</div>}
        <div style={{
          padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-lg)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.55, fontSize: 'var(--fs-md)',
          background: mine ? 'var(--fg)' : 'var(--surface)', color: mine ? 'var(--on-fg)' : 'var(--fg)', border: mine ? '1px solid var(--fg)' : '1px solid var(--border-strong)',
        }}>{message.body}</div>
      </div>
    </div>
  )
}
