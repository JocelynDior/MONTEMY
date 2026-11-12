import React from 'react'
import DashboardShell from '../../components/shell/DashboardShell'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { muted, panel } from '../../components/parent/parentUi'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox } from '../../components/parent/parentUi'
import { fmtDate, dueIn } from '../../components/student/studentUtils'

function TeacherSummary() {
  const t = useT('teacher')
  const { data, loading, error, reload } = useApiData('/api/teacher/overview')

  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null

  const { totals, classes, upcoming } = data

  return (
    <div style={{ padding: 'var(--sp-4) var(--page-gutter) 0' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-4)' }}>
        {[
          { label: t('teacher.statClasses'), value: totals?.classes ?? 0 },
          { label: t('teacher.statStudents'), value: totals?.students ?? 0 },
          { label: t('teacher.statToGrade'), value: totals?.toGrade ?? 0 },
        ].map((s) => (
          <div key={s.label} style={{ ...panel, flex: '1 1 100px', textAlign: 'center', padding: 'var(--sp-3)' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700 }}>{s.value}</div>
            <div style={{ ...muted, fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-1)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Classes list */}
      {classes?.length > 0 && (
        <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t('teacher.myClasses')}</div>
          {classes.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--fs-sm)' }}>
              <span>{c.name}</span>
              <span style={muted}>{t('teacher.studentCount', { n: c.studentCount ?? 0 })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming due dates */}
      {upcoming?.length > 0 && (
        <div style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--sp-2)' }}>{t('teacher.upcomingDue')}</div>
          {upcoming.map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--fs-sm)' }}>
              <div style={{ minWidth: 0, overflowWrap: 'break-word', flex: 1, marginInlineEnd: 'var(--sp-2)' }}>
                <span style={{ fontWeight: 500 }}>{u.title}</span>
                <span style={{ ...muted, marginInlineStart: 'var(--sp-1)' }}>{u.className}</span>
              </div>
              <span style={muted}>{dueIn(u.dueDate, t)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <>
      <DashboardShell role="teacher" />
      <TeacherSummary />
    </>
  )
}
