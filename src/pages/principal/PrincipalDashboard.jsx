import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate, gradeColor } from '../../components/student/studentUtils'
import { glassBtn } from '../../styles/glass'

const cards = [
  { icon: '💬', title: 'Messages', description: 'Communicate with teachers, parents and staff', path: '/messages', requiresVerification: true },
  { icon: '📅', title: 'School Events', description: 'Manage and view upcoming school events', path: '/principal/events', requiresVerification: true },
  { icon: '📊', title: 'School Statistics', description: 'View school performance and analytics', path: '/principal/stats', requiresVerification: true },
  { icon: '👥', title: 'Staff Management', description: 'Oversee staff and faculty', path: '/principal/staff', requiresVerification: true },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/principal/contact-admin', requiresVerification: false },
]

function Stat({ label, value }) {
  return (
    <div style={{ ...panel, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={muted}>{label}</div>
    </div>
  )
}

function SchoolSummary() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/principal/overview')

  if (loading) return <p style={{ ...muted, marginTop: '1rem' }}>Loading your school overview...</p>
  if (error) return <div style={{ marginTop: '1rem' }}><ErrorBox message={error} onRetry={reload} /></div>

  const { org, isVerified, counts, average, gradedCount, atRiskCount, riskThreshold, events } = data

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{org?.name || 'No school linked'}</div>
        <Chip color={isVerified ? '#7CFC9A' : '#ffe08a'}>{isVerified ? 'Verified' : 'Awaiting verification'}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.25rem' }}>
        <Stat label="Students" value={counts.students} />
        <Stat label="Teachers" value={counts.teachers} />
        <Stat label="Parents" value={counts.parents} />
        <Stat label="Classes" value={counts.classes} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div style={panel}>
          <h3 style={panelTitle}>School average</h3>
          {average === null
            ? <p style={muted}>No grades yet.</p>
            : <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>}
          {gradedCount > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>from {gradedCount} graded submission{gradedCount === 1 ? '' : 's'}</p>}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>Students at risk</h3>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: atRiskCount ? '#ff8f8f' : '#7CFC9A' }}>{atRiskCount}</div>
          <p style={{ ...muted, marginTop: '0.25rem' }}>averaging below {riskThreshold}%</p>
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

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/principal/stats')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>Open school statistics</button>
        <button onClick={() => navigate('/principal/events')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>Manage events</button>
      </div>
    </div>
  )
}

export default function PrincipalDashboard() {
  return (
    <DashboardShell role="principal" cards={cards}>
      <SchoolSummary />
    </DashboardShell>
  )
}
