import React, { useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { glassInput } from '../../styles/glass'
import { ghostBtn, muted, panel, panelTitle, smallBtn } from '../parent/parentUi'

const small = { ...glassInput, padding: '0.45rem 0.6rem', fontSize: '0.9rem' }

// Principal: the school's bell times. Rows are periods in order; a row can be marked as a break.
export default function PeriodsEditor({ meta, onSaved }) {
  const [rows, setRows] = useState(() => meta.periods.map(p => ({ ...p })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const edit = (i, k, v) => { setRows(r => r.map((row, j) => (j === i ? { ...row, [k]: v } : row))); setOk('') }
  const add = () => {
    const last = rows[rows.length - 1]
    const next = (last?.period || 0) + 1
    if (next > 12) return
    setRows(r => [...r, { period: next, label: `Period ${next}`, start: last?.end || '08:00', end: last?.end || '08:45', isBreak: false }])
    setOk('')
  }
  const removeLast = () => { setRows(r => r.slice(0, -1)); setOk('') }

  const save = async () => {
    setSaving(true)
    setError('')
    setOk('')
    try {
      await apiFetch('/api/principal/timetable/periods', { method: 'PUT', body: { periods: rows } })
      setOk('Periods saved.')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={panel}>
      <h3 style={panelTitle}>Periods and break times</h3>
      <p style={{ ...muted, marginBottom: '1rem' }}>These are the rows of every timetable at your school. Tick Break for tea or lunch; lessons cannot be placed in a break.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '560px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
              <th style={{ padding: '0.3rem' }}>#</th><th>Name</th><th>Starts</th><th>Ends</th><th>Break</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.period}>
                <td style={{ padding: '0.3rem' }}>{r.period}</td>
                <td style={{ padding: '0.3rem' }}><input aria-label={`Name of period ${r.period}`} value={r.label} maxLength={30} onChange={e => edit(i, 'label', e.target.value)} style={small} /></td>
                <td style={{ padding: '0.3rem' }}><input aria-label={`Start of period ${r.period}`} type="time" value={r.start} onChange={e => edit(i, 'start', e.target.value)} style={small} /></td>
                <td style={{ padding: '0.3rem' }}><input aria-label={`End of period ${r.period}`} type="time" value={r.end} onChange={e => edit(i, 'end', e.target.value)} style={small} /></td>
                <td style={{ padding: '0.3rem' }}><input aria-label={`Period ${r.period} is a break`} type="checkbox" checked={r.isBreak} onChange={e => edit(i, 'isBreak', e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
      {ok && <p role="status" style={{ color: '#7CFC9A', fontSize: '0.9rem', marginTop: '0.75rem' }}>{ok}</p>}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button disabled={saving} onClick={save} style={smallBtn}>{saving ? 'Saving...' : 'Save periods'}</button>
        <button disabled={saving || rows.length >= 12} onClick={add} style={ghostBtn}>Add a period</button>
        <button disabled={saving || rows.length <= 1} onClick={removeLast} style={ghostBtn}>Remove last</button>
      </div>
    </div>
  )
}
