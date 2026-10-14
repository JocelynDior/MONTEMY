import React, { useState } from 'react'
import ResourceViewer from './ResourceViewer'
import { downloadResource, fmtSize, iconFor, kindOf } from './resourceUtils'
import { glassCard, glassBtn, C } from '../../styles/glass'

const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }
const actionBtn = { ...glassBtn, width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.8rem', margin: 0 }
const ghostBtn = { ...actionBtn, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }
const dangerBtn = { ...actionBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }

const fmtDay = (iso) => {
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Cards for a list of resources: preview (PDF/images), download, and delete where allowed.
// onDelete(id) should return a promise; the grid shows the error if it fails.
export default function ResourceGrid({ resources, onDelete, showOrg = false, showUploader = true }) {
  const [viewing, setViewing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const download = async (r) => {
    setError(''); setBusyId(r.id)
    try { await downloadResource(r.id) } catch (err) { setError(err.message || 'Could not download that file.') }
    setBusyId(null)
  }

  const remove = async (r) => {
    setError(''); setBusyId(r.id)
    try { await onDelete(r.id); setConfirmId(null) } catch (err) { setError(err.message || 'Could not delete that resource.') }
    setBusyId(null)
  }

  return (
    <>
      {error && (
        <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ffb3b3', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
        {resources.map(r => (
          <div key={r.id} style={{ ...glassCard, padding: '1.25rem', borderLeft: `4px solid ${C.turquoise}`, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{iconFor(r.mimeType)}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.title}</div>
                <div style={muted}>
                  {[r.subject, r.grade ? `Grade ${r.grade}` : 'All grades'].filter(Boolean).join(' · ')}
                </div>
              </div>
              {r.isPastPaper && (
                <span style={{ background: 'rgba(255,224,138,0.18)', color: '#ffe08a', border: '1px solid rgba(255,224,138,0.5)', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  Past paper
                </span>
              )}
            </div>
            <div style={muted}>
              {[r.fileName, fmtSize(r.fileSize)].filter(Boolean).join(' · ')}
            </div>
            <div style={muted}>
              {[showUploader && r.uploaderName ? `Added by ${r.uploaderName}` : null, showOrg && r.orgName ? r.orgName : null, fmtDay(r.createdAt)].filter(Boolean).join(' · ')}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {kindOf(r.mimeType) !== 'other' && <button onClick={() => setViewing(r)} style={actionBtn}>Preview</button>}
              <button onClick={() => download(r)} disabled={busyId === r.id} style={ghostBtn}>
                {busyId === r.id && confirmId !== r.id ? 'Please wait...' : 'Download'}
              </button>
              {r.canDelete && (confirmId === r.id ? (
                <>
                  <button onClick={() => remove(r)} disabled={busyId === r.id} style={dangerBtn}>{busyId === r.id ? 'Deleting...' : 'Yes, delete'}</button>
                  <button onClick={() => setConfirmId(null)} style={ghostBtn}>Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(r.id)} style={{ ...ghostBtn, color: '#ffb3b3', borderColor: 'rgba(255,80,80,0.4)' }}>Delete</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {viewing && <ResourceViewer resource={viewing} onClose={() => setViewing(null)} onDownload={() => download(viewing)} />}
    </>
  )
}
