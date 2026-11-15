import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import StudentPage from '../../components/student/StudentPage'
import TimetableBoard from '../../components/timetable/TimetableBoard'
import PeriodsEditor from '../../components/timetable/PeriodsEditor'
import TermsManager from '../../components/timetable/TermsManager'
import { useApiData } from '../../hooks/useApiData'

const TAB_KEYS = ['timetable', 'periods', 'terms']

// One schedule page for every role that has a timetable. Principals also get the school settings tabs.
export default function SchedulePage({ backPath }) {
  const t = useT()
  const [tab, setTab] = useState('timetable')
  const [version, setVersion] = useState(0)          // bumped after the periods change so the grid reloads
  const { data: meta, reload } = useApiData('/api/timetable/meta')
  const isPrincipal = meta?.role === 'principal'

  return (
    <StudentPage title={t('shared.timetable.title')} icon="calendar" backPath={backPath} maxWidth={1200}>
      {isPrincipal && (
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {TAB_KEYS.map(k => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'var(--fg)', fontSize: '0.9rem',
                fontWeight: tab === k ? 700 : 400,
                border: tab === k ? '1px solid var(--color-primary)' : '1px solid rgba(128,128,128,0.3)',
                background: tab === k ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(128,128,128,0.08)',
              }}>
              {t(`shared.timetable.tab_${k}`)}
            </button>
          ))}
        </div>
      )}

      {(!isPrincipal || tab === 'timetable') && <TimetableBoard key={version} />}
      {isPrincipal && tab === 'periods' && meta && (
        <PeriodsEditor key={version} meta={meta} onSaved={() => { reload(); setVersion(v => v + 1) }} />
      )}
      {isPrincipal && tab === 'terms' && <TermsManager canManage={meta.canManageSchool} />}
    </StudentPage>
  )
}
