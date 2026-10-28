import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { OrgAvatar, OrgForm, OrgLogoControl } from '../../components/admin/OrgForm'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'
import SkeletonList from '../../components/shared/Skeleton'

const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const ROLES = [
  ['student', 'Students'], ['teacher', 'Teachers'], ['parent', 'Parents'], ['principal', 'Principals'],
  ['tutor', 'Tutors'], ['schoolmember', 'School members'],
]
const roleLabel = (r) => (ROLES.find(([k]) => k === r) || [r, r])[1].replace(/s$/, '')

function Stat({ value, text }) {
  return (
    <div style={{ ...panel, padding: '0.9rem 1rem' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</div>
      <div style={{ ...muted, fontSize: '0.8rem' }}>{text}</div>
    </div>
  )
}

export default function AdminOrgDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData(`/api/admin/orgs/${id}`)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')

  const members = data?.members || []
  const shownMembers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return members.filter(m =>
      (!roleFilter || m.role === roleFilter) &&
      (!term || m.name.toLowerCase().includes(term) || (m.email || '').toLowerCase().includes(term)))
  }, [members, roleFilter, search])

  const changed = (msg) => { setEditing(false); setNotice(msg); setActionError(''); reload() }

  const toggleActive = async () => {
    const o = data.org
    if (o.isActive && !window.confirm(`Deactivate ${o.name}? It will disappear from the sign-up list and no one new can join. Current members keep their access.`)) return
    setBusy(true); setActionError(''); setNotice('')
    try {
      await apiFetch(`/api/admin/orgs/${o.id}`, { method: 'PATCH', body: { isActive: !o.isActive } })
      setNotice(o.isActive ? `${o.name} deactivated.` : `${o.name} activated.`)
      reload()
    } catch (err) { setActionError(err.message) }
    setBusy(false)
  }

  const verifyAll = async () => {
    if (!window.confirm(`Verify all ${data.pending} waiting ${data.pending === 1 ? 'user' : 'users'} in ${data.org.name}?`)) return
    setBusy(true); setActionError(''); setNotice('')
    try {
      const res = await apiFetch(`/api/admin/orgs/${id}/verify-all`, { method: 'POST' })
      setNotice(`${res.count} ${res.count === 1 ? 'user' : 'users'} verified.`)
      reload()
    } catch (err) { setActionError(err.message) }
    setBusy(false)
  }

  const org = data?.org

  return (
    <StudentPage title={org ? org.name : 'Organisation'} icon={org?.type === 'tutor' ? '📖' : '🏫'} backPath="/admin/dashboard" maxWidth={1000}>
      <div style={{ marginBottom: '1.25rem' }}>
        <button onClick={() => navigate('/admin/organisations')} style={ghostBtn}>Back to organisations</button>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}
      {notice && <p role="status" style={{ color: '#7CFC9A', fontSize: '0.9rem', marginBottom: '1rem' }}>{notice}</p>}
      {actionError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

      {data && (editing
        ? <OrgForm org={org} onCancel={() => setEditing(false)} onDone={changed} />
        : (
          <div style={{ ...panel, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                <OrgAvatar name={org.name} logoUrl={org.logoUrl} size={56} />
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Chip color="#8fd3ff">{org.type === 'school' ? 'School' : 'Tutor organisation'}</Chip>
                    <Chip color={org.isActive ? '#7CFC9A' : '#ff8f8f'}>{org.isActive ? 'Active' : 'Inactive'}</Chip>
                  </div>
                  <div style={{ ...muted, marginTop: '0.4rem' }}>
                    {[org.address, org.country].filter(Boolean).join(', ') || 'No address'}
                  </div>
                  {org.contactEmail && <div style={{ ...muted, fontSize: '0.85rem' }}>{org.contactEmail}</div>}
                  {org.type === 'tutor' && org.specialisation && <div style={{ ...muted, fontSize: '0.85rem' }}>Specialises in {org.specialisation}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => { setEditing(true); setNotice('') }} style={ghostBtn}>Edit</button>
                <button disabled={busy} onClick={toggleActive} style={org.isActive ? dangerBtn : smallBtn}>
                  {org.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <OrgLogoControl org={org} onChanged={changed} />
            </div>
          </div>
        ))}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Stat value={org.memberCount ?? 0} text="Members" />
            {ROLES.filter(([r]) => data.byRole[r] > 0).map(([r, text]) => <Stat key={r} value={data.byRole[r]} text={text} />)}
            {org.type === 'school' && <Stat value={data.classes.length} text="Classes" />}
            {data.schoolStats && <Stat value={data.schoolStats.average === null ? '—' : `${data.schoolStats.average}%`} text="Average grade" />}
            {data.schoolStats && <Stat value={data.schoolStats.atRiskTotal} text="Students at risk" />}
            {data.tutorStats && <Stat value={data.tutorStats.sessions} text="Tutoring sessions" />}
          </div>

          {data.pending > 0 && (
            <div style={{ ...panel, marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span>{data.pending} {data.pending === 1 ? 'user is' : 'users are'} waiting for verification.</span>
              <button disabled={busy} onClick={verifyAll} style={smallBtn}>Verify all</button>
            </div>
          )}

          {org.type === 'school' && (
            <div style={{ ...panel, marginBottom: '1.25rem' }}>
              <h3 style={panelTitle}>Classes</h3>
              {data.classes.length === 0
                ? <p style={muted}>No classes yet. Teachers add the classes they teach, and students are placed in them.</p>
                : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.6)' }}>
                          <th style={{ padding: '0.4rem 0.5rem' }}>Class</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>Students</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>Assignments</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>Average</th>
                          <th style={{ padding: '0.4rem 0.5rem' }}>At risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.classes.map(c => (
                          <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <td style={{ padding: '0.5rem' }}>{c.name}</td>
                            <td style={{ padding: '0.5rem' }}>{c.students}</td>
                            <td style={{ padding: '0.5rem' }}>{c.assignments}</td>
                            <td style={{ padding: '0.5rem' }}>{c.average === null ? '—' : `${c.average}%`}</td>
                            <td style={{ padding: '0.5rem' }}>{c.atRisk}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          <div style={panel}>
            <h3 style={panelTitle}>Members</h3>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
              <input aria-label="Search members" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email"
                style={{ ...glassInput, flex: '1 1 200px', width: 'auto', padding: '0.6rem 0.9rem', fontSize: '0.9rem' }} />
              <select aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                style={{ ...glassInput, width: 'auto', minWidth: '150px', padding: '0.6rem 0.9rem', fontSize: '0.9rem' }}>
                <option value="" style={{ color: '#000' }}>All roles</option>
                {ROLES.map(([r, text]) => <option key={r} value={r} style={{ color: '#000' }}>{text}</option>)}
              </select>
            </div>
            {members.length === 0
              ? <p style={muted}>No one has joined yet. Members appear here after they sign up and choose this organisation.</p>
              : shownMembers.length === 0
                ? <p style={muted}>No members match that search.</p>
                : shownMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ ...muted, fontSize: '0.8rem' }}>{m.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Chip color="#8fd3ff">{roleLabel(m.role)}</Chip>
                      {!m.isVerified && <Chip color="#ffd166">Pending</Chip>}
                      {m.isSuspended && <Chip color="#ff8f8f">Suspended</Chip>}
                    </div>
                  </div>
                ))}
            {data.membersTruncated && <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.6rem' }}>Showing the first 500 members. Use Users in the admin panel to find the rest.</p>}
          </div>
        </>
      )}
    </StudentPage>
  )
}
