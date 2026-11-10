import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { fmtDate } from './studentUtils'
import { ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'

// Shown on the student dashboard: parents asking to be linked, and parents already linked.
// Renders nothing when there is nothing to show.
export default function ParentLinks({ embedded = false }) {
  const t = useT()
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

  if (error) return <p role="alert" style={muted}>{error}</p>
  if (!data) return null
  if (data.pending.length === 0 && data.parents.length === 0) return embedded ? <p style={muted}>{t('settings.noLinks')}</p> : null

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {data.pending.length > 0 && (
        <div style={{ ...panel, borderColor: 'var(--border-strong)', borderWidth: 2 }}>
          <h3 style={panelTitle}>{t('settings.linkRequests')}</h3>
          <p style={{ ...muted, marginBottom: '0.9rem' }}>
            {t('settings.linkRequestsText')}
          </p>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {data.pending.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{r.parentName}</strong>
                  <span style={{ ...muted, fontSize: 'var(--fs-xs)' }}> · {t('settings.askedOn', { date: fmtDate(r.createdAt, false) })}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'accept')} style={smallBtn}>{t('settings.accept')}</button>
                  <button disabled={busyId === r.id} onClick={() => decide(r, 'reject')}
                    style={ghostBtn}>{t('settings.decline')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.parents.length > 0 && (
        <div style={embedded ? { display: 'grid', gap: '0.7rem' } : { ...panel, display: 'grid', gap: '0.7rem' }}>
            {!embedded && <h3 style={panelTitle}>{t('settings.linkedParents')}</h3>}
            {data.parents.map(p => (
              <div key={p.requestId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{p.parentName}</span>
                {confirmRemove === p.requestId ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{t('settings.willLoseAccess')}</span>
                    <button disabled={busyId === p.requestId} onClick={() => remove(p)}
                      style={smallBtn}>{t('settings.yesRemove')}</button>
                    <button onClick={() => setConfirmRemove(null)} style={ghostBtn}>{t('common.cancel')}</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRemove(p.requestId)} style={ghostBtn}>{t('settings.remove')}</button>
                )}
              </div>
            ))}
        </div>
      )}

      {actionError && <p role="alert" style={{ fontSize: 'var(--fs-sm)' }}>{actionError}</p>}
    </div>
  )
}
