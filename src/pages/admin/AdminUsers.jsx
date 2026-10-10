import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useAuth } from '../../context/AuthContext'
import { glassInput } from '../../styles/glass'

const ROLES = [
  ['student', 'Students'], ['teacher', 'Teachers'], ['parent', 'Parents'], ['principal', 'Principals'],
  ['tutor', 'Tutors'], ['schoolmember', 'School members'], ['admin', 'Admins'],
]
// Older links used plural names, e.g. /admin/users?type=students
const LEGACY_ROLE = { students: 'student', teachers: 'teacher', parents: 'parent', principals: 'principal', tutors: 'tutor', staff: 'schoolmember' }
const roleLabel = (r) => (ROLES.find(([k]) => k === r) || [r, r])[1].replace(/s$/, '')
const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const selectStyle = { ...glassInput, width: 'auto', minWidth: '150px' }

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [params] = useSearchParams()
  const legacy = params.get('type')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(ROLES.some(([k]) => k === legacy) ? legacy : (LEGACY_ROLE[legacy] || ''))
  const [orgId, setOrgId] = useState(params.get('school') || '')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)       // { id, kind: 'delete' }
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  // Search 500ms after typing stops; any filter change goes back to page 1
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1) }, 500)
    return () => clearTimeout(t)
  }, [searchInput])

  const filterQuery = () => {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (role) q.set('role', role)
    if (orgId) q.set('orgId', orgId)
    if (status === 'verified') q.set('verified', 'true')
    if (status === 'pending') q.set('verified', 'false')
    if (status === 'suspended') q.set('suspended', 'true')
    return q
  }
  const listQuery = filterQuery()
  listQuery.set('page', String(page))

  const orgsReq = useApiData('/api/admin/orgs')
  const { data, loading, error, reload } = useApiData(`/api/admin/users?${listQuery.toString()}`)
  const orgs = orgsReq.data?.orgs || []

  const changeFilter = (setter) => (e) => { setter(e.target.value); setPage(1); setConfirmBulk(false) }

  const run = async (id, fn, okMessage) => {
    setBusyId(id); setActionError(''); setNotice('')
    try {
      await fn()
      if (okMessage) setNotice(okMessage)
      setConfirm(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const act = (u, action, msg) => run(u.id, () =>
    apiFetch(`/api/admin/users/${u.id}/action`, { method: 'POST', body: { action } }), msg)
  const remove = (u) => run(u.id, () => apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' }), `${u.name || u.email} was deleted.`)

  const verifyAll = async () => {
    setBusyId('bulk'); setActionError(''); setNotice('')
    try {
      const r = await apiFetch(`/api/admin/orgs/${orgId}/verify-all`, { method: 'POST' })
      setNotice(r.count === 0 ? 'Nobody was waiting in that organisation.' : `${r.count} user${r.count === 1 ? '' : 's'} verified.`)
      setConfirmBulk(false)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const exportCsv = async () => {
    setBusyId('export'); setActionError(''); setNotice('')
    try {
      const r = await apiFetch(`/api/admin/users/export?${filterQuery().toString()}`)
      const blob = new Blob(['\uFEFF' + r.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `montemy-users-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setNotice(`Exported ${r.count} user${r.count === 1 ? '' : 's'}${r.truncated ? ' (the first 10,000 only: narrow the filters for the rest)' : ''}.`)
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const users = data?.users || []

  return (
    <StudentPage title="Users" icon="👥" backPath="/admin/dashboard" maxWidth={1100}>
      <div style={{ ...panel, marginBottom: '1.25rem', display: 'grid', gap: '0.9rem' }}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} style={glassInput}
          placeholder="Search by name, or type an email address" aria-label="Search users" />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={role} onChange={changeFilter(setRole)} style={selectStyle} aria-label="Filter by role">
            <option value="" style={{ color: '#000' }}>All roles</option>
            {ROLES.map(([k, l]) => <option key={k} value={k} style={{ color: '#000' }}>{l}</option>)}
          </select>
          <select value={orgId} onChange={changeFilter(setOrgId)} style={selectStyle} aria-label="Filter by organisation">
            <option value="" style={{ color: '#000' }}>All organisations</option>
            {orgs.map(o => <option key={o.id} value={o.id} style={{ color: '#000' }}>{o.name}</option>)}
          </select>
          <select value={status} onChange={changeFilter(setStatus)} style={selectStyle} aria-label="Filter by status">
            <option value="" style={{ color: '#000' }}>Any status</option>
            <option value="verified" style={{ color: '#000' }}>Verified</option>
            <option value="pending" style={{ color: '#000' }}>Waiting for approval</option>
            <option value="suspended" style={{ color: '#000' }}>Suspended</option>
          </select>
          <button onClick={exportCsv} disabled={busyId === 'export'} style={{ ...ghostBtn, marginLeft: 'auto' }}>
            {busyId === 'export' ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {orgId && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {confirmBulk ? (
              <>
                <span style={{ fontSize: '0.88rem', color: '#ffe08a' }}>Verify everyone still waiting in this organisation?</span>
                <button disabled={busyId === 'bulk'} onClick={verifyAll} style={smallBtn}>{busyId === 'bulk' ? 'Verifying...' : 'Yes, verify all'}</button>
                <button onClick={() => setConfirmBulk(false)} style={ghostBtn}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmBulk(true)} style={ghostBtn}>Verify all pending in this organisation</button>
            )}
          </div>
        )}
      </div>

      {notice && <p style={{ color: '#7CFC9A', fontSize: '0.9rem', marginBottom: '1rem' }}>{notice}</p>}
      {actionError && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}

      {data && (
        <>
          <p style={{ ...muted, marginBottom: '0.9rem' }}>{data.total} user{data.total === 1 ? '' : 's'}{loading ? ' (updating...)' : ''}</p>

          {users.length === 0 ? (
            <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No users match these filters.</div>
          ) : users.map(u => {
            const isMe = u.id === me?.id
            const protectedAccount = isMe || u.role === 'admin'
            return (
              <div key={u.id} style={{ ...panel, marginBottom: '0.9rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ fontWeight: 700 }}>{u.name || '(no name)'}{isMe ? <span style={muted}> (you)</span> : null}</div>
                  <div style={muted}>{u.email}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.45rem' }}>
                    <Chip color="#8fd3ff">{roleLabel(u.role)}</Chip>
                    <Chip color={u.isVerified ? '#7CFC9A' : '#ffe08a'}>{u.isVerified ? 'Verified' : 'Waiting'}</Chip>
                    {u.isSuspended && <Chip color="#ff8f8f">Suspended</Chip>}
                    <span style={{ ...muted, fontSize: '0.78rem' }}>
                      {u.orgName || 'No organisation'} · joined {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {!protectedAccount && (
                  confirm?.id === u.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Delete permanently, with all their data?</span>
                      <button disabled={busyId === u.id} onClick={() => remove(u)} style={dangerBtn}>{busyId === u.id ? '...' : 'Yes, delete'}</button>
                      <button onClick={() => setConfirm(null)} style={ghostBtn}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {!u.isVerified && <button disabled={busyId === u.id} onClick={() => act(u, 'verify', `${u.name || u.email} was verified.`)} style={smallBtn}>Verify</button>}
                      {u.isSuspended
                        ? <button disabled={busyId === u.id} onClick={() => act(u, 'unsuspend', `${u.name || u.email} can sign in again.`)} style={ghostBtn}>Unsuspend</button>
                        : <button disabled={busyId === u.id} onClick={() => act(u, 'suspend', `${u.name || u.email} was suspended.`)} style={ghostBtn}>Suspend</button>}
                      <button onClick={() => setConfirm({ id: u.id })} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
                    </div>
                  )
                )}
              </div>
            )
          })}

          {data.pages > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', marginTop: '1.25rem' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={ghostBtn}>← Previous</button>
              <span style={muted}>Page {data.page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} style={ghostBtn}>Next →</button>
            </div>
          )}
        </>
      )}
    </StudentPage>
  )
}
