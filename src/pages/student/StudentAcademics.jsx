import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import StudentProfileForm from '../../components/student/StudentProfileForm'
import { useStudentOverview } from '../../hooks/useStudentOverview'
import { dueIn, fmtDate, gradeColor, sortByDue, statusColor } from '../../components/student/studentUtils'
import { LineChart } from '../../components/charts/charts'
import TimetableBoard from '../../components/timetable/TimetableBoard'
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
      <div style={{ marginBottom: '1.5rem' }}><TimetableBoard /></div>
      <h3 style={{ color: C.turquoise, fontSize: '1.05rem', marginBottom: '0.75rem' }}>Coming up</h3>
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
  const navigate = useNavigate()
  if (!data.classInfo) return <Empty>Choose your class on the Subjects tab to see your homework.</Empty>
  if (data.homework.length === 0) return <Empty>No homework set for {data.classInfo.name} yet.</Empty>

  const list = sortByDue(data.homework)
  const needsWork = (s) => s === 'Not submitted' || s === 'Overdue' || s === 'Reopened'
  return list.map(h => (
    <div key={h.id} role="link" tabIndex={0} aria-label={`Open ${h.title}`} style={{ ...panel, cursor: 'pointer' }}
      onClick={() => navigate(`/student/assignments/${h.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/student/assignments/${h.id}`) } }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{h.title}</div>
          <div style={{ ...muted, fontSize: '0.8rem' }}>
            {h.dueDate ? `${fmtDate(h.dueDate)}${needsWork(h.status) ? ` · ${dueIn(h.dueDate)}` : ''}` : 'No due date'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: statusColor(h.status), fontWeight: 700 }}>{h.status}</span>
          {h.status === 'Graded' && h.isLate && <div style={{ ...muted, fontSize: '0.75rem' }}>handed in late</div>}
          {h.grade !== null && <div style={{ color: gradeColor(h.grade), fontWeight: 700 }}>{h.grade}%</div>}
        </div>
      </div>
      <div style={{ ...muted, fontSize: '0.8rem', marginTop: '0.5rem' }}>
        {h.status === 'Not submitted' || h.status === 'Overdue' ? 'Open to read the instructions and hand in' : h.status === 'Reopened' ? 'Open to revise and hand in again' : 'Open to see your work and feedback'}
      </div>
    </div>
  ))
}

function ProgressTab({ data }) {
  const { graded, average } = data
  if (graded.length === 0) return <Empty>Your grades will appear here once your teachers have marked your work.</Empty>

  // One chart per subject, oldest grade on the left
  const bySubject = {}
  for (const g of graded) (bySubject[g.subject || 'General'] ||= []).push(g)
  const subjects = Object.keys(bySubject).sort((a, b) => (a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b)))
  const mean = (list) => Math.round((list.reduce((t, g) => t + g.grade, 0) / list.length) * 10) / 10
  const short = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <>
      <div style={panel}>
        <div style={muted}>Overall average</div>
        <div style={{ fontSize: '2.4rem', fontWeight: 700, color: gradeColor(average) }}>{average}%</div>
      </div>

      {subjects.map(sub => {
        const list = bySubject[sub]
        return (
          <div key={sub} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h3 style={{ color: C.turquoise, fontSize: '1.05rem' }}>{sub}</h3>
              <span style={muted}>Average <strong style={{ color: gradeColor(mean(list)) }}>{mean(list)}%</strong> · {list.length} graded</span>
            </div>
            <LineChart
              ariaLabel={`${sub} grades over time, average ${mean(list)} percent`}
              points={list.map(g => ({ label: short(g.date), value: g.grade, title: `${g.title}: ${g.grade}%` }))}
            />
          </div>
        )
      })}

      {[...graded].reverse().map(g => (
        <div key={g.assignmentId} style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <span style={{ fontWeight: 600 }}>{g.title}<span style={{ ...muted, fontSize: '0.8rem' }}> · {g.subject || 'General'}</span></span>
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
