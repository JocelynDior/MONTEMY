import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentPage from '../../components/student/StudentPage'
import { Chip, ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { fmtDuration, sessionStatusColor, sessionStatusLabel } from '../../components/tutor/tutorUi'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { fmtDate } from '../../components/student/studentUtils'
import { glassInput } from '../../styles/glass'

function AddStudentPanel({ isVerifiedHint, onAdded }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/tutor/students/search?q=${encodeURIComponent(q)}`)
        if (!cancelled) { setResults(data.students); setError('') }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, open])

  const add = async (s) => {
    setBusyId(s.id); setError('')
    try {
      await apiFetch('/api/tutor/students', { method: 'POST', body: { studentId: s.id } })
      setResults(list => list.map(r => r.id === s.id ? { ...r, added: true } : r))
      onAdded()
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  return (
    <div style={{ ...panel, marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ ...panelTitle, marginBottom: 0 }}>Add a student</h3>
        <button onClick={() => setOpen(o => !o)} style={ghostBtn}>{open ? 'Close' : 'Find a student'}</button>
      </div>
      {open && (
        <div style={{ marginTop: '1rem' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} style={glassInput}
            placeholder="Type the student's name (at least 2 letters)" aria-label="Search for a student by name" />
          <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>Only students in your organisation are shown.</p>
          {searching && <p style={{ ...muted, marginTop: '0.75rem' }}>Searching...</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && !error && (
            <p style={{ ...muted, marginTop: '0.75rem' }}>No students found with that name.</p>
          )}
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
            {results.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{s.name}{s.grade ? <span style={muted}> · Grade {s.grade}</span> : null}</span>
                {s.added
                  ? <Chip color="#7CFC9A">On your list</Chip>
                  : <button disabled={busyId === s.id} onClick={() => add(s)} style={smallBtn}>{busyId === s.id ? 'Adding...' : 'Add'}</button>}
              </div>
            ))}
          </div>
          {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}

function History({ studentId }) {
  const { data, loading, error } = useApiData(`/api/tutor/sessions?studentId=${studentId}`)
  if (loading) return <p style={{ ...muted, marginTop: '0.75rem' }}>Loading history...</p>
  if (error) return <p style={{ color: '#ffb3b3', marginTop: '0.75rem' }}>{error}</p>
  if (!data || data.sessions.length === 0) return <p style={{ ...muted, marginTop: '0.75rem' }}>No sessions yet.</p>
  return (
    <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
      {data.sessions.map(s => (
        <div key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>{fmtDate(s.startsAt)} · {fmtDuration(s.durationMinutes)}{s.subject ? ` · ${s.subject}` : ''}</span>
            <Chip color={sessionStatusColor(s.status)}>{sessionStatusLabel(s.status)}</Chip>
          </div>
          {s.notes && <p style={{ ...muted, marginTop: '0.35rem' }}>{s.notes}</p>}
        </div>
      ))}
    </div>
  )
}

export default function TutorStudents() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApiData('/api/tutor/students')
  const [openId, setOpenId] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [actionError, setActionError] = useState('')

  const remove = async (id) => {
    setActionError('')
    try {
      await apiFetch(`/api/tutor/students/${id}`, { method: 'DELETE' })
      setConfirmRemove(null)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <StudentPage title="My Students" icon="👨‍🎓" backPath="/tutor/dashboard">
      <AddStudentPanel onAdded={reload} />

      {loading && !data && <p style={muted}>Loading...</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginBottom: '1rem' }}>{actionError}</p>}

      {data && data.students.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>
          You haven't added any students yet. Use "Find a student" above.
        </div>
      )}

      {data && data.students.map(st => (
        <div key={st.id} style={{ ...panel, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{st.name}</div>
              <div style={{ ...muted, fontSize: '0.85rem' }}>
                {st.grade ? `Grade ${st.grade} · ` : ''}{st.sessionCount} session{st.sessionCount === 1 ? '' : 's'}
                {st.nextSession ? ` · next ${fmtDate(st.nextSession)}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => navigate(`/tutor/sessions?student=${st.id}`)} style={smallBtn}>Schedule session</button>
              <button onClick={() => setOpenId(openId === st.id ? null : st.id)} style={ghostBtn}>{openId === st.id ? 'Hide history' : 'History'}</button>
            </div>
          </div>

          {openId === st.id && <History studentId={st.id} />}

          <div style={{ marginTop: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {confirmRemove === st.id ? (
              <>
                <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Remove from your list? Past sessions are kept.</span>
                <button onClick={() => remove(st.id)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, remove</button>
                <button onClick={() => setConfirmRemove(null)} style={ghostBtn}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmRemove(st.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Remove</button>
            )}
          </div>
        </div>
      ))}
    </StudentPage>
  )
}
