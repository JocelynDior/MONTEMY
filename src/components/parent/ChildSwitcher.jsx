import React from 'react'
import { useT } from '../../i18n'
import StudentPage from '../student/StudentPage'
import AddChildPanel from './AddChildPanel'
import { ErrorBox, muted, panel } from './parentUi'
import { useParentChildren } from '../../hooks/useParentChildren'
import SkeletonList from '../shared/Skeleton'

// Pill buttons to switch between linked children. Renders nothing for a single child.
// On a narrow screen the pills stay on one row and scroll sideways inside their own strip, so the page never does.
export default function ChildSwitcher({ items: kids, selectedId, onSelect }) {
  const t = useT()
  if (kids.length < 2) return null
  return (
    <div role="group" aria-label={t('parent.switchChild')}
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', minWidth: 0, paddingBottom: '0.35rem', WebkitOverflowScrolling: 'touch' }}>
      {kids.map(c => {
        const active = c.id === selectedId
        return (
          <button key={c.id} onClick={() => onSelect(c.id)} aria-pressed={active}
            style={{
              cursor: 'pointer', padding: '0.5rem 1.1rem', minHeight: '2.5rem', borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-sm)',
              flex: '0 0 auto', whiteSpace: 'nowrap', fontWeight: active ? 700 : 400,
              color: active ? 'var(--on-fg)' : 'var(--fg)',
              border: active ? '1px solid var(--fg)' : '1px solid var(--border-strong)',
              background: active ? 'var(--fg)' : 'transparent',
            }}>
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

// The frame for the four parent pages (Child Progress, Homework, Timetable, Exams): loads the linked children,
// shows the switcher, and asks the parent to link a child first when there is none.
// children is a function: ({ childId, child }) => the page body for the selected child. Remount per child via key.
export function ChildPage({ title, icon, children: render }) {
  const t = useT()
  const { data, children, requests, selectedId, select, loading, error, reload } = useParentChildren()
  const child = children.find(c => c.id === selectedId) || null

  return (
    <StudentPage title={title} icon={icon} backPath="/parent/dashboard" maxWidth={1100}>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && (
        children.length === 0 ? (
          <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.noChildLinked')}</div>
            <AddChildPanel requests={requests} isVerified={!!data?.isVerified} onChanged={reload} startOpen />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--sp-4)', minWidth: 0 }}>
            <ChildSwitcher items={children} selectedId={selectedId} onSelect={select} />
            {children.length === 1 && <div style={{ ...muted }}>{t('parent.viewingChild', { name: child?.name || '' })}</div>}
            <div key={selectedId} style={{ minWidth: 0 }}>{render({ childId: selectedId, child })}</div>
          </div>
        )
      )}
    </StudentPage>
  )
}
