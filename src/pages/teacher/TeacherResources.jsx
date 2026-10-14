import React from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import ResourceUploadForm from '../../components/resources/ResourceUploadForm'
import ResourceGrid from '../../components/resources/ResourceGrid'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { glassCard, glassBtn, C } from '../../styles/glass'

const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }

export default function TeacherResources() {
  const { data, loading, error, reload } = useApiData('/api/resources?mine=1')
  const resources = data?.resources || []

  const remove = async (id) => {
    await apiFetch(`/api/resources/${id}`, { method: 'DELETE' })
    await reload()
  }

  return (
    <TeacherPage title="Study Resources" icon="📚">
      <ResourceUploadForm onUploaded={reload} />

      <h3 style={{ color: C.turquoise, fontSize: '1.05rem', marginBottom: '0.75rem' }}>Your uploads</h3>
      {loading ? <p style={muted}>Loading...</p> : error ? (
        <div style={{ ...glassCard, padding: '1rem 1.25rem', borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      ) : resources.length === 0 ? (
        <div style={{ ...glassCard, padding: '2rem', textAlign: 'center', ...muted }}>
          You haven't uploaded anything yet. Use the form above to share notes, worksheets or past papers with your school.
        </div>
      ) : (
        <ResourceGrid resources={resources} onDelete={remove} showUploader={false} />
      )}
    </TeacherPage>
  )
}
