import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import StudentProfileForm from '../../components/student/StudentProfileForm'
import ParentLinks from '../../components/student/ParentLinks'
import NextTutorSession from '../../components/student/NextTutorSession'
import { useStudentOverview } from '../../hooks/useStudentOverview'
import { dueIn, fmtDate, gradeColor, sortByDue, statusColor } from '../../components/student/studentUtils'
import { glassCard, glassBtn, C } from '../../styles/glass'

const cards = [
  { icon: '📚', title: 'My Subjects', description: 'View your subjects and learning materials', path: '/student/academics', requiresVerification: true },
  { icon: '📅', title: 'Schedule', description: 'View your class timetable and schedule', path: '/student/academics', requiresVerification: true },
  { icon: '📝', title: 'Homework', description: 'View your homework assignments', path: '/student/academics', requiresVerification: true },
  { icon: '📊', title: 'My Progress', description: 'Track your academic performance and grades', path: '/student/academics', requiresVerification: true },
  { icon: '📖', title: 'Resources', description: 'Access past papers, textbooks and study materials', path: '/student/resources', requiresVerification: false },
  { icon: '🤖', title: 'AI Tutor', description: 'Get 24/7 help from your personal AI tutor', path: '/student/ai-tutor', requiresVerification: false },
  { icon: '💬', title: 'Messages', description: 'Communicate with teachers and classmates', path: '/student/messages', requiresVerification: true },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/student/contact-admin', requiresVerification: false },
]

const panel = { ...glassCard, padding: '1.25rem' }
const panelTitle = { color: C.turquoise, fontSize: '1.05rem', marginBottom: '0.75rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }

function Chip({ children, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color, border: `1px solid ${color}`, background: 'rgba(0,0,0,0.15)' }}>
      {children}
    </span>
  )
}

function StudentSummary() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useStudentOverview()
  const [editing, setEditing] = useState(false)

  if (loading) return <p style={{ ...muted, marginTop: '1rem' }}>Loading your overview...</p>

  if (error) {
    return (
      <div style={{ ...panel, marginTop: '1rem', borderColor: 'rgba(255,80,80,0.4)' }}>
        <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
        <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
      </div>
    )
  }

  const { profile, org, isVerified, classInfo, homework, graded, average, events, needsSetup } = data
  const todo = sortByDue(homework.filter(h => h.status === 'Not submitted' || h.status === 'Overdue')).slice(0, 3)
  const recent = [...graded].reverse().slice(0, 3)

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      {/* Who and where */}
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{org?.name || 'No school linked'}</div>
          <div style={{ ...muted, marginTop: '0.25rem' }}>
            {profile.grade ? `Grade ${profile.grade}` : 'Grade not set'}
            {classInfo ? ` · ${classInfo.name}` : ''}
            {classInfo?.teacherName ? ` · ${classInfo.teacherName}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip color={isVerified ? '#7CFC9A' : '#ffe08a'}>{isVerified ? 'Verified' : 'Awaiting verification'}</Chip>
          {!needsSetup && (
            <button onClick={() => setEditing(e => !e)}
              style={{ background: 'none', border: 'none', color: C.turquoise, textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}>
              {editing ? 'Close' : 'Edit profile'}
            </button>
          )}
        </div>
      </div>

      {/* Complete / edit profile */}
      {(needsSetup || editing) && (
        <div style={panel}>
          <h3 style={panelTitle}>{needsSetup ? 'Complete your profile' : 'Edit your profile'}</h3>
          {needsSetup && (
            <p style={{ ...muted, marginBottom: '1rem' }}>
              Tell us your grade, subjects and class so your homework and the AI Tutor fit you.
            </p>
          )}
          <StudentProfileForm
            initial={profile}
            onSaved={() => { setEditing(false); reload() }}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        </div>
      )}

      {/* Numbers + lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div style={panel}>
          <h3 style={panelTitle}>Overall average</h3>
          {average === null
            ? <p style={muted}>No grades yet.</p>
            : <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>}
          {graded.length > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>from {graded.length} graded assignment{graded.length === 1 ? '' : 's'}</p>}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>Homework to do</h3>
          {todo.length === 0 ? (
            <p style={muted}>{classInfo ? "You're all caught up." : 'Choose a class to see homework.'}</p>
          ) : todo.map(h => (
            <div key={h.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600 }}>{h.title}</div>
              <div style={{ ...muted, fontSize: '0.8rem' }}>
                <span style={{ color: statusColor(h.status) }}>{dueIn(h.dueDate) || h.status}</span>
                {h.dueDate ? ` · ${fmtDate(h.dueDate)}` : ''}
              </div>
            </div>
          ))}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>Recent grades</h3>
          {recent.length === 0 ? <p style={muted}>Nothing graded yet.</p> : recent.map(g => (
            <div key={g.assignmentId} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
              <span>{g.title}</span>
              <strong style={{ color: gradeColor(g.grade) }}>{g.grade}%</strong>
            </div>
          ))}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>Coming up at school</h3>
          {events.length === 0 ? <p style={muted}>No upcoming events.</p> : events.slice(0, 3).map(ev => (
            <div key={ev.id} style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontWeight: 600 }}>{ev.title}</div>
              <div style={{ ...muted, fontSize: '0.8rem' }}>{fmtDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button onClick={() => navigate('/student/academics')}
          style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>
          Open my academics
        </button>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <DashboardShell role="student" cards={cards}>
      <ParentLinks />
      <NextTutorSession />
      <StudentSummary />
    </DashboardShell>
  )
}
