import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { glassBtn, glassInput } from '../../styles/glass'
import { useT } from '../../i18n'
import GradeSubjectFields from './GradeSubjectFields'
import { CLASS_LETTERS } from '../../config/studentOptions'

const labelStyle = { display: 'block', color: 'var(--fg)', fontSize: 'var(--fs-sm)', marginBottom: '0.5rem', fontWeight: 600 }

// Lets a student set or change their grade, subjects and class
export default function StudentProfileForm({ initial, onSaved, onCancel }) {
  const t = useT()
  const [grade, setGrade] = useState(initial?.grade || '')
  const [subjects, setSubjects] = useState(initial?.subjects || [])
  const [letter, setLetter] = useState(initial?.letter || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!grade) return setError(t('student.errGrade'))
    if (subjects.length === 0) return setError(t('student.errSubjects'))
    setSaving(true)
    try {
      await apiFetch('/api/student/profile', {
        method: 'PUT',
        body: { grade, subjects, letter: letter || null },
      })
      onSaved?.()
    } catch (err) {
      setError(err.message || t('common.genericError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} style={{ minWidth: 0 }}>
      <GradeSubjectFields grade={grade} subjects={subjects} onGrade={setGrade} onSubjects={setSubjects} />

      <div style={{ marginBottom: 'var(--sp-4)', minWidth: 0 }}>
        <label htmlFor="sp-class" style={labelStyle}>{t('student.yourClass')}</label>
        <select id="sp-class" className="reg-input" style={glassInput} value={letter} onChange={e => setLetter(e.target.value)}>
          <option value="">{t('student.noClassSelected')}</option>
          {CLASS_LETTERS.map(l => (
            <option key={l} value={l}>{grade ? `${grade}${l}` : t('student.classLetter', { letter: l })}</option>
          ))}
        </select>
        {grade && letter && (
          <div style={{ color: 'var(--fg-muted)', fontSize: 'var(--fs-sm)', marginTop: '0.4rem' }}>
            {t('student.youWillBeIn', { class: `${grade}${letter}` })}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: 'var(--fs-sm)', overflowWrap: 'anywhere' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={saving} style={{ ...glassBtn, flex: '1 1 8rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('settings.saving') : t('common.save')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{ ...glassBtn, flex: '1 1 8rem', background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)' }}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}
