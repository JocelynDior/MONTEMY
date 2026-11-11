import React, { useState } from 'react'
import { glassInput } from '../../styles/glass'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'
import { GRADES, SUBJECT_OPTIONS, gradeLabel, subjectLabel } from '../../config/studentOptions'

const labelStyle = { display: 'block', color: 'var(--fg)', fontSize: 'var(--fs-sm)', marginBottom: '0.5rem', fontWeight: 600 }

// Grade dropdown + subject chips, shared by the Register page and the profile form.
// The stored subject values stay in English (config/studentOptions.js); only the names shown are translated.
export default function GradeSubjectFields({ grade, subjects, onGrade, onSubjects }) {
  const t = useT()
  const [custom, setCustom] = useState('')

  const toggle = (s) => onSubjects(subjects.includes(s) ? subjects.filter(x => x !== s) : [...subjects, s])

  const addCustom = () => {
    const text = custom.trim().slice(0, 60)
    if (text && !subjects.some(x => x.toLowerCase() === text.toLowerCase())) onSubjects([...subjects, text])
    setCustom('')
  }

  const extra = subjects.filter(s => !SUBJECT_OPTIONS.includes(s))
  const options = [...SUBJECT_OPTIONS, ...extra]

  return (
    <>
      <div style={{ marginBottom: 'var(--sp-4)', minWidth: 0 }}>
        <label htmlFor="gs-grade" style={labelStyle}>{t('student.grade')}</label>
        <select id="gs-grade" className="reg-input" style={glassInput} value={grade} onChange={e => onGrade(e.target.value)}>
          <option value="">{t('student.chooseGrade')}</option>
          {GRADES.map(g => <option key={g} value={g}>{gradeLabel(g, t)}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 'var(--sp-4)', minWidth: 0 }}>
        <span id="gs-subjects" style={labelStyle}>{t('student.subjects')}</span>
        <div role="group" aria-labelledby="gs-subjects" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {options.map(s => {
            const on = subjects.includes(s)
            return (
              <button type="button" key={s} onClick={() => toggle(s)} aria-pressed={on}
                style={{
                  cursor: 'pointer', borderRadius: 'var(--radius-pill)', padding: '0.4rem 0.85rem', minHeight: '2.25rem', fontSize: 'var(--fs-sm)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem', maxWidth: '100%', textAlign: 'start', overflowWrap: 'anywhere',
                  border: on ? '1px solid var(--fg)' : '1px solid var(--border-strong)',
                  background: on ? 'var(--fg)' : 'transparent',
                  color: on ? 'var(--on-fg)' : 'var(--fg)', fontWeight: on ? 700 : 400,
                }}>
                {on && <Icon name="check" size="1em" />}
                {subjectLabel(s, t)}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', minWidth: 0 }}>
          <input className="reg-input" style={{ ...glassInput, flex: 1 }}
            value={custom} onChange={e => setCustom(e.target.value)} maxLength={60}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder={t('student.otherSubject')} aria-label={t('student.otherSubject')} />
          <button type="button" onClick={addCustom}
            style={{ background: 'transparent', border: '1px solid var(--border-strong)', color: 'var(--fg)', borderRadius: 'var(--radius-md)', padding: '0 1rem', minHeight: '2.75rem', cursor: 'pointer', flexShrink: 0 }}>
            {t('common.add')}
          </button>
        </div>
      </div>
    </>
  )
}
