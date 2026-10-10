import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { glassBtn, C } from '../../styles/glass'

// Navbar button that opens the messages page and shows how many messages are unread
export default function MessagesBell() {
  const navigate = useNavigate()
  const { unread } = useUnreadMessages()

  return (
    <button onClick={() => navigate('/messages')} aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
      style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1rem', margin: 0, position: 'relative' }}>
      💬
      {unread > 0 && (
        <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '1.2rem', height: '1.2rem', padding: '0 0.3rem', borderRadius: '999px', background: '#ff5a5f', color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.navy}` }}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
