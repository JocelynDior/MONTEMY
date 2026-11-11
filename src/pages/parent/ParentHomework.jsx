import React, { useMemo, useState } from 'react'
import { ChildPage } from '../../components/parent/ChildSwitcher'
import { Chip, ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import SkeletonList from '../../components/shared/Skeleton'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { dueIn, fmtDate, gradeLevelKey, sortByDue, statusColor, statusLabel } from '../../components/student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'

const OPEN = new Set(['Not submitted', 'Overdue', 'Reopened'])

function List({ childId }) {
  const t = useT()
  const [filter, setFilter] = useState('todo')
  const { data, loading, error, reload } = useApiData(`/api/parent/children/${childId}/homework`)

  const list = useMemo(() => {
    const all = sortByDue(data?.homework || [])
    if (filter === 'todo') return all.filter(h => OPEN.has(h.status))
    if (filter === 'done') return all.filter(h => !OPEN.has(h.status))
    return all
  }, [data, filter])

  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return null
  if (!data.classInfo) return <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.childNoClass')}</div>

  const tabs = [
    { key: 'todo', label: t('parent.filterTodo') },
    { key: 'done', label: t('parent.filterDone') },
    { key: 'all', label: t('parent.filterAll') },
  ]

  return (
    <div style={{ minWidth: 0 }}>
      <SegmentedTabs tabs={tabs} value={filter} onChange={setFilter} />
      {list.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>
          {t(data.homework.length === 0 ? 'parent.noHomeworkSet' : filter === 'todo' ? 'parent.nothingOutstanding' : 'parent.nothingHere')}
        </div>
      )}
      <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
        {list.map(h => (
          <div key={h.id} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700, minWidth: 0, overflowWrap: 'anywhere' }}>{h.title}</span>
              <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {h.isLate && h.status === 'Graded' && <Chip color="var(--fg-muted)">{t('student.handedInLate')}</Chip>}
                <Chip color={statusColor(h.status)}>{statusLabel(h.status, t)}</Chip>
              </span>
            </div>
            <div style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.3rem', overflowWrap: 'anywhere' }}>
              {subjectLabel(h.subject, t)} · {h.dueDate ? t('student.dueOn', { date: fmtDate(h.dueDate) }) : t('student.noDueDate')}
              {OPEN.has(h.status) && h.dueDate ? ` · ${dueIn(h.dueDate, t)}` : ''}
            </div>
            {h.description && <p style={{ ...muted, marginTop: '0.5rem', overflowWrap: 'anywhere' }}>{h.description}</p>}
            {h.grade !== null && (
              <div style={{ marginTop: '0.6rem' }}>
                <strong>{h.grade}%</strong>{gradeLevelKey(h.grade) && <span style={{ ...muted, marginInlineStart: '0.4rem' }}>{t(gradeLevelKey(h.grade))}</span>}
                {h.feedback && <div style={{ ...muted, marginTop: '0.3rem', overflowWrap: 'anywhere' }}>{t('student.teacherFeedback')}: {h.feedback}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ParentHomework() {
  const t = useT()
  return (
    <ChildPage title={t('shell.f_homework')} icon="terms">
      {({ childId }) => <List childId={childId} />}
    </ChildPage>
  )
}
