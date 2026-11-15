import React, { useState } from 'react'
import { useT } from '../../i18n/index.js'
import Icon from '../shared/Icon'
import ResourceViewer from './ResourceViewer'
import { downloadResource, fmtSize, iconFor, kindOf } from './resourceUtils'
import { glassCard } from '../../styles/glass'

const muted = { color: 'var(--fg-muted, rgba(128,128,128,0.9))', fontSize: '0.8rem' }
const actionBtn = { padding: '0.4rem 0.9rem', fontSize: '0.8rem', margin: 0, borderRadius: '999px', border: '1px solid rgba(128,128,128,0.4)', background: 'var(--color-primary)', color: 'var(--color-bg)', cursor: 'pointer' }
const ghostBtn = { ...actionBtn, background: 'transparent', color: 'var(--fg)' }
const dangerBtn = { ...actionBtn, background: 'rgba(255,80,80,0.85)', color: 'white' }

// Cards for a list of resources (textbooks and other school materials): preview (PDF/images),
// download, and delete where allowed. onDelete(id) should return a promise; the grid shows the
// error if it fails.
export default function ResourceGrid({ resources, onDelete, showOrg = false, showUploader = true }) {
  const t = useT()
  const [viewing, setViewing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const fmtDay = (iso) => {
    const d = new Date(iso)
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const download = async (r) => {
    setError(''); setBusyId(r.id)
    try { await downloadResource(r.id) } catch (err) { setError(err.message || t('shared.resources.errDownload')) }
    setBusyId(null)
  }

  const remove = async (r) => {
    setError(''); setBusyId(r.id)
    try { await onDelete(r.id); setConfirmId(null) } catch (err) { setError(err.message || t('shared.resources.errDelete')) }
    setBusyId(null)
  }

  return (
    <>
      {error && (
        <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '0.6rem', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ffb3b3', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18rem), 1fr))', gap: '1rem' }}>
        {resources.map(r => (
          <div key={r.id} style={{ ...glassCard, padding: '1.25rem', borderLeft: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <Icon name={iconFor(r.mimeType)} size={26} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{r.title}</div>
                <div style={muted}>
                  {[r.subject, r.grade ? t('shared.resources.gradeN', { n: r.grade }) : t('shared.resources.allGrades')].filter(Boolean).join(' · ')}
                </div>
              </div>
              {r.isPastPaper && (
                <span style={{ background: 'rgba(128,128,128,0.2)', color: 'var(--fg)', border: '1px solid rgba(128,128,128,0.45)', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                  {t('shared.resources.pastPaper')}
                </span>
              )}
            </div>
            <div style={muted}>
              {[r.fileName, fmtSize(r.fileSize)].filter(Boolean).join(' · ')}
            </div>
            <div style={muted}>
              {[showUploader && r.uploaderName ? t('shared.resources.addedBy', { name: r.uploaderName }) : null, showOrg && r.orgName ? r.orgName : null, fmtDay(r.createdAt)].filter(Boolean).join(' · ')}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {kindOf(r.mimeType) !== 'other' && <button onClick={() => setViewing(r)} style={actionBtn}>{t('shared.resources.preview')}</button>}
              <button onClick={() => download(r)} disabled={busyId === r.id} style={ghostBtn}>
                {busyId === r.id && confirmId !== r.id ? t('shared.resources.pleaseWait') : t('shared.resources.download')}
              </button>
              {r.canDelete && (confirmId === r.id ? (
                <>
                  <button onClick={() => remove(r)} disabled={busyId === r.id} style={dangerBtn}>{busyId === r.id ? t('shared.resources.deleting') : t('shared.events.yesDelete')}</button>
                  <button onClick={() => setConfirmId(null)} style={ghostBtn}>{t('shared.cancel')}</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(r.id)} style={{ ...ghostBtn, color: '#ff8f8f', borderColor: 'rgba(255,80,80,0.4)' }}>{t('shared.delete')}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {viewing && <ResourceViewer resource={viewing} onClose={() => setViewing(null)} onDownload={() => download(viewing)} />}
    </>
  )
}
