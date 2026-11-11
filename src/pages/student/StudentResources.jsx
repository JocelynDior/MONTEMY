import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import ResourceGrid from '../../components/resources/ResourceGrid'
import { ErrorBox, muted, panel } from '../../components/parent/parentUi'
import { SegmentedTabs } from '../../components/tutor/tutorUi'
import SkeletonList from '../../components/shared/Skeleton'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { glassInput } from '../../styles/glass'
import { gradeLabel, subjectLabel } from '../../config/studentOptions'

const select = { ...glassInput, width: 'auto', flex: '1 1 12rem', maxWidth: '100%', minWidth: 0 }
const empty = { ...panel, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)', ...muted }

// Textbooks, study materials and past papers added by teachers
export default function StudentResources() {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/resources')
  const [tab, setTab] = useState('all') // 'all' | 'papers'
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')

  const resources = data?.resources || []
  const subjects = [...new Set(resources.map(r => r.subject).filter(Boolean))].sort()
  const grades = [...new Set(resources.map(r => r.grade).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
  const paperCount = resources.filter(r => r.isPastPaper).length

  // A resource with no grade is for everyone, so it stays visible when a grade is chosen
  const shown = resources.filter(r =>
    (tab === 'all' || r.isPastPaper) &&
    (!subject || r.subject === subject) &&
    (!grade || !r.grade || r.grade === grade))

  const tabs = [
    { key: 'all', label: t('student.allMaterials') },
    { key: 'papers', label: t('student.pastPapers', { n: paperCount }) },
  ]

  return (
    <StudentPage title={t('shell.f_textbooks')} icon="file">
      {loading ? <SkeletonList /> : error ? <ErrorBox message={error} onRetry={reload} /> : resources.length === 0 ? (
        <div style={empty}>{t('student.noMaterials')}</div>
      ) : (
        <>
          <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
            {subjects.length > 1 && (
              <select aria-label={t('student.filterSubject')} value={subject} onChange={e => setSubject(e.target.value)} style={select}>
                <option value="">{t('student.allSubjects')}</option>
                {subjects.map(s => <option key={s} value={s}>{subjectLabel(s, t)}</option>)}
              </select>
            )}
            {grades.length > 1 && (
              <select aria-label={t('student.filterGrade')} value={grade} onChange={e => setGrade(e.target.value)} style={select}>
                <option value="">{t('student.allGrades')}</option>
                {grades.map(g => <option key={g} value={g}>{gradeLabel(g, t)}</option>)}
              </select>
            )}
          </div>

          {shown.length === 0 ? (
            <div style={empty}>{t(tab === 'papers' && paperCount === 0 ? 'student.noPastPapers' : 'student.noMatch')}</div>
          ) : (
            <ResourceGrid resources={shown} />
          )}
        </>
      )}
    </StudentPage>
  )
}
