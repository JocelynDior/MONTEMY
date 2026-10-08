import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { glassBtn, glassInput, C } from '../../styles/glass'
import GradeSubjectFields from './GradeSubjectFields'
import { CLASS_LETTERS } from '../../config/studentOptions'

const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }

// Lets a student set or change their grade, subjects and class
export default function StudentProfileForm({ initial, onSaved, onCancel }) {
  const [grade, setGrade] = useState(initial?.grade || '')
  const [subjects, setSubjects] = useState(initial?.subjects || [])
  const [letter, setLetter] = useState(initial?.letter || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!grade) return setError('Please choose your grade.')
    if (subjects.length === 0) return setError('Please choose at least one subject.')
    setSaving(true)
    try {
      await apiFetch('/api/student/profile', {
        method: 'PUT',
        body: { grade, subjects, letter: letter || null },
      })
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save}>
      <style>{`.reg-input:focus { border-color: rgba(var(--color-primary-rgb),0.8) !important; }`}</style>

      <GradeSubjectFields grade={grade} subjects={subjects} onGrade={setGrade} onSubjects={setSubjects} />

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Your class</label>
        <select className="reg-input" style={glassInput} value={letter} onChange={e => setLetter(e.target.value)}>
          <option value="" style={{ background: '#001F3F' }}>No class selected</option>
          {CLASS_LETTERS.map(l => (
            <option key={l} value={l} style={{ background: '#001F3F' }}>{grade ? `${grade}${l}` : `Class ${l}`}</option>
          ))}
        </select>
        {grade && letter && (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            You'll be in class {grade}{letter}.
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: '#ffaaaa', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" disabled={saving} style={{ ...glassBtn, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{ ...glassBtn, background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
