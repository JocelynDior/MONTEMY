import React, { useState } from 'react'
import { glassInput, C } from '../../styles/glass'
import { GRADES, SUBJECT_OPTIONS } from '../../config/studentOptions'

const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }

// Grade dropdown + subject chips, shared by the Register page and the profile form
export default function GradeSubjectFields({ grade, subjects, onGrade, onSubjects }) {
  const [custom, setCustom] = useState('')

  const toggle = (s) => onSubjects(subjects.includes(s) ? subjects.filter(x => x !== s) : [...subjects, s])

  const addCustom = () => {
    const t = custom.trim().slice(0, 60)
    if (t && !subjects.some(x => x.toLowerCase() === t.toLowerCase())) onSubjects([...subjects, t])
    setCustom('')
  }

  const extra = subjects.filter(s => !SUBJECT_OPTIONS.includes(s))
  const options = [...SUBJECT_OPTIONS, ...extra]

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Grade</label>
        <select className="reg-input" style={glassInput} value={grade} onChange={e => onGrade(e.target.value)}>
          <option value="" style={{ background: '#001F3F' }}>Choose your grade</option>
          {GRADES.map(g => <option key={g} value={g} style={{ background: '#001F3F' }}>Grade {g}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Subjects</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {options.map(s => {
            const on = subjects.includes(s)
            return (
              <button type="button" key={s} onClick={() => toggle(s)}
                style={{
                  cursor: 'pointer', borderRadius: '999px', padding: '0.4rem 0.85rem', fontSize: '0.85rem',
                  border: on ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.2)',
                  background: on ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.06)',
                  color: 'white', fontWeight: on ? 700 : 400,
                }}>
                {on ? '✓ ' : ''}{s}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input className="reg-input" style={{ ...glassInput, padding: '0.6rem 0.9rem', fontSize: '0.9rem' }}
            value={custom} onChange={e => setCustom(e.target.value)} maxLength={60}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
            placeholder="Other subject..." />
          <button type="button" onClick={addCustom}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '10px', padding: '0 1rem', cursor: 'pointer' }}>
            Add
          </button>
        </div>
      </div>
    </>
  )
}
