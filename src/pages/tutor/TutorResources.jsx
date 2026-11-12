import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { glassBtn } from '../../styles/glass'
import ResourceUploadForm from '../../components/resources/ResourceUploadForm'
import ResourceGrid from '../../components/resources/ResourceGrid'

export default function TutorResources() {
  const t = useT('tutor')
  const { pick } = useOrgTerms()
  const { data, loading, error, reload } = useApiData('/api/resources?mine=1')
  const [uploading, setUploading] = useState(false)

  return (
    <StudentPage title={t('shell.f_textbooks')} backPath="/tutor/dashboard">
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data?.canWrite && !uploading && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setUploading(true)}
        >
          <Icon name="upload" size={14} /> {t('tutor.uploadTextbook')}
        </button>
      )}

      {uploading && (
        <ResourceUploadForm
          onSave={() => { setUploading(false); reload() }}
          onCancel={() => setUploading(false)}
        />
      )}

      {data?.resources?.length === 0 && !uploading && (
        <p style={muted}>{pick(t('tutor.noTextbooksFirm'), t('tutor.noTextbooks'))}</p>
      )}

      {data?.resources?.length > 0 && (
        <ResourceGrid resources={data.resources} onDelete={reload} />
      )}
    </StudentPage>
  )
}
