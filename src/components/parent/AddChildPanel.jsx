import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { fmtDate } from '../student/studentUtils'
import { glassInput } from '../../styles/glass'
import { Chip, ghostBtn, muted, panel, panelTitle, smallBtn } from './parentUi'

// Search for a child at the parent's school and ask to be linked. Also lists waiting/declined requests.
export default function AddChildPanel({ requests, isVerified, onChanged, startOpen = false }) {
  const [open, setOpen] = useState(startOpen)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Search 400ms after the parent stops typing
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/parent/students/search?q=${encodeURIComponent(q)}`)
        if (!cancelled) { setResults(data.students); setError('') }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, open])

  const sendRequest = async (student) => {
    setBusyId(student.id); setError(''); setMessage('')
    try {
      await apiFetch('/api/parent/link-requests', { method: 'POST', body: { studentId: student.id } })
      setMessage(`Request sent. ${student.name} (or a school admin) needs to accept it before you can see their progress.`)
      setResults(list => list.map(s => s.id === student.id ? { ...s, status: 'pending' } : s))
      onChanged?.()
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  const cancel = async (id) => {
    setBusyId(id); setError(''); setMessage('')
    try {
      await apiFetch(`/api/parent/link-requests/${id}`, { method: 'DELETE' })
      onChanged?.()
    } catch (err) {
      setError(err.message)
    }
    setBusyId(null)
  }

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h3 style={{ ...panelTitle, marginBottom: 0 }}>Link a child</h3>
        <button onClick={() => setOpen(o => !o)} style={ghostBtn}>{open ? 'Close' : 'Add a child'}</button>
      </div>

      {requests.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
          {requests.map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <strong>{r.studentName}</strong>
                <span style={{ ...muted, fontSize: '0.8rem' }}>{r.grade ? ` · Grade ${r.grade}` : ''} · sent {fmtDate(r.createdAt, false)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {r.status === 'pending'
                  ? <><Chip color="#ffe08a">Waiting for approval</Chip>
                      <button disabled={busyId === r.id} onClick={() => cancel(r.id)} style={ghostBtn}>Cancel</button></>
                  : <Chip color="#ff8f8f">Declined</Chip>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '1rem' }}>
          {!isVerified && (
            <p style={{ ...muted, color: '#ffe08a', marginBottom: '0.75rem' }}>
              Your account needs to be verified by an admin before you can link a child.
            </p>
          )}
          <input value={query} onChange={e => setQuery(e.target.value)} disabled={!isVerified}
            placeholder="Type your child's name (at least 2 letters)"
            style={glassInput} aria-label="Search for your child by name" />
          <p style={{ ...muted, fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Only students at your school are shown. Your child or a school admin must accept your request.
          </p>

          {searching && <p style={{ ...muted, marginTop: '0.75rem' }}>Searching...</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && !error && (
            <p style={{ ...muted, marginTop: '0.75rem' }}>No students found with that name at your school.</p>
          )}

          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
            {results.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{s.name}{s.grade ? <span style={muted}> · Grade {s.grade}</span> : null}</span>
                {s.status === 'linked' ? <Chip color="#7CFC9A">Linked</Chip>
                  : s.status === 'pending' ? <Chip color="#ffe08a">Waiting for approval</Chip>
                  : s.status === 'rejected' ? <Chip color="#ff8f8f">Declined</Chip>
                  : <button disabled={busyId === s.id} onClick={() => sendRequest(s)} style={smallBtn}>
                      {busyId === s.id ? 'Sending...' : 'Send request'}
                    </button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <p style={{ color: '#7CFC9A', fontSize: '0.9rem', marginTop: '0.75rem' }}>{message}</p>}
      {error && <p style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
    </div>
  )
}
