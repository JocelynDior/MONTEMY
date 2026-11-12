import React, { useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { glassBtn } from '../../styles/glass'
import ResourceUploadForm from '../../components/resources/ResourceUploadForm'
import ResourceGrid from '../../components/resources/ResourceGrid'

export default function TeacherResources() {
  const t = useT('teacher')
  const { data, loading, error, reload } = useApiData('/api/resources?mine=1')
  const [uploading, setUploading] = useState(false)

  return (
    <TeacherPage title={t('shell.f_textbooks')}>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data?.canWrite && !uploading && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setUploading(true)}
        >
          <Icon name="upload" size={14} /> {t('teacher.uploadTextbook')}
        </button>
      )}

      {uploading && (
        <ResourceUploadForm
          onSave={() => { setUploading(false); reload() }}
          onCancel={() => setUploading(false)}
        />
      )}

      {data?.resources?.length === 0 && !uploading && (
        <p style={muted}>{t('teacher.noTextbooks')}</p>
      )}

      {data?.resources?.length > 0 && (
        <ResourceGrid resources={data.resources} onDelete={reload} />
      )}
    </TeacherPage>
  )
}
