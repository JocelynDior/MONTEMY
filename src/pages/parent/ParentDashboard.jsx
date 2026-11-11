import React from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import AddChildPanel from '../../components/parent/AddChildPanel'
import ChildSwitcher from '../../components/parent/ChildSwitcher'
import { Chip, ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useParentChildren } from '../../hooks/useParentChildren'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { dueIn, fmtDate, gradeLevelKey, sortByDue, statusColor, statusLabel } from '../../components/student/studentUtils'
import { gradeLabel } from '../../config/studentOptions'
import { glassBtn } from '../../styles/glass'

function ChildSnapshot({ childId }) {
  const t = useT()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData(childId ? `/api/parent/children/${childId}/overview` : null)

  if (loading) return <p style={muted}>{t('parent.loadingChild')}</p>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const { child, profile, org, classInfo, homework, graded, average, events } = data
  const todo = sortByDue(homework.filter(h => h.status === 'Not submitted' || h.status === 'Overdue')).slice(0, 3)
  const recent = [...graded].reverse().slice(0, 3)
  const levelKey = average === null ? null : gradeLevelKey(average)

  return (
    <>
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, overflowWrap: 'anywhere' }}>{child.name}</div>
          <div style={{ ...muted, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
            {org?.name || t('parent.noSchool')}
            {profile.grade ? ` · ${gradeLabel(profile.grade, t)}` : ''}
            {classInfo ? ` · ${classInfo.name}` : ''}
            {classInfo?.teacherName ? ` · ${classInfo.teacherName}` : ''}
          </div>
        </div>
        <Chip>{t('parent.viewOnly')}</Chip>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: 'var(--sp-4)' }}>
        <div style={panel}>
          <h3 style={panelTitle}>{t('parent.overallAverage')}</h3>
          {average === null ? <p style={muted}>{t('student.noGradesYet')}</p> : (
            <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{average}%{levelKey && <span style={{ ...muted, marginInlineStart: '0.5rem' }}>{t(levelKey)}</span>}</div>
          )}
          {graded.length > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>{t('student.fromGraded', { n: graded.length })}</p>}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>{t('parent.homeworkToDo')}</h3>
          {todo.length === 0 ? <p style={muted}>{t(classInfo ? 'parent.nothingOutstanding' : 'parent.childNoClass')}</p> : todo.map(h => (
            <div key={h.id} style={{ marginBottom: '0.75rem', minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{h.title}</div>
              <div style={{ ...muted, fontSize: 'var(--fs-xs)' }}>
                <span style={{ color: statusColor(h.status), fontWeight: 700 }}>{dueIn(h.dueDate, t) || statusLabel(h.status, t)}</span>
                {h.dueDate ? ` · ${fmtDate(h.dueDate)}` : ''}
              </div>
            </div>
          ))}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>{t('student.recentGrades')}</h3>
          {recent.length === 0 ? <p style={muted}>{t('student.nothingGraded')}</p> : recent.map(g => (
            <div key={g.assignmentId} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.6rem' }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{g.title}</span>
              <strong>{g.grade}%</strong>
            </div>
          ))}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>{t('student.comingUp')}</h3>
          {events.length === 0 ? <p style={muted}>{t('student.noEvents')}</p> : events.slice(0, 3).map(ev => (
            <div key={ev.id} style={{ marginBottom: '0.6rem', minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{ev.title}</div>
              <div style={{ ...muted, fontSize: 'var(--fs-xs)' }}>{fmtDate(ev.date)}{ev.location ? ` · ${ev.location}` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button onClick={() => navigate('/parent/progress')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>{t('parent.openReport')}</button>
      </div>
    </>
  )
}

// Under the circles: the child switcher, a snapshot of the selected child, and the Add Child panel
function ParentSummary() {
  const t = useT()
  const { data, children, requests, selectedId, select, loading, error, reload } = useParentChildren()

  if (loading) return <p style={{ ...muted, marginTop: 'var(--sp-4)' }}>{t('student.loadingOverview')}</p>
  if (error) return <div style={{ marginTop: 'var(--sp-4)' }}><ErrorBox message={error} onRetry={reload} /></div>

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)', minWidth: 0 }}>
      {children.length === 0 ? (
        <div style={panel}>
          <h3 style={panelTitle}>{t('parent.noChildTitle')}</h3>
          <p style={muted}>{t('parent.noChildHelp')}</p>
        </div>
      ) : (
        <>
          <ChildSwitcher items={children} selectedId={selectedId} onSelect={select} />
          <ChildSnapshot key={selectedId} childId={selectedId} />
        </>
      )}
      <AddChildPanel requests={requests} isVerified={!!data?.isVerified} onChanged={reload} startOpen={children.length === 0} />
    </div>
  )
}

export default function ParentDashboard() {
  return (
    <DashboardShell role="parent">
      <ParentSummary />
    </DashboardShell>
  )
}
