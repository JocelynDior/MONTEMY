import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassCard, glassBtn, addRipple, C } from '../../styles/glass'

const smallBtn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.85rem', margin: 0 }
const rejectBtn = { ...smallBtn, background: 'transparent', color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)', boxShadow: 'none' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem' }

// Admin view of parent–child link requests: decide waiting ones, and remove existing links
export default function LinkRequests({ onChanged }) {
  const [filter, setFilter] = useState('pending')
  const { data, loading, error, reload } = useApiData(`/api/admin/link-requests?status=${filter}`)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)

  const run = async (id, fn) => {
    setBusyId(id); setActionError('')
    try {
      await fn()
      setConfirmRemove(null)
      await reload()
      onChanged?.()
    } catch (err) {
      setActionError(err.message)
    }
    setBusyId(null)
  }

  const decide = (r, action) => run(r.id, () =>
    apiFetch(`/api/admin/link-requests/${r.id}/decision`, { method: 'POST', body: { action } }))
  const remove = (r) => run(r.id, () => apiFetch(`/api/admin/link-requests/${r.id}/remove`, { method: 'POST' }))

  const requests = data?.requests || []

  return (
    <>
      <h2 style={{ color: C.turquoise, marginBottom: '1rem' }}>Parent links</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[['pending', 'Waiting'], ['accepted', 'Linked'], ['rejected', 'Declined']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ border: 'none', cursor: 'pointer', padding: '0.45rem 1.1rem', borderRadius: '999px', fontWeight: 600, fontSize: '0.85rem',
              background: filter === key ? 'rgba(var(--color-primary-rgb),0.85)' : 'rgba(255,255,255,0.08)',
              color: filter === key ? C.navy : 'rgba(255,255,255,0.7)' }}>
            {label}
          </button>
        ))}
      </div>

      {(error || actionError) && (
        <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1.25rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
          {actionError || error}
        </div>
      )}

      {loading ? (
        <p style={muted}>Loading...</p>
      ) : requests.length === 0 ? (
        <div className="glass" style={{ ...glassCard, padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
          {filter === 'pending' ? 'No link requests are waiting.' : filter === 'accepted' ? 'No parents are linked yet.' : 'No declined requests.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map(r => (
            <div key={r.id} className="glass" style={{ ...glassCard, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ fontWeight: 700 }}>
                  {r.parentName} <span style={{ ...muted, fontWeight: 400 }}>wants to be linked to</span> {r.studentName}
                </div>
                <div style={{ ...muted, marginTop: '0.3rem' }}>
                  Parent: {r.parentEmail} · Student: {r.studentEmail}
                </div>
                <div style={{ ...muted, fontSize: '0.78rem', marginTop: '0.3rem' }}>
                  {r.orgName || 'No organisation'} · asked {new Date(r.createdAt).toLocaleDateString()}
                  {r.decidedAt ? ` · ${r.status === 'accepted' ? 'accepted' : 'declined'} by ${r.decidedByRole || 'someone'} on ${new Date(r.decidedAt).toLocaleDateString()}` : ''}
                </div>
              </div>

              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button disabled={busyId === r.id} onClick={(e) => { addRipple(e); decide(r, 'accept') }} style={smallBtn}>Accept</button>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'reject')} style={rejectBtn}>Decline</button>
                </div>
              )}

              {r.status === 'accepted' && (
                confirmRemove === r.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Remove this link?</span>
                    <button disabled={busyId === r.id} onClick={() => remove(r)}
                      style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, remove</button>
                    <button onClick={() => setConfirmRemove(null)}
                      style={{ ...smallBtn, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRemove(r.id)} style={rejectBtn}>Remove link</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
