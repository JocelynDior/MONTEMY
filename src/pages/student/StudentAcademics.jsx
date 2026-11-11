import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import StudentProfileForm from '../../components/student/StudentProfileForm'
import { ErrorBox, ghostBtn, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import { useStudentOverview } from '../../hooks/useStudentOverview'
import { useT } from '../../i18n'
import { dueIn, fmtDate, gradeBarFill, gradeLevelKey, sortByDue, statusColor, statusLabel } from '../../components/student/studentUtils'
import { gradeLabel, subjectLabel } from '../../config/studentOptions'
import { LineChart } from '../../components/charts/charts'
import SkeletonList from '../../components/shared/Skeleton'

const TAB_KEYS = ['subjects', 'homework', 'progress']
const card = { ...panel, marginBottom: 'var(--sp-4)' }

function Empty({ children }) {
  return <div style={{ ...card, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{children}</div>
}

function Level({ grade, t }) {
  const key = gradeLevelKey(grade)
  return key ? <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{t(key)}</span> : null
}

function SubjectsTab({ data, reload, editing, setEditing }) {
  const t = useT()
  const { profile, classInfo } = data

  if (editing || !profile.grade || profile.subjects.length === 0) {
    return (
      <div style={card}>
        <h3 style={panelTitle}>{t(editing ? 'student.editYourProfile' : 'student.setUpProfile')}</h3>
        <StudentProfileForm initial={profile}
          onSaved={() => { setEditing(false); reload() }}
          onCancel={editing ? () => setEditing(false) : undefined} />
      </div>
    )
  }

  return (
    <>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{gradeLabel(profile.grade, t)}</div>
          <div style={{ ...muted, marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
            {classInfo
              ? `${classInfo.name}${classInfo.teacherName ? ` · ${t('student.teacherN', { name: classInfo.teacherName })}` : ''}`
              : t('student.noClassSelected')}
          </div>
        </div>
        <button onClick={() => setEditing(true)} style={ghostBtn}>{t(classInfo ? 'student.changeClassOrSubjects' : 'student.chooseYourClass')}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 12rem), 1fr))', gap: 'var(--sp-3)' }}>
        {profile.subjects.map(s => (
          <div key={s} style={{ ...panel, padding: 'var(--sp-3) var(--sp-4)', borderInlineStart: '4px solid var(--fg)', overflowWrap: 'anywhere' }}>
            <div style={{ fontWeight: 600 }}>{subjectLabel(s, t)}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function HomeworkTab({ data }) {
  const t = useT()
  const navigate = useNavigate()
  if (!data.classInfo) return <Empty>{t('student.chooseClassForHomework')}</Empty>
  if (data.homework.length === 0) return <Empty>{t('student.noHomeworkFor', { class: data.classInfo.name })}</Empty>

  const needsWork = (s) => s === 'Not submitted' || s === 'Overdue' || s === 'Reopened'
  return sortByDue(data.homework).map(h => {
    const open = () => navigate(`/student/assignments/${h.id}`)
    return (
      <div key={h.id} role="link" tabIndex={0} aria-label={t('student.openItem', { title: h.title })} style={{ ...card, cursor: 'pointer' }}
        onClick={open}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{h.title}</div>
            <div style={{ ...muted, fontSize: 'var(--fs-xs)' }}>
              {h.dueDate ? `${fmtDate(h.dueDate)}${needsWork(h.status) ? ` · ${dueIn(h.dueDate, t)}` : ''}` : t('student.noDueDate')}
            </div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <span style={{ color: statusColor(h.status), fontWeight: 700 }}>{statusLabel(h.status, t)}</span>
            {h.status === 'Graded' && h.isLate && <div style={{ ...muted, fontSize: 'var(--fs-xs)' }}>{t('student.handedInLate')}</div>}
            {h.grade !== null && <div style={{ fontWeight: 700 }}>{h.grade}%<Level grade={h.grade} t={t} /></div>}
          </div>
        </div>
        <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.5rem' }}>
          {t(h.status === 'Not submitted' || h.status === 'Overdue' ? 'student.openToHandIn' : h.status === 'Reopened' ? 'student.openToRevise' : 'student.openToSee')}
        </div>
      </div>
    )
  })
}

function ProgressTab({ data }) {
  const t = useT()
  const { graded, average } = data
  if (graded.length === 0) return <Empty>{t('student.gradesWillAppear')}</Empty>

  // One chart per subject, oldest grade on the left
  const bySubject = {}
  for (const g of graded) (bySubject[g.subject || 'General'] ||= []).push(g)
  const subjects = Object.keys(bySubject).sort((a, b) => (a === 'General' ? 1 : b === 'General' ? -1 : a.localeCompare(b)))
  const mean = (list) => Math.round((list.reduce((s, g) => s + g.grade, 0) / list.length) * 10) / 10
  const name = (s) => (s === 'General' ? t('student.general') : subjectLabel(s, t))

  return (
    <>
      <div style={card}>
        <div style={muted}>{t('student.overallAverage')}</div>
        <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700 }}>{average}%<Level grade={average} t={t} /></div>
        <div role="presentation" style={{ height: '0.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', overflow: 'hidden', marginTop: '0.5rem' }}>
          <div style={{ width: `${Math.max(0, Math.min(100, average))}%`, height: '100%', background: gradeBarFill(average) }} />
        </div>
      </div>

      {subjects.map(sub => {
        const list = bySubject[sub]
        return (
          <div key={sub} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h3 style={{ ...panelTitle, marginBottom: 0 }}>{name(sub)}</h3>
              <span style={muted}>{t('student.averageGraded', { avg: mean(list), n: list.length })}</span>
            </div>
            <LineChart
              ariaLabel={t('student.chartLabel', { subject: name(sub), avg: mean(list) })}
              points={list.map(g => ({ label: fmtDate(g.date, false).split(',')[0], value: g.grade, title: `${g.title}: ${g.grade}%` }))}
            />
          </div>
        )
      })}

      <h3 style={{ ...panelTitle, marginTop: 'var(--sp-4)' }}>{t('student.allGrades')}</h3>
      {[...graded].reverse().map(g => (
        <div key={g.assignmentId} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{g.title}<span style={{ ...muted, fontSize: 'var(--fs-xs)' }}> · {name(g.subject || 'General')}</span></span>
            <strong>{g.grade}%<Level grade={g.grade} t={t} /></strong>
          </div>
          {g.feedback && <div style={{ ...muted, marginTop: '0.4rem', overflowWrap: 'anywhere' }}>{g.feedback}</div>}
        </div>
      ))}
    </>
  )
}

// One page, three views chosen by the address: /student/academics?tab=subjects | homework | progress
export default function StudentAcademics() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = React.useState(false)
  const tab = TAB_KEYS.includes(params.get('tab')) ? params.get('tab') : 'subjects'
  const { data, loading, error, reload } = useStudentOverview()

  const tabs = [
    { key: 'subjects', label: t('shell.f_subjects') },
    { key: 'homework', label: t('shell.f_homework') },
    { key: 'progress', label: t('shell.f_progress') },
  ]
  const title = tabs.find(x => x.key === tab).label

  return (
    <StudentPage title={title} icon={tab === 'progress' ? 'users' : 'terms'}>
      <SegmentedTabs tabs={tabs} value={tab} onChange={(k) => setParams({ tab: k }, { replace: true })} />

      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <>
          {tab === 'subjects' && <SubjectsTab data={data} reload={reload} editing={editing} setEditing={setEditing} />}
          {tab === 'homework' && <HomeworkTab data={data} />}
          {tab === 'progress' && <ProgressTab data={data} />}
        </>
      )}
    </StudentPage>
  )
}
