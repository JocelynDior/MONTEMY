import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import StudentPage from '../../components/student/StudentPage'
import { panel, panelTitle, muted, Chip, ErrorBox } from '../../components/parent/parentUi'
import { glassInput, glassBtn } from '../../styles/glass'
import { useApiData } from '../../hooks/useApiData'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/shared/Icon'

// Phase 7 edit: tokens only (no hard-coded hex), translated via t(),
// staff role shown in counts, no emoji (Icon component used), G6 schoolmember → staff.

export default function PrincipalStaff() {
  const { t } = useTranslation(['principal', 'common'])
  const [search, setSearch] = useState('')
  const { data, loading, error, reload } = useApiData('/api/principal/staff')

  const filtered = (data?.staff ?? []).filter(m => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      m.name?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    )
  })

  return (
    <StudentPage title={t('circle.staff')} icon="Users" backPath="/principal/dashboard">

      {/* Role count chips */}
      {data?.roleCounts && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
          {Object.entries(data.roleCounts).map(([role, count]) => (
            <Chip key={role}>
              {t(`roles.${role}`, { defaultValue: role })} · {count}
            </Chip>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <input
          type="search"
          placeholder={t('common:search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...glassInput, width: '100%' }}
        />
      </div>

      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        filtered.length === 0
          ? <p style={muted}>{t('staff.noResults', { defaultValue: 'No staff found.' })}</p>
          : (
            <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
              {filtered.map(member => (
                <div key={member.id} style={{
                  ...panel,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--sp-3)',
                  flexWrap: 'wrap',
                }}>
                  {/* Avatar placeholder */}
                  <div style={{
                    width: '2.75rem', height: '2.75rem', flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--muted)',
                  }}>
                    {(member.name ?? '?')[0].toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--fs-base)' }}>{member.name}</div>
                    <div style={{ ...muted, fontSize: 'var(--fs-sm)' }}>
                      {t(`roles.${member.role}`, { defaultValue: member.role })}
                      {member.email && ` · ${member.email}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
                    <Chip>{member.status ?? 'active'}</Chip>
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </StudentPage>
  )
}
