import React from 'react'
import { useApiData } from '../../hooks/useApiData'
import { glassCard, C } from '../../styles/glass'

const ROLE_NAMES = { student: 'Students', teacher: 'Teachers', parent: 'Parents', principal: 'Principals', tutor: 'Tutors', schoolmember: 'School members', admin: 'Admins' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }

// Admin overview extras: role breakdown and signups per day for the last 30 days
export default function PlatformStats() {
  const { data, error } = useApiData('/api/admin/platform-stats')
  if (error) return <p style={{ ...muted, marginTop: '1.5rem' }}>Platform statistics could not be loaded.</p>
  if (!data) return <p style={{ ...muted, marginTop: '1.5rem' }}>Loading statistics...</p>

  const { totals, byRole, signups, signupsTotal } = data
  const max = Math.max(1, ...signups.map(s => s.count))
  const first = signups[0]?.date
  const last = signups[signups.length - 1]?.date
  const short = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        {[
          ['Active organisations', `${totals.activeOrganizations} of ${totals.organizations}`],
          ['Suspended users', totals.suspended],
          ['Joined in the last 30 days', signupsTotal],
        ].map(([label, value]) => (
          <div key={label} className="glass" style={{ ...glassCard, padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: C.turquoise }}>{value}</div>
            <div style={muted}>{label}</div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ ...glassCard, padding: '1.25rem 1.5rem' }}>
        <h3 style={{ color: C.turquoise, marginBottom: '1rem', fontSize: '1.05rem' }}>Sign-ups per day</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }} role="img" aria-label={`Sign-ups per day for the last 30 days, ${signupsTotal} in total`}>
          {signups.map(s => (
            <div key={s.date} title={`${short(s.date)}: ${s.count}`}
              style={{ flex: 1, minWidth: 0, height: `${Math.max(s.count ? 6 : 2, (s.count / max) * 100)}%`, borderRadius: '3px 3px 0 0',
                background: s.count ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', ...muted, fontSize: '0.75rem' }}>
          <span>{first ? short(first) : ''}</span><span>Busiest day: {max > 1 || signups.some(s => s.count) ? max : 0}</span><span>{last ? short(last) : ''}</span>
        </div>
      </div>

      <div className="glass" style={{ ...glassCard, padding: '1.25rem 1.5rem' }}>
        <h3 style={{ color: C.turquoise, marginBottom: '0.75rem', fontSize: '1.05rem' }}>Users by role</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
          {Object.entries(ROLE_NAMES).map(([key, name]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span style={muted}>{name}</span><strong>{byRole[key] ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
