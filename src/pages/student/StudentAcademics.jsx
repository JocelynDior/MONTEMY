import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import StudentProfileForm from '../../components/student/StudentProfileForm'
import { useStudentOverview } from '../../hooks/useStudentOverview'
import { dueIn, fmtDate, gradeColor, sortByDue, statusColor } from '../../components/student/studentUtils'
import { glassCard, glassBtn, C } from '../../styles/glass'

const TABS = ['Subjects', 'Schedule', 'Homework', 'Progress']
const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }

function Empty({ children }) {
  return <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{children}</div>
}

function SubjectsTab({ data, reload }) {
  const [editing, setEditing] = useState(false)
  const { profile, classInfo } = data

  if (editing || !profile.grade || profile.subjects.length === 0) {
    return (
      <div style={panel}>
        <h3 style={{ color: C.turquoise, marginBottom: '1rem' }}>{editing ? 'Edit your profile' : 'Set up your profile'}</h3>
        <StudentProfileForm initial={profile}
          onSaved={() => { setEditing(false); reload() }}
          onCancel={editing ? () => setEditing(false) : undefined} />
      </div>
    )
  }

  return (
    <>
      <div style={{ ...panel, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Grade {profile.grade}</div>
          <div style={{ ...muted, marginTop: '0.25rem' }}>
            {classInfo
              ? `${classInfo.name}${classInfo.subject ? ` · ${classInfo.subject}` : ''}${classInfo.teacherName ? ` · Teacher: ${classInfo.teacherName}` : ''}`
              : 'No class selected'}
          </div>
        </div>
        <button onClick={() => setEditing(true)} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>
          {classInfo ? 'Change class or subjects' : 'Choose your class'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {profile.subjects.map(s => (
          <div key={s} style={{ ...glassCard, padding: '1rem 1.25rem', borderLeft: `4px solid ${C.turquoise}` }}>
            <div style={{ fontWeight: 600 }}>{s}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function ScheduleTab({ data }) {
  const dated = [
    ...data.homework.filter(h => h.dueDate && (h.status === 'Not submitted' || h.status === 'Overdue') && new Date(h.dueDate) > new Date())
      .map(h => ({ key: `h${h.id}`, date: h.dueDate, title: h.title, kind: 'Homework due' })),
    ...data.events.map(e => ({ key: `e${e.id}`, date: e.date, title: e.title, kind: e.type || 'Event', extra: e.location })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <>
      <div style={{ ...panel, ...muted }}>
        Your weekly class timetable will show here once your school publishes it. Until then, here is what's coming up.
      </div>
      {dated.length === 0 ? <Empty>Nothing coming up yet.</Empty> : dated.map(item => (
        <div key={item.key} style={{ ...panel, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{item.title}</div>
            <div style={{ ...muted, fontSize: '0.8rem' }}>{item.kind}{item.extra ? ` · ${item.extra}` : ''}</div>
          </div>
          <div style={{ ...muted, textAlign: 'right' }}>{fmtDate(item.date)}</div>
        </div>
      ))}
    </>
  )
}

function HomeworkTab({ data }) {
  const [open, setOpen] = useState(null)
  if (!data.classInfo) return <Empty>Choose your class on the Subjects tab to see your homework.</Empty>
  if (data.homework.length === 0) return <Empty>No homework set for {data.classInfo.name} yet.</Empty>

  const list = sortByDue(data.homework)
  return list.map(h => (
    <div key={h.id} style={{ ...panel, cursor: 'pointer' }} onClick={() => setOpen(open === h.id ? null : h.id)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{h.title}</div>
          <div style={{ ...muted, fontSize: '0.8rem' }}>
            {h.dueDate ? `${fmtDate(h.dueDate)}${h.status === 'Not submitted' || h.status === 'Overdue' ? ` · ${dueIn(h.dueDate)}` : ''}` : 'No due date'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: statusColor(h.status), fontWeight: 700 }}>{h.status}</span>
          {h.grade !== null && <div style={{ color: gradeColor(h.grade), fontWeight: 700 }}>{h.grade}%</div>}
        </div>
      </div>
      {open === h.id && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
          {h.description || 'No description.'}
          {h.feedback && <div style={{ marginTop: '0.75rem', color: C.turquoise }}>Teacher feedback: <span style={{ color: 'white' }}>{h.feedback}</span></div>}
        </div>
      )}
    </div>
  ))
}

function ProgressTab({ data }) {
  const { graded, average } = data
  if (graded.length === 0) return <Empty>Your grades will appear here once your teachers have marked your work.</Empty>
  const shown = graded.slice(-12)

  return (
    <>
      <div style={panel}>
        <div style={muted}>Overall average</div>
        <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>
      </div>

      <div style={panel}>
        <h3 style={{ color: C.turquoise, marginBottom: '1rem', fontSize: '1.05rem' }}>Grades over time</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '180px', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {shown.map(g => (
            <div key={g.assignmentId} title={`${g.title}: ${g.grade}%`} style={{ flex: '0 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{g.grade}</div>
              <div style={{ width: '100%', height: `${Math.max(2, Math.min(100, g.grade)) * 1.3}px`, background: gradeColor(g.grade), borderRadius: '6px 6px 0 0', opacity: 0.85 }} />
            </div>
          ))}
        </div>
        <div style={{ ...muted, fontSize: '0.75rem', marginTop: '0.5rem' }}>Oldest on the left. Showing your last {shown.length}.</div>
      </div>

      {[...graded].reverse().map(g => (
        <div key={g.assignmentId} style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontWeight: 600 }}>{g.title}</span>
            <strong style={{ color: gradeColor(g.grade) }}>{g.grade}%</strong>
          </div>
          {g.feedback && <div style={{ ...muted, marginTop: '0.4rem' }}>{g.feedback}</div>}
        </div>
      ))}
    </>
  )
}

export default function StudentAcademics() {
  const [tab, setTab] = useState('Subjects')
  const { data, loading, error, reload } = useStudentOverview()

  return (
    <StudentPage title="My Academics" icon="📚">
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

      {loading && <p style={muted}>Loading...</p>}

      {error && (
        <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      )}

      {data && (
        <>
          {tab === 'Subjects' && <SubjectsTab data={data} reload={reload} />}
          {tab === 'Schedule' && <ScheduleTab data={data} />}
          {tab === 'Homework' && <HomeworkTab data={data} />}
          {tab === 'Progress' && <ProgressTab data={data} />}
        </>
      )}
    </StudentPage>
  )
}
