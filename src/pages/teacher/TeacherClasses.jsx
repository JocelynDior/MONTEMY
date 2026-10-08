import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TeacherPage from '../../components/teacher/TeacherPage'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { GRADES, CLASS_LETTERS } from '../../config/studentOptions'
import { glassCard, glassBtn, glassInput, C } from '../../styles/glass'

const panel = { ...glassCard, padding: '1.25rem', marginBottom: '1rem' }
const muted = { color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }
const labelStyle = { display: 'block', color: C.turquoise, fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '600' }
const ghostBtn = { ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }

export default function TeacherClasses() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/teacher/classes')
  const [open, setOpen] = useState(null)
  const [grade, setGrade] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const classes = data?.classes || []
  const have = new Set(classes.map(c => c.name))

  const add = async (letter) => {
    setActionError('')
    setBusy(true)
    try {
      await apiFetch('/api/teacher/classes', { method: 'POST', body: { grade, letter } })
      reload()
    } catch (err) {
      setActionError(err.message || 'Could not add the class.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Remove ${c.name} from your list? Its students and assignments are kept, and you can add it back any time.`)) return
    setActionError('')
    setBusy(true)
    try {
      await apiFetch(`/api/teacher/classes/${c.id}`, { method: 'DELETE' })
      if (open === c.id) setOpen(null)
      reload()
    } catch (err) {
      setActionError(err.message || 'Could not remove the class.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <TeacherPage title="My Classes" icon="🏫">
      {loading && <p style={muted}>Loading...</p>}

      {error && (
        <div style={{ ...panel, borderColor: 'rgba(255,80,80,0.4)' }}>
          <p style={{ color: '#ffb3b3', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={reload} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.2rem' }}>Try again</button>
        </div>
      )}

      {data && (
        <div style={panel}>
          <h3 style={{ color: C.turquoise, marginBottom: '0.75rem' }}>Add a class</h3>
          <label style={labelStyle}>Grade</label>
          <select style={glassInput} value={grade} onChange={e => setGrade(e.target.value)}>
            <option value="" style={{ background: '#001F3F' }}>Choose a grade</option>
            {GRADES.map(g => <option key={g} value={g} style={{ background: '#001F3F' }}>Grade {g}</option>)}
          </select>

          {grade && (
            <div style={{ marginTop: '1rem' }}>
              <label style={labelStyle}>Class</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {CLASS_LETTERS.map(l => {
                  const label = `${grade}${l}`
                  const added = have.has(label)
                  return (
                    <button key={l} type="button" disabled={added || busy} onClick={() => add(l)}
                      style={{
                        ...ghostBtn, cursor: added || busy ? 'default' : 'pointer', opacity: added ? 0.45 : 1,
                      }}>
                      {label}{added ? ' ✓' : ' +'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {actionError && <p style={{ color: '#ffb3b3', marginTop: '0.75rem', fontSize: '0.9rem' }}>{actionError}</p>}
        </div>
      )}

      {data && classes.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You haven't added any classes yet. Choose a grade above, then tap the class you teach, for example 8C.
        </div>
      )}

      {classes.map(c => {
        const isOpen = open === c.id
        return (
          <div key={c.id} style={panel}>
            <div onClick={() => setOpen(isOpen ? null : c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.name}</div>
                <div style={muted}>Grade {c.grade}</div>
              </div>
              <div style={{ ...muted, textAlign: 'right' }}>
                {c.students.length} student{c.students.length === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                {c.students.length === 0 ? (
                  <p style={muted}>No students have joined {c.name} yet. Students choose their grade and class on their dashboard.</p>
                ) : c.students.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span>{s.name}</span>
                    <span style={{ ...muted, fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{s.email}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button onClick={() => navigate('/teacher/assignments')} style={{ ...glassBtn, width: 'auto', padding: '0.5rem 1.1rem', fontSize: '0.9rem' }}>Assignments</button>
                  <button onClick={() => navigate('/teacher/progress')} style={ghostBtn}>Progress</button>
                  <button disabled={busy} onClick={() => remove(c)} style={{ ...ghostBtn, color: '#ffb3b3', borderColor: 'rgba(255,80,80,0.4)' }}>Remove</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </TeacherPage>
  )
}
