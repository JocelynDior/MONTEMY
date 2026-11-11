import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardShell from '../../components/layout/DashboardShell'
import StudentProfileForm from '../../components/student/StudentProfileForm'
import NextTutorSession from '../../components/student/NextTutorSession'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useStudentOverview } from '../../hooks/useStudentOverview'
import { useT } from '../../i18n'
import { dueIn, fmtDate, gradeLevelKey, sortByDue, statusColor, statusLabel } from '../../components/student/studentUtils'
import { gradeLabel } from '../../config/studentOptions'
import { glassBtn } from '../../styles/glass'

// The circles come from config/roleFeatures.js (DashboardShell reads the role). This page only adds the live summary.
function StudentSummary() {
  const t = useT()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useStudentOverview()
  const [editing, setEditing] = useState(false)

  if (loading) return <p style={{ ...muted, marginTop: 'var(--sp-4)' }}>{t('student.loadingOverview')}</p>
  if (error) return <div style={{ marginTop: 'var(--sp-4)' }}><ErrorBox message={error} onRetry={reload} /></div>

  const { profile, org, isVerified, classInfo, homework, graded, average, events, needsSetup } = data
  const todo = sortByDue(homework.filter(h => h.status === 'Not submitted' || h.status === 'Overdue')).slice(0, 3)
  const recent = [...graded].reverse().slice(0, 3)
  const levelKey = average === null ? null : gradeLevelKey(average)

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)', minWidth: 0 }}>
      <div style={{ ...panel, display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, overflowWrap: 'anywhere' }}>{org?.name || t('student.noSchool')}</div>
          <div style={{ ...muted, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
            {profile.grade ? gradeLabel(profile.grade, t) : t('student.gradeNotSet')}
            {classInfo ? ` · ${classInfo.name}` : ''}
            {classInfo?.teacherName ? ` · ${classInfo.teacherName}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip color={isVerified ? 'var(--fg)' : 'var(--fg-muted)'}>{t(isVerified ? 'student.verified' : 'student.awaitingVerification')}</Chip>
          {!needsSetup && <button onClick={() => setEditing(e => !e)} aria-expanded={editing} style={ghostBtn}>{editing ? t('common.close') : t('student.editProfile')}</button>}
        </div>
      </div>

      {(needsSetup || editing) && (
        <div style={panel}>
          <h3 style={panelTitle}>{t(needsSetup ? 'student.completeProfile' : 'student.editYourProfile')}</h3>
          {needsSetup && <p style={{ ...muted, marginBottom: '1rem' }}>{t('student.completeProfileHelp')}</p>}
          <StudentProfileForm initial={profile} onSaved={() => { setEditing(false); reload() }} onCancel={editing ? () => setEditing(false) : undefined} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: 'var(--sp-4)' }}>
        <div style={panel}>
          <h3 style={panelTitle}>{t('student.overallAverage')}</h3>
          {average === null ? <p style={muted}>{t('student.noGradesYet')}</p> : (
            <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{average}%{levelKey && <span style={{ ...muted, marginInlineStart: '0.5rem' }}>{t(levelKey)}</span>}</div>
          )}
          {graded.length > 0 && <p style={{ ...muted, marginTop: '0.25rem' }}>{t('student.fromGraded', { n: graded.length })}</p>}
        </div>

        <div style={panel}>
          <h3 style={panelTitle}>{t('student.homeworkToDo')}</h3>
          {todo.length === 0 ? <p style={muted}>{t(classInfo ? 'student.allCaughtUp' : 'student.chooseClassHomework')}</p> : todo.map(h => (
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
        <button onClick={() => navigate('/student/academics')} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem' }}>{t('student.openAcademics')}</button>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  return (
    <DashboardShell role="student">
      <NextTutorSession />
      <StudentSummary />
    </DashboardShell>
  )
}
