import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import { useApiData } from '../../hooks/useApiData'
import { dueIn, fmtDate } from '../../components/student/studentUtils'
import { glassCard, glassBtn, C } from '../../styles/glass'

const cards = [
  { icon: '🏫', title: 'My Classes', description: 'Manage your classes and student rosters', path: '/teacher/classes', requiresVerification: true },
  { icon: '📝', title: 'Assignments', description: 'Create and manage homework assignments', path: '/teacher/assignments', requiresVerification: true },
  { icon: '📊', title: 'Student Progress', description: 'Track and review student performance', path: '/teacher/progress', requiresVerification: true },
  { icon: '💬', title: 'Messages', description: 'Communicate with students and parents', path: '/teacher/messages', requiresVerification: true },
  { icon: '📅', title: 'Schedule', description: 'View and manage your teaching schedule', path: '/teacher/schedule', requiresVerification: false },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/teacher/contact-admin', requiresVerification: false },
]

const panel = { ...glassCard, padding: '1.25rem' }
const panelTitle = { color: C.turquoise, fontSize: '1.05rem', marginBottom: '0.75rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }

function Stat({ label, value }) {
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem', fontWeight: 700, color: C.turquoise }}>{value}</div>
      <div style={muted}>{label}</div>
    </div>
  )
}

function TeacherSummary() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/teacher/overview')

  if (loading) return <p style={{ ...muted, marginTop: '1rem' }}>Loading your overview...</p>
  if (error) {
    return (
      <div style={{ ...panel, marginTop: '1rem', borderColor: 'rgba(255,80,80,0.4)' }}>
        <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
        <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
      </div>
    )
  }

  const { classes, totals, upcoming } = data

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem' }}>
        <Stat label="Classes" value={totals.classes} />
        <Stat label="Students" value={totals.students} />
        <Stat label="Submissions to grade" value={totals.toGrade} />
      </div>

      {classes.length === 0 ? (
        <div style={{ ...panel, ...muted }}>
          You haven't added any classes yet. Go to My Classes and add the grade and class you teach, for example 8C.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={panel}>
            <h3 style={panelTitle}>Your classes</h3>
            {classes.map(c => (
              <div key={c.id} onClick={() => navigate('/teacher/classes')}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem', cursor: 'pointer' }}>
                <span>
                  <strong>{c.name}</strong>
                  <span style={{ ...muted, fontSize: '0.8rem' }}>{c.grade ? ` · Grade ${c.grade}` : ''}</span>
                </span>
                <span style={muted}>{c.studentCount} student{c.studentCount === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>

          <div style={panel}>
            <h3 style={panelTitle}>Upcoming due dates</h3>
            {upcoming.length === 0 ? <p style={muted}>No assignments coming due.</p> : upcoming.map(a => (
              <div key={a.id} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div style={{ ...muted, fontSize: '0.8rem' }}>
                  {a.className} · {fmtDate(a.dueDate)} · {dueIn(a.dueDate)}
                </div>
                <div style={{ ...muted, fontSize: '0.8rem' }}>{a.submitted} of {a.studentCount} submitted</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <DashboardShell role="teacher" cards={cards}>
      <TeacherSummary />
    </DashboardShell>
  )
}
