import React from 'react'
import StudentPage from '../../components/student/StudentPage'
import { muted, panel } from '../../components/parent/parentUi'

// Placeholder: the real admin chat is built on the Phase 15 messaging system
export default function AdminChat() {
  return (
    <StudentPage title="Messages" icon="💬" backPath="/admin/dashboard">
      <div style={{ ...panel, textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚧</div>
        <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Messaging is coming soon</p>
        <p style={muted}>You'll be able to message any user from here once in-app messaging is built.</p>
      </div>
    </StudentPage>
  )
}
