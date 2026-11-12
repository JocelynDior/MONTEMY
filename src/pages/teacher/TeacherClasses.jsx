import React, { useState } from 'react'
import TeacherPage from '../../components/teacher/TeacherPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { useT } from '../../i18n'
import { GRADES, CLASS_LETTERS } from '../../config/studentOptions'
import { glassBtn, glassCard, glassInput } from '../../styles/glass'

function AddClassForm({ onSave, onCancel, t }) {
  const [grade, setGrade] = useState('')
  const [letter, setLetter] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!grade) return setErr(t('teacher.errClassGrade'))
    if (!letter) return setErr(t('teacher.errClassLetter'))
    setSaving(true); setErr(null)
    try {
      const res = await apiFetch('/api/teacher/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, letter }),
      })
      if (!res.ok) throw new Error(await res.text())
      onSave()
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  const lbl = { display: 'block', fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--fg-muted)' }
  const inp = { ...glassInput, width: '100%', boxSizing: 'border-box', marginBottom: 'var(--sp-2)' }

  return (
    <form onSubmit={submit} style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      {err && <ErrorBox message={err} />}
      <label style={lbl}>{t('teacher.grade')}
        <select value={grade} onChange={(e) => setGrade(e.target.value)} style={inp} required>
          <option value="">{t('teacher.chooseGrade')}</option>
          {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </label>
      <label style={lbl}>{t('teacher.classLetter')}
        <select value={letter} onChange={(e) => setLetter(e.target.value)} style={inp} required>
          <option value="">{t('teacher.chooseLetter')}</option>
          {CLASS_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </label>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button type="submit" disabled={saving} style={glassBtn}>{saving ? t('settings.saving') : t('teacher.addClass')}</button>
        <button type="button" onClick={onCancel} style={ghostBtn}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function ClassCard({ cls, onDelete, t }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
        <button
          onClick={() => setExpanded((o) => !o)}
          style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start', padding: 0, minWidth: 0 }}
          aria-expanded={expanded}
        >
          <span style={{ fontWeight: 700, fontSize: 'var(--fs-lg)' }}>{cls.name}</span>
          <span style={{ ...muted, fontSize: 'var(--fs-sm)', marginInlineStart: 'var(--sp-2)' }}>
            {t('teacher.studentCount', { n: cls.studentCount ?? 0 })}
          </span>
        </button>
        <button
          style={ghostBtn}
          onClick={() => setExpanded((o) => !o)}
          aria-label={expanded ? t('common.close') : t('teacher.viewStudents')}
        >
          <Icon name={expanded ? 'chevron' : 'users'} size={14} />
        </button>
        {confirmDel ? (
          <>
            <button style={smallBtn} onClick={() => onDelete(cls.id)} aria-label={t('common.confirm')}>
              <Icon name="check" size={14} />
            </button>
            <button style={ghostBtn} onClick={() => setConfirmDel(false)} aria-label={t('common.cancel')}>
              <Icon name="close" size={14} />
            </button>
          </>
        ) : (
          <button style={ghostBtn} onClick={() => setConfirmDel(true)} aria-label={t('common.delete')}>
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-3)' }}>
          {cls.students?.length
            ? cls.students.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-1) 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--fs-sm)' }}>
                  <Icon name="profile" size={14} />
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>{s.name}</span>
                </div>
              ))
            : <p style={muted}>{t('teacher.noStudentsInClass')}</p>
          }
        </div>
      )}
    </div>
  )
}

export default function TeacherClasses() {
  const t = useT('teacher')
  const { data, loading, error, reload } = useApiData('/api/teacher/classes')
  const [adding, setAdding] = useState(false)

  async function deleteClass(id) {
    try {
      const res = await apiFetch(`/api/teacher/classes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      reload()
    } catch {
      reload()
    }
  }

  return (
    <TeacherPage title={t('shell.f_classes')}>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data?.canWrite && !adding && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setAdding(true)}
        >
          <Icon name="plus" size={14} /> {t('teacher.addClass')}
        </button>
      )}

      {adding && (
        <AddClassForm
          onSave={() => { setAdding(false); reload() }}
          onCancel={() => setAdding(false)}
          t={t}
        />
      )}

      {data?.classes?.length === 0 && !adding && (
        <p style={muted}>{t('teacher.noClasses')}</p>
      )}

      {data?.classes?.map((cls) => (
        <ClassCard key={cls.id} cls={cls} onDelete={deleteClass} t={t} />
      ))}
    </TeacherPage>
  )
}
