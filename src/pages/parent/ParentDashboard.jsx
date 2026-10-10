import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import AddChildPanel from '../../components/parent/AddChildPanel'
import ChildSwitcher from '../../components/parent/ChildSwitcher'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useParentChildren } from '../../hooks/useParentChildren'
import { useApiData } from '../../hooks/useApiData'
import { dueIn, fmtDate, gradeColor, sortByDue, statusColor } from '../../components/student/studentUtils'
import { glassBtn } from '../../styles/glass'

const cards = [
  { icon: '👶', title: 'My Child', description: "View your child's academic progress and activities", path: '/parent/mychild', requiresVerification: true },
  { icon: '💬', title: 'Messages', description: 'Communicate with teachers and school staff', path: '/messages', requiresVerification: true },
  { icon: '📅', title: 'Events', description: 'View upcoming school events and activities', path: '/parent/events', requiresVerification: false },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/parent/contact-admin', requiresVerification: false },
]

function ChildSnapshot({ childId }) {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData(childId ? `/api/parent/children/${childId}/overview` : null)

  if (loading) return <p style={muted}>Loading your child's progress...</p>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const { child, profile, org, classInfo, homework, graded, average, events } = data
  const todo = sortByDue(homework.filter(h => h.status === 'Not submitted' || h.status === 'Overdue')).slice(0, 3)
  const recent = [...graded].reverse().slice(0, 3)

  return (
    <>
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{child.name}</div>
          <div style={{ ...muted, marginTop: '0.25rem' }}>
            {org?.name || 'No school linked'}
            {profile.grade ? ` · Grade ${profile.grade}` : ''}
            {classInfo ? ` · ${classInfo.name}` : ''}
            {classInfo?.teacherName ? ` · ${classInfo.teacherName}` : ''}
          </div>
        </div>
        <Chip color="#8fd3ff">View only</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div style={panel}>
          <h3 style={panelTitle}>Overall average</h3>
          {average === null
            ? <p style={muted}>No grades yet.</p>
            : <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>}
          {graded.length > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>from {graded.length} graded assignment{graded.length === 1 ? '' : 's'}</p>}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>Homework still to do</h3>
          {todo.length === 0 ? (
            <p style={muted}>{classInfo ? 'Nothing outstanding.' : 'No class selected yet.'}</p>
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
        <button onClick={() => navigate('/parent/mychild')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>
          Open full report
        </button>
      </div>
    </>
  )
}

function ParentSummary() {
  const { data, children, requests, selectedId, select, loading, error, reload } = useParentChildren()

  if (loading) return <p style={{ ...muted, marginTop: '1rem' }}>Loading your overview...</p>
  if (error) return <div style={{ marginTop: '1rem' }}><ErrorBox message={error} onRetry={reload} /></div>

  const isVerified = !!data?.isVerified

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      {children.length === 0 ? (
        <div style={panel}>
          <h3 style={panelTitle}>No child linked yet</h3>
          <p style={muted}>
            Search for your child below and send a request. Once your child (or a school admin) accepts it,
            their homework and grades will appear here.
          </p>
        </div>
      ) : (
        <>
          <ChildSwitcher items={children} selectedId={selectedId} onSelect={select} />
          <ChildSnapshot childId={selectedId} />
        </>
      )}

      <AddChildPanel requests={requests} isVerified={isVerified} onChanged={reload} startOpen={children.length === 0} />
    </div>
  )
}

export default function ParentDashboard() {
  return (
    <DashboardShell role="parent" cards={cards}>
      <ParentSummary />
    </DashboardShell>
  )
}
