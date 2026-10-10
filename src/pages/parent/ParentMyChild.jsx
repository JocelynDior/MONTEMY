import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import AddChildPanel from '../../components/parent/AddChildPanel'
import ChildSwitcher from '../../components/parent/ChildSwitcher'
import ChildTutoring from '../../components/parent/ChildTutoring'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useParentChildren } from '../../hooks/useParentChildren'
import { useApiData } from '../../hooks/useApiData'
import { dueIn, fmtDate, gradeColor, sortByDue, statusColor } from '../../components/student/studentUtils'

const TABS = ['Overview', 'Homework', 'Grades', 'Tutoring']

function Empty({ children }) {
  return <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{children}</div>
}

function OverviewTab({ data }) {
  const { profile, org, classInfo, average, graded, events } = data
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={panel}>
        <h3 style={panelTitle}>{data.child.name}</h3>
        <div style={muted}>
          {org?.name || 'No school linked'}
          {profile.grade ? ` · Grade ${profile.grade}` : ''}
          {classInfo ? ` · ${classInfo.name}` : ''}
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <span style={muted}>{classInfo?.teacherName ? 'Class teacher(s): ' : 'No class teacher assigned yet.'}</span>
          {classInfo?.teacherName && <strong>{classInfo.teacherName}</strong>}
        </div>
        {profile.subjects.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
            {profile.subjects.map(s => <Chip key={s} color="#8fd3ff">{s}</Chip>)}
          </div>
        )}
      </div>

      <div style={panel}>
        <h3 style={panelTitle}>Overall average</h3>
        {average === null
          ? <p style={muted}>No grades yet.</p>
          : <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>}
        {graded.length > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>from {graded.length} graded assignment{graded.length === 1 ? '' : 's'}</p>}
      </div>

      <div style={panel}>
        <h3 style={panelTitle}>Coming up at school</h3>
        {events.length === 0 ? <p style={muted}>No upcoming events.</p> : events.map(ev => (
          <div key={ev.id} style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontWeight: 600 }}>{ev.title}</div>
            <div style={{ ...muted, fontSize: '0.8rem' }}>{fmtDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HomeworkTab({ data }) {
  const list = sortByDue(data.homework)
  if (list.length === 0) return <Empty>No homework has been set for this class yet.</Empty>
  return (
    <>
      {list.map(h => (
        <div key={h.id} style={{ ...panel, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{h.title}</span>
            <Chip color={statusColor(h.status)}>{h.status}</Chip>
          </div>
          <div style={{ ...muted, fontSize: '0.8rem', marginTop: '0.3rem' }}>
            {h.status === 'Not submitted' || h.status === 'Overdue' ? `${dueIn(h.dueDate) || ''}${h.dueDate ? ' · ' : ''}` : ''}
            {h.dueDate ? `Due ${fmtDate(h.dueDate)}` : 'No due date'}
          </div>
          {h.description && <p style={{ ...muted, marginTop: '0.5rem' }}>{h.description}</p>}
          {h.grade !== null && (
            <div style={{ marginTop: '0.6rem' }}>
              <strong style={{ color: gradeColor(h.grade) }}>{h.grade}%</strong>
              {h.feedback && <div style={{ ...muted, marginTop: '0.3rem' }}>Teacher feedback: {h.feedback}</div>}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function GradesTab({ data }) {
  const list = [...data.graded].reverse()
  if (list.length === 0) return <Empty>No grades yet. They will appear here once the teacher has marked work.</Empty>
  return (
    <>
      {data.average !== null && (
        <div style={{ ...panel, marginBottom: '1rem' }}>
          <span style={muted}>Overall average </span>
          <strong style={{ color: gradeColor(data.average), fontSize: '1.4rem' }}>{data.average}%</strong>
        </div>
      )}
      {list.map(g => (
        <div key={g.assignmentId} style={{ ...panel, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontWeight: 600 }}>{g.title}</span>
            <strong style={{ color: gradeColor(g.grade) }}>{g.grade}%</strong>
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.12)', marginTop: '0.6rem' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, g.grade))}%`, height: '100%', borderRadius: '999px', background: gradeColor(g.grade) }} />
          </div>
          <div style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>{fmtDate(g.date, false)}</div>
          {g.feedback && <div style={{ ...muted, marginTop: '0.4rem' }}>Teacher feedback: {g.feedback}</div>}
        </div>
      ))}
    </>
  )
}

function ChildReport({ childId }) {
  const [tab, setTab] = useState('Overview')
  const { data, loading, error, reload } = useApiData(childId ? `/api/parent/children/${childId}/overview` : null)

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem',
              fontWeight: tab === t ? 700 : 400,
              border: tab === t ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
              background: tab === t ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Tutoring' && <ChildTutoring childId={childId} />}
      {tab !== 'Tutoring' && loading && <p style={muted}>Loading...</p>}
      {tab !== 'Tutoring' && error && <ErrorBox message={error} onRetry={reload} />}
      {tab !== 'Tutoring' && data && (
        <>
          {tab === 'Overview' && <OverviewTab data={data} />}
          {tab === 'Homework' && <HomeworkTab data={data} />}
          {tab === 'Grades' && <GradesTab data={data} />}
        </>
      )}
    </>
  )
}

export default function ParentMyChild() {
  const { data, children, requests, selectedId, select, loading, error, reload } = useParentChildren()

  return (
    <StudentPage title="My Child" icon="👶" backPath="/parent/dashboard">
      {loading && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && (
        children.length === 0 ? (
          <>
            <Empty>No child is linked to your account yet. Send a request below to get started.</Empty>
            <div style={{ marginTop: '1rem' }}>
              <AddChildPanel requests={requests} isVerified={!!data?.isVerified} onChanged={reload} startOpen />
            </div>
          </>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <ChildSwitcher items={children} selectedId={selectedId} onSelect={select} />
            <ChildReport key={selectedId} childId={selectedId} />
          </div>
        )
      )}
    </StudentPage>
  )
}
