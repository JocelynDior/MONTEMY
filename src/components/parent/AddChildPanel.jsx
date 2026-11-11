import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { fmtDate } from '../student/studentUtils'
import { gradeLabel } from '../../config/studentOptions'
import { glassInput } from '../../styles/glass'
import { useT } from '../../i18n'
import { Chip, ghostBtn, muted, panel, panelTitle, smallBtn } from './parentUi'

const note = { fontSize: 'var(--fs-sm)', marginTop: '0.75rem', overflowWrap: 'anywhere' }

// Search for a child at the parent's school and ask to be linked. Also lists waiting/declined requests.
export default function AddChildPanel({ requests, isVerified, onChanged, startOpen = false }) {
  const t = useT()
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
      setMessage(t('parent.requestSent', { name: student.name }))
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

  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0 }

  return (
    <div style={panel}>
      <div style={{ ...row, gap: '1rem' }}>
        <h3 style={{ ...panelTitle, marginBottom: 0 }}>{t('parent.linkChild')}</h3>
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={ghostBtn}>{open ? t('common.close') : t('parent.addChild')}</button>
      </div>

      {requests.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
          {requests.map(r => (
            <div key={r.id} style={row}>
              <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <strong>{r.studentName}</strong>
                <span style={{ ...muted, fontSize: 'var(--fs-xs)' }}>
                  {r.grade ? ` · ${gradeLabel(r.grade, t)}` : ''} · {t('parent.sentOn', { date: fmtDate(r.createdAt, false) })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {r.status === 'pending'
                  ? <><Chip>{t('parent.waiting')}</Chip>
                      <button disabled={busyId === r.id} onClick={() => cancel(r.id)} style={ghostBtn}>{t('common.cancel')}</button></>
                  : <Chip color="var(--fg-muted)">{t('parent.declined')}</Chip>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '1rem' }}>
          {!isVerified && <p style={{ ...muted, marginBottom: '0.75rem', color: 'var(--fg)' }}>{t('parent.needsVerification')}</p>}
          <input value={query} onChange={e => setQuery(e.target.value)} disabled={!isVerified}
            placeholder={t('parent.searchPlaceholder')} style={glassInput} aria-label={t('parent.searchLabel')} />
          <p style={{ ...muted, fontSize: 'var(--fs-xs)', marginTop: '0.4rem' }}>{t('parent.searchHelp')}</p>

          {searching && <p style={{ ...muted, marginTop: '0.75rem' }}>{t('parent.searching')}</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && !error && (
            <p style={{ ...muted, marginTop: '0.75rem' }}>{t('parent.noStudentsFound')}</p>
          )}

          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
            {results.map(s => (
              <div key={s.id} style={row}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{s.name}{s.grade ? <span style={muted}> · {gradeLabel(s.grade, t)}</span> : null}</span>
                {s.status === 'linked' ? <Chip>{t('parent.linked')}</Chip>
                  : s.status === 'pending' ? <Chip>{t('parent.waiting')}</Chip>
                  : s.status === 'rejected' ? <Chip color="var(--fg-muted)">{t('parent.declined')}</Chip>
                  : <button disabled={busyId === s.id} onClick={() => sendRequest(s)} style={smallBtn}>
                      {busyId === s.id ? t('parent.sending') : t('parent.sendRequest')}
                    </button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <p role="status" style={note}>{message}</p>}
      {error && <p role="alert" style={note}>{error}</p>}
    </div>
  )
}
