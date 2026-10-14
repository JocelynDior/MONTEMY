import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { OrgAvatar, OrgForm } from '../../components/admin/OrgForm'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'

const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const opt = { color: '#000' }

export default function AdminOrgs() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/admin/orgs')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const orgs = data?.orgs || []
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase()
    return orgs.filter(o =>
      (!term || o.name.toLowerCase().includes(term) || (o.country || '').toLowerCase().includes(term)) &&
      (!typeFilter || o.type === typeFilter) &&
      (!statusFilter || (statusFilter === 'active') === o.isActive))
  }, [orgs, search, typeFilter, statusFilter])

  const done = (msg) => { setCreating(false); setEditingId(null); setNotice(msg); setActionError(''); reload() }

  const toggleActive = async (o) => {
    const turningOff = o.isActive
    const ok = !turningOff || window.confirm(
      `Deactivate ${o.name}? It will disappear from the sign-up list and no one new can join. Current members keep their access.`)
    if (!ok) return
    setBusyId(o.id); setActionError(''); setNotice('')
    try {
      await apiFetch(`/api/admin/orgs/${o.id}`, { method: 'PATCH', body: { isActive: !o.isActive } })
      setNotice(turningOff ? `${o.name} deactivated.` : `${o.name} activated.`)
      reload()
    } catch (err) { setActionError(err.message) }
    setBusyId(null)
  }

  return (
    <StudentPage title="Organisations" icon="🏫" backPath="/admin/dashboard" maxWidth={1000}>
      {!creating && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button onClick={() => { setCreating(true); setEditingId(null); setNotice('') }} style={smallBtn}>+ New organisation</button>
        </div>
      )}
      {creating && <OrgForm onCancel={() => setCreating(false)} onDone={done} />}
      {notice && <p role="status" style={{ color: '#7CFC9A', fontSize: '0.9rem', marginBottom: '1rem' }}>{notice}</p>}
      {actionError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

      {data && orgs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) 1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <input aria-label="Search organisations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or country" style={{ ...glassInput, padding: '0.6rem 0.9rem', fontSize: '0.9rem' }} />
          <select aria-label="Filter by type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...glassInput, padding: '0.6rem 0.9rem', fontSize: '0.9rem' }}>
            <option value="" style={opt}>All types</option>
            <option value="school" style={opt}>Schools</option>
            <option value="tutor" style={opt}>Tutor organisations</option>
          </select>
          <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...glassInput, padding: '0.6rem 0.9rem', fontSize: '0.9rem' }}>
            <option value="" style={opt}>Any status</option>
            <option value="active" style={opt}>Active</option>
            <option value="inactive" style={opt}>Inactive</option>
          </select>
        </div>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}

      {data && (orgs.length === 0
        ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No organisations yet. Create the first one to let people sign up.</div>
        : shown.length === 0
          ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No organisations match those filters.</div>
          : shown.map(o => editingId === o.id
            ? <OrgForm key={o.id} org={o} onCancel={() => setEditingId(null)} onDone={done} />
            : (
              <div key={o.id} style={{ ...panel, marginBottom: '1rem', opacity: o.isActive ? 1 : 0.75 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', minWidth: 0 }}>
                    <OrgAvatar name={o.name} logoUrl={o.logoUrl} />
                    <div style={{ minWidth: 0 }}>
                      <button onClick={() => navigate(`/admin/organisations/${o.id}`)}
                        style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '1rem', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        {o.name}
                      </button>
                      <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {[o.address, o.country].filter(Boolean).join(', ') || 'No address'}
                        {o.contactEmail ? ` · ${o.contactEmail}` : ''}
                      </div>
                      {o.type === 'tutor' && o.specialisation && <div style={{ ...muted, fontSize: '0.85rem' }}>Specialises in {o.specialisation}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip color="#8fd3ff">{o.type === 'school' ? 'School' : 'Tutor organisation'}</Chip>
                    <Chip color={o.isActive ? '#7CFC9A' : '#ff8f8f'}>{o.isActive ? 'Active' : 'Inactive'}</Chip>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <div style={{ ...muted, fontSize: '0.8rem' }}>
                    {o.memberCount === null ? '' : `${o.memberCount} member${o.memberCount === 1 ? '' : 's'} · `}created {new Date(o.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/admin/organisations/${o.id}`)} style={ghostBtn}>Details</button>
                    <button onClick={() => { setEditingId(o.id); setCreating(false); setNotice('') }} style={ghostBtn}>Edit</button>
                    <button disabled={busyId === o.id} onClick={() => toggleActive(o)} style={o.isActive ? dangerBtn : smallBtn}>
                      {busyId === o.id ? 'Saving...' : o.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )))}
    </StudentPage>
  )
}
