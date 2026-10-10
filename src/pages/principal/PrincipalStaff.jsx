import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'

const TABS = ['Teachers', 'Other staff']

export default function PrincipalStaff() {
  const [tab, setTab] = useState('Teachers')
  const { data, loading, error, reload } = useApiData('/api/principal/staff')

  return (
    <StudentPage title="Staff" icon="👥" backPath="/principal/dashboard">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              cursor: 'pointer', padding: '0.5rem 1.1rem', borderRadius: '999px', color: 'white', fontSize: '0.9rem',
              fontWeight: tab === t ? 700 : 400,
              border: tab === t ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
              background: tab === t ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
            }}>
            {t}{data ? ` (${t === 'Teachers' ? data.teachers.length : data.members.length})` : ''}
          </button>
        ))}
      </div>

      {loading && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && tab === 'Teachers' && (
        data.teachers.length === 0
          ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No teachers at your school yet.</div>
          : data.teachers.map(t => (
            <div key={t.id} style={{ ...panel, marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={muted}>{t.email}</div>
                </div>
                <Chip color={t.isVerified ? '#7CFC9A' : '#ffe08a'}>{t.isVerified ? 'Verified' : 'Awaiting verification'}</Chip>
              </div>
              <div style={{ ...muted, marginTop: '0.6rem' }}>
                {t.classCount === 0
                  ? 'No classes added yet.'
                  : `${t.classCount} class${t.classCount === 1 ? '' : 'es'} · ${t.studentCount} student${t.studentCount === 1 ? '' : 's'}`}
              </div>
              {t.classes.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                  {t.classes.map(c => <Chip key={c} color="#8fd3ff">{c}</Chip>)}
                </div>
              )}
            </div>
          ))
      )}

      {data && tab === 'Other staff' && (
        data.members.length === 0
          ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No other staff accounts at your school yet.</div>
          : data.members.map(m => (
            <div key={m.id} style={{ ...panel, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={muted}>{m.email}{m.department ? ` · ${m.department}` : ''}</div>
              </div>
              <Chip color={m.isVerified ? '#7CFC9A' : '#ffe08a'}>{m.isVerified ? 'Verified' : 'Awaiting verification'}</Chip>
            </div>
          ))
      )}
    </StudentPage>
  )
}
