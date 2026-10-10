import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from './studentUtils'
import { ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'

// Shown on the student dashboard: parents asking to be linked, and parents already linked.
// Renders nothing when there is nothing to show.
export default function ParentLinks() {
  const { data, error, reload } = useApiData('/api/student/link-requests')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(null)

  const run = async (id, fn) => {
    setBusyId(id); setActionError('')
    try { await fn(); setConfirmRemove(null); await reload() } catch (err) { setActionError(err.message) }
    setBusyId(null)
  }

  const decide = (req, action) => run(req.id, () =>
    apiFetch(`/api/student/link-requests/${req.id}/decision`, { method: 'POST', body: { action } }))
  const remove = (p) => run(p.requestId, () => apiFetch(`/api/student/parents/${p.parentId}`, { method: 'DELETE' }))

  if (error) return null
  if (!data || (data.pending.length === 0 && data.parents.length === 0)) return null

  return (
    <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
      {data.pending.length > 0 && (
        <div style={{ ...panel, borderColor: 'rgba(255,224,138,0.5)' }}>
          <h3 style={panelTitle}>Parent link requests</h3>
          <p style={{ ...muted, marginBottom: '0.9rem' }}>
            Someone has asked to be linked to your account as your parent. If you accept, they can see your homework and grades (view only).
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {data.pending.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{r.parentName}</strong>
                  <span style={{ ...muted, fontSize: '0.8rem' }}> · asked on {fmtDate(r.createdAt, false)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'accept')} style={smallBtn}>Accept</button>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'reject')}
                    style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.parents.length > 0 && (
        <div style={panel}>
          <h3 style={panelTitle}>Linked parents</h3>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {data.parents.map(p => (
              <div key={p.requestId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{p.parentName}</span>
                {confirmRemove === p.requestId ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>They will lose access.</span>
                    <button disabled={busyId === p.requestId} onClick={() => remove(p)}
                      style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, remove</button>
                    <button onClick={() => setConfirmRemove(null)} style={ghostBtn}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRemove(p.requestId)} style={ghostBtn}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {actionError && <p style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{actionError}</p>}
    </div>
  )
}
