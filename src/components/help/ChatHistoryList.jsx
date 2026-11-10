import React from 'react'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'

// Past chats, newest first. Tap one to open it; the bin deletes it.
export default function ChatHistoryList({ chats, activeId, onOpen, onDelete, busyId }) {
  const t = useT()
  if (!chats.length) return <p style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)' }}>{t('help.noChats')}</p>
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
      {chats.map(c => {
        const on = c.id === activeId
        return (
          <li key={c.id} style={{ display: 'flex', alignItems: 'stretch', gap: '0.4rem', minWidth: 0 }}>
            <button type="button" onClick={() => onOpen(c.id)} aria-current={on ? 'true' : undefined}
              style={{ flex: 1, minWidth: 0, textAlign: 'start', padding: '0.65rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--fg)', background: on ? 'var(--surface-2)' : 'var(--surface)', border: on ? '2px solid var(--fg)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere' }}>{c.title}</span>
              <span style={{ display: 'block', color: 'var(--fg-muted)', fontSize: 'var(--fs-xs)' }}>
                {t(`help.status_${c.status}`)} · {new Date(c.updatedAt).toLocaleDateString()}
              </span>
            </button>
            <button type="button" disabled={busyId === c.id} onClick={() => onDelete(c.id)} aria-label={t('help.deleteChat')}
              style={{ padding: '0 0.75rem', cursor: 'pointer', color: 'var(--fg)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center' }}>
              <Icon name="trash" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
