import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import Icon from '../../components/shared/Icon'
import SkeletonList from '../../components/shared/Skeleton'
import { ErrorBox, ghostBtn, muted, panel, panelTitle, smallBtn } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import { apiFetch } from '../../api/apiClient'
import { useT } from '../../i18n'
import { useOrgTerms } from '../../hooks/useOrgTerms'
import { glassBtn, glassCard, glassInput } from '../../styles/glass'
import { fmtDate } from '../../components/student/studentUtils'

/* ------------------------------------------------------------------ Search/add panel */
function AddStudentPanel({ onAdded, t }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [err, setErr] = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true); setErr(null); setResults(null)
    try {
      const res = await apiFetch(`/api/tutor/students/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setResults(json.results || [])
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setSearching(false)
    }
  }

  async function add(studentId) {
    setAdding(studentId); setErr(null)
    try {
      const res = await apiFetch('/api/tutor/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
      if (!res.ok) throw new Error(await res.text())
      setResults(null); setQuery('')
      onAdded()
    } catch (ex) {
      setErr(ex.message || t('common.somethingWentWrong'))
    } finally {
      setAdding(null)
    }
  }

  return (
    <div style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      <div style={{ fontWeight: 700, marginBottom: 'var(--sp-3)' }}>{t('tutor.addStudent')}</div>
      {err && <ErrorBox message={err} />}
      <form onSubmit={search} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('tutor.searchStudentPlaceholder')}
          style={{ ...glassInput, flex: 1, minWidth: '12rem' }}
          aria-label={t('common.search')}
        />
        <button type="submit" disabled={searching} style={glassBtn}>
          {searching ? t('common.loading') : <Icon name="search" size={14} />}
        </button>
      </form>
      {results !== null && (
        results.length === 0
          ? <p style={muted}>{t('tutor.noStudentsFound')}</p>
          : results.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflowWrap: 'break-word' }}>{s.name}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)' }}>{s.grade} {s.schoolName}</div>
                </div>
                <button
                  style={smallBtn}
                  onClick={() => add(s.id)}
                  disabled={adding === s.id}
                  aria-label={t('tutor.addStudentLabel', { name: s.name })}
                >
                  {adding === s.id ? t('common.loading') : t('common.add')}
                </button>
              </div>
            ))
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ History view */
function StudentHistory({ studentId, studentName, onClose, t }) {
  const { data, loading, error, reload } = useApiData(`/api/tutor/sessions?studentId=${studentId}`)

  return (
    <div style={{ ...glassCard, padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <span style={{ flex: 1, fontWeight: 700, overflowWrap: 'break-word' }}>{t('tutor.historyFor', { name: studentName })}</span>
        <button style={ghostBtn} onClick={onClose} aria-label={t('common.close')}><Icon name="close" size={16} /></button>
      </div>
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        data.sessions?.length
          ? data.sessions.map((s) => (
              <div key={s.id} style={{ padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--fs-sm)' }}>
                <div style={{ fontWeight: 500 }}>{fmtDate(s.startsAt)}{s.subject ? ` · ${s.subject}` : ''}</div>
                {s.notes && <div style={{ color: 'var(--fg-muted)', marginTop: '0.2rem', overflowWrap: 'break-word' }}>{s.notes}</div>}
              </div>
            ))
          : <p style={muted}>{t('tutor.noSessionHistory')}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ main */
export default function TutorStudents() {
  const t = useT('tutor')
  const { pick } = useOrgTerms()
  const { data, loading, error, reload } = useApiData('/api/tutor/students')
  const [showAdd, setShowAdd] = useState(false)
  const [history, setHistory] = useState(null) // { id, name }
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [removing, setRemoving] = useState(null)

  async function remove(studentId) {
    setRemoving(studentId)
    try {
      const res = await apiFetch(`/api/tutor/students/${studentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setConfirmRemove(null)
      reload()
    } catch {
      reload()
    } finally {
      setRemoving(null)
    }
  }

  const students = data?.students || []

  return (
    <StudentPage title={pick(t('tutor.myStudentsFirm'), t('tutor.myStudents'))} backPath="/tutor/dashboard">
      {loading && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data?.isVerified && !showAdd && (
        <button
          style={{ ...glassBtn, marginBottom: 'var(--sp-4)', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          onClick={() => setShowAdd(true)}
        >
          <Icon name="plus" size={14} /> {t('tutor.addStudent')}
        </button>
      )}

      {showAdd && (
        <AddStudentPanel
          onAdded={() => { setShowAdd(false); reload() }}
          t={t}
        />
      )}

      {history && (
        <StudentHistory
          studentId={history.id}
          studentName={history.name}
          onClose={() => setHistory(null)}
          t={t}
        />
      )}

      {students.length === 0 && !showAdd && (
        <p style={muted}>{pick(t('tutor.noStudentsFirm'), t('tutor.noStudents'))}</p>
      )}

      {students.map((s) => (
        <div key={s.id} style={{ ...panel, marginBottom: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflowWrap: 'break-word' }}>{s.name}</div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)', marginTop: '0.1rem' }}>
                {s.grade}{s.schoolName ? ` · ${s.schoolName}` : ''}
              </div>
            </div>
            <button
              style={ghostBtn}
              onClick={() => setHistory(history?.id === s.id ? null : { id: s.id, name: s.name })}
              aria-label={t('tutor.viewHistory')}
            >
              <Icon name="eye" size={14} />
            </button>
            {confirmRemove === s.id ? (
              <>
                <button
                  style={smallBtn}
                  onClick={() => remove(s.id)}
                  disabled={removing === s.id}
                  aria-label={t('common.confirm')}
                >
                  <Icon name="check" size={14} />
                </button>
                <button style={ghostBtn} onClick={() => setConfirmRemove(null)} aria-label={t('common.cancel')}>
                  <Icon name="close" size={14} />
                </button>
              </>
            ) : (
              <button style={ghostBtn} onClick={() => setConfirmRemove(s.id)} aria-label={t('tutor.removeStudent')}>
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
          {s.sessionCount != null && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--fg-muted)', marginTop: 'var(--sp-1)' }}>
              {t('tutor.sessionCount', { n: s.sessionCount })}
            </div>
          )}
        </div>
      ))}
    </StudentPage>
  )
}
