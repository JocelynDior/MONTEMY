import React, { useState } from 'react'
import ResourceUploadForm from '../resources/ResourceUploadForm'
import ResourceGrid from '../resources/ResourceGrid'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const opt = { background: '#001F3F' }

// Admin tab: browse and delete any resource, and upload for any organisation
export default function AdminResources() {
  const [orgId, setOrgId] = useState('')
  const orgsReq = useApiData('/api/admin/orgs')
  const { data, loading, error, reload } = useApiData(`/api/resources${orgId ? `?orgId=${orgId}` : ''}`)

  const orgs = (orgsReq.data?.orgs || []).filter(o => o.isActive)
  const resources = data?.resources || []

  const remove = async (id) => {
    await apiFetch(`/api/resources/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <>
      <h2 style={{ color: C.turquoise, marginBottom: '1.25rem' }}>Study Resources</h2>

      <div style={{ ...glassCard, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <label htmlFor="admin-res-org" style={{ display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>
          Organisation
        </label>
        <select id="admin-res-org" value={orgId} onChange={e => setOrgId(e.target.value)} style={glassInput}>
          <option value="" style={opt}>All organisations (browse only)</option>
          {orgs.map(o => <option key={o.id} value={o.id} style={opt}>{o.name}</option>)}
        </select>
        <div style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Pick an organisation to upload materials for it. The list below is filtered to the same choice.
        </div>
      </div>

      {orgId && <ResourceUploadForm key={orgId} orgId={orgId} onUploaded={reload} />}

      {loading ? <p style={muted}>Loading...</p> : error ? (
        <div style={{ ...glassCard, padding: '1rem 1.25rem', borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      ) : resources.length === 0 ? (
        <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', ...muted }}>No resources here yet.</div>
      ) : (
        <ResourceGrid resources={resources} onDelete={remove} showOrg={!orgId} />
      )}
    </>
  )
}
