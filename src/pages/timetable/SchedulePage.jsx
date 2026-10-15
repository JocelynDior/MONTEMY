import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import TimetableBoard from '../../components/timetable/TimetableBoard'
import PeriodsEditor from '../../components/timetable/PeriodsEditor'
import TermsManager from '../../components/timetable/TermsManager'
import { useApiData } from '../../hooks/useApiData'

const TABS = ['Timetable', 'Periods', 'Terms and holidays']

// One schedule page for every role that has a timetable. Principals also get the school settings tabs.
export default function SchedulePage({ backPath }) {
  const [tab, setTab] = useState('Timetable')
  const [version, setVersion] = useState(0)          // bumped after the periods change so the grid reloads
  const { data: meta, reload } = useApiData('/api/timetable/meta')
  const isPrincipal = meta?.role === 'principal'

  return (
    <StudentPage title="Timetable" icon="📅" backPath={backPath} maxWidth={1200}>
      {isPrincipal && (
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
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
      )}

      {(!isPrincipal || tab === 'Timetable') && <TimetableBoard key={version} />}
      {isPrincipal && tab === 'Periods' && meta && (
        <PeriodsEditor key={version} meta={meta} onSaved={() => { reload(); setVersion(v => v + 1) }} />
      )}
      {isPrincipal && tab === 'Terms and holidays' && <TermsManager canManage={meta.canManageSchool} />}
    </StudentPage>
  )
}
