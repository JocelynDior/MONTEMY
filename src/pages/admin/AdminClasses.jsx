import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const label = { display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }
const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const opt = { color: '#000' }

function CreateClass({ orgs, defaultOrgId, onDone, onCancel }) {
  const [orgId, setOrgId] = useState(defaultOrgId || '')
  const [grade, setGrade] = useState('')
  const [letter, setLetter] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const teachersReq = useApiData(orgId ? `/api/admin/teachers?orgId=${orgId}` : null)
  const teachers = teachersReq.data?.teachers || []

  const save = async () => {
    setSaving(true); setError('')
    try {
      await apiFetch('/api/admin/classes', { method: 'POST', body: { orgId, grade, letter, teacherId: teacherId || undefined } })
      onDone()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <h3 style={panelTitle}>New class</h3>
      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <div>
          <label style={label} htmlFor="c-org">Organisation</label>
          <select id="c-org" value={orgId} onChange={e => { setOrgId(e.target.value); setTeacherId('') }} style={glassInput}>
            <option value="" style={opt}>Choose an organisation...</option>
            {orgs.map(o => <option key={o.id} value={o.id} style={opt}>{o.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
          <div>
            <label style={label} htmlFor="c-grade">Grade</label>
            <select id="c-grade" value={grade} onChange={e => setGrade(e.target.value)} style={glassInput}>
              <option value="" style={opt}>Grade...</option>
              {GRADES.map(g => <option key={g} value={g} style={opt}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={label} htmlFor="c-letter">Letter</label>
            <select id="c-letter" value={letter} onChange={e => setLetter(e.target.value)} style={glassInput}>
              <option value="" style={opt}>Letter...</option>
              {LETTERS.map(l => <option key={l} value={l} style={opt}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={label} htmlFor="c-teacher">Teacher (optional)</label>
          <select id="c-teacher" value={teacherId} onChange={e => setTeacherId(e.target.value)} style={glassInput} disabled={!orgId}>
            <option value="" style={opt}>{orgId ? 'No teacher yet' : 'Choose an organisation first'}</option>
            {teachers.map(t => <option key={t.id} value={t.id} style={opt}>{t.name}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
        <button disabled={saving} onClick={save} style={smallBtn}>{saving ? 'Creating...' : 'Create class'}</button>
        <button disabled={saving} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  )
}

function ClassCard({ cls, onChanged }) {
  const [mode, setMode] = useState(null)   // null | 'edit' | 'teachers' | 'delete'
  const [grade, setGrade] = useState(cls.grade)
  const [letter, setLetter] = useState(cls.letter)
  const [addId, setAddId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const teachersReq = useApiData(mode === 'teachers' ? `/api/admin/teachers?orgId=${cls.orgId}` : null)
  const available = (teachersReq.data?.teachers || []).filter(t => !cls.teachers.some(ct => ct.id === t.id))

  const run = async (fn, after) => {
    setBusy(true); setError('')
    try { await fn(); after?.(); await onChanged() } catch (err) { setError(err.message) }
    setBusy(false)
  }

  return (
    <div style={{ ...panel, marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Class {cls.name}</div>
          <div style={{ ...muted, fontSize: '0.85rem' }}>{cls.orgName || 'No organisation'} · {cls.students} student{cls.students === 1 ? '' : 's'}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {cls.teachers.length === 0
            ? <span style={{ ...muted, fontSize: '0.85rem' }}>No teacher assigned</span>
            : cls.teachers.map(t => <Chip key={t.id} color="#8fd3ff">{t.name}</Chip>)}
        </div>
      </div>

      {mode === 'edit' && (
        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={grade} onChange={e => setGrade(e.target.value)} style={{ ...glassInput, width: 'auto' }} aria-label="Grade">
            {GRADES.map(g => <option key={g} value={g} style={opt}>Grade {g}</option>)}
          </select>
          <select value={letter} onChange={e => setLetter(e.target.value)} style={{ ...glassInput, width: 'auto' }} aria-label="Letter">
            {LETTERS.map(l => <option key={l} value={l} style={opt}>{l}</option>)}
          </select>
          <button disabled={busy} onClick={() => run(() => apiFetch(`/api/admin/classes/${cls.id}`, { method: 'PUT', body: { grade, letter } }), () => setMode(null))} style={smallBtn}>Save</button>
          <button onClick={() => { setMode(null); setError('') }} style={ghostBtn}>Cancel</button>
        </div>
      )}

      {mode === 'teachers' && (
        <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
          {cls.teachers.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
              <span>{t.name}</span>
              <button disabled={busy} onClick={() => run(() => apiFetch(`/api/admin/classes/${cls.id}/teachers/${t.id}`, { method: 'DELETE' }))}
                style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Remove</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={addId} onChange={e => setAddId(e.target.value)} style={{ ...glassInput, width: 'auto', minWidth: '200px' }} aria-label="Add a teacher">
              <option value="" style={opt}>{teachersReq.loading ? 'Loading teachers...' : available.length ? 'Add a teacher...' : 'No other teachers in this organisation'}</option>
              {available.map(t => <option key={t.id} value={t.id} style={opt}>{t.name}</option>)}
            </select>
            <button disabled={busy || !addId} onClick={() => run(() => apiFetch(`/api/admin/classes/${cls.id}/teachers`, { method: 'POST', body: { teacherId: addId } }), () => setAddId(''))} style={smallBtn}>Add</button>
            <button onClick={() => { setMode(null); setError('') }} style={ghostBtn}>Done</button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}

      {mode === null && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
          <button onClick={() => { setGrade(cls.grade); setLetter(cls.letter); setMode('edit') }} style={ghostBtn}>Edit</button>
          <button onClick={() => setMode('teachers')} style={ghostBtn}>Teachers</button>
          <button onClick={() => setMode('delete')} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
        </div>
      )}

      {mode === 'delete' && (
        <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>
            Delete class {cls.name}? Its {cls.students} student{cls.students === 1 ? '' : 's'} stay on the platform but lose their class.
          </span>
          <button disabled={busy} onClick={() => run(() => apiFetch(`/api/admin/classes/${cls.id}`, { method: 'DELETE' }))} style={dangerBtn}>{busy ? '...' : 'Yes, delete'}</button>
          <button onClick={() => { setMode(null); setError('') }} style={ghostBtn}>Cancel</button>
        </div>
      )}
    </div>
  )
}

export default function AdminClasses() {
  const [orgId, setOrgId] = useState('')
  const [creating, setCreating] = useState(false)
  const orgsReq = useApiData('/api/admin/orgs')
  const { data, loading, error, reload } = useApiData(`/api/admin/classes${orgId ? `?orgId=${orgId}` : ''}`)
  const orgs = orgsReq.data?.orgs || []
  const classes = data?.classes || []

  return (
    <StudentPage title="Classes" icon="🏫" backPath="/admin/dashboard" maxWidth={1000}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <select value={orgId} onChange={e => setOrgId(e.target.value)} style={{ ...glassInput, width: 'auto', minWidth: '220px' }} aria-label="Filter by organisation">
          <option value="" style={opt}>All organisations</option>
          {orgs.map(o => <option key={o.id} value={o.id} style={opt}>{o.name}</option>)}
        </select>
        {!creating && <button onClick={() => setCreating(true)} style={smallBtn}>+ New class</button>}
      </div>

      {creating && (
        <CreateClass orgs={orgs} defaultOrgId={orgId} onCancel={() => setCreating(false)}
          onDone={() => { setCreating(false); reload() }} />
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading...</p>}

      {data && (classes.length === 0
        ? <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>No classes yet.</div>
        : classes.map(c => <ClassCard key={c.id} cls={c} onChanged={reload} />))}
    </StudentPage>
  )
}
