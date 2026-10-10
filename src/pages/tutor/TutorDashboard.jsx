import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { fmtDuration } from '../../components/tutor/tutorUi'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from '../../components/student/studentUtils'
import { glassBtn } from '../../styles/glass'

const cards = [
  { icon: '👨‍🎓', title: 'My Students', description: 'View and manage your assigned students', path: '/tutor/students', requiresVerification: true },
  { icon: '📅', title: 'Sessions', description: 'Schedule and manage tutoring sessions', path: '/tutor/sessions', requiresVerification: true },
  { icon: '📝', title: 'Learning Plans', description: 'Create personalised learning plans for students', path: '/tutor/plans', requiresVerification: true },
  { icon: '📊', title: 'Progress Reports', description: 'Track and report on student progress', path: '/tutor/progress', requiresVerification: true },
  { icon: '💬', title: 'Messages', description: 'Communicate with students and parents', path: '/messages', requiresVerification: true },
  { icon: '📖', title: 'Resources', description: 'Access and share learning materials', path: '/tutor/resources', requiresVerification: false },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/tutor/contact-admin', requiresVerification: false },
]

function Stat({ label, value }) {
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={muted}>{label}</div>
    </div>
  )
}

function TutorSummary() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/tutor/overview')

  if (loading) return <p style={{ ...muted, marginTop: '1rem' }}>Loading your overview...</p>
  if (error) return <div style={{ marginTop: '1rem' }}><ErrorBox message={error} onRetry={reload} /></div>

  const { org, isVerified, studentCount, upcomingCount, completedCount, upcoming } = data

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{org?.name || 'No organisation linked'}</div>
        <Chip color={isVerified ? '#7CFC9A' : '#ffe08a'}>{isVerified ? 'Verified' : 'Awaiting verification'}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem' }}>
        <Stat label="Students" value={studentCount} />
        <Stat label="Upcoming sessions" value={upcomingCount} />
        <Stat label="Sessions completed" value={completedCount} />
      </div>

      <div style={panel}>
        <h3 style={panelTitle}>Next sessions</h3>
        {upcoming.length === 0 ? (
          <p style={muted}>{studentCount === 0 ? 'Add your first student to start booking sessions.' : 'No upcoming sessions.'}</p>
        ) : upcoming.map(s => (
          <div key={s.id} style={{ marginBottom: '0.7rem' }}>
            <div style={{ fontWeight: 600 }}>{s.studentName}{s.subject ? ` · ${s.subject}` : ''}</div>
            <div style={{ ...muted, fontSize: '0.8rem' }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/tutor/sessions')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>Manage sessions</button>
        <button onClick={() => navigate('/tutor/students')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>My students</button>
      </div>
    </div>
  )
}

export default function TutorDashboard() {
  return (
    <DashboardShell role="tutor" collection="tutors" cards={cards}>
      <TutorSummary />
    </DashboardShell>
  )
}
