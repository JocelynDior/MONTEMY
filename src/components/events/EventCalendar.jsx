import React, { useMemo } from 'react'
import { muted, panel } from '../parent/parentUi'
import { C } from '../../styles/glass'
import { DAY_SHORT, TYPE_COLORS, addDays, dayKey, fmtTime, groupByDay, monthGrid, startOfWeek } from './eventUtils'

const cell = (isToday, isSelected, dim) => ({
  minHeight: '5.2rem', padding: '0.35rem', borderRadius: '10px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'white',
  background: isSelected ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(255,255,255,0.05)',
  border: isToday ? `1px solid ${C.turquoise}` : isSelected ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(255,255,255,0.1)',
  opacity: dim ? 0.45 : 1, overflow: 'hidden',
})

// Month or week grid. Clicking a day selects it; the page shows that day's events below.
export default function EventCalendar({ mode, cursor, events, selected, onSelect }) {
  const byDay = useMemo(() => groupByDay(events), [events])
  const todayKey = dayKey(new Date())

  const days = mode === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
    : monthGrid(cursor)

  return (
    <div style={{ ...panel, padding: '0.9rem', marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.3rem', marginBottom: '0.3rem' }}>
        {DAY_SHORT.map(d => <div key={d} style={{ ...muted, fontSize: '0.75rem', textAlign: 'center' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.3rem' }}>
        {days.map(d => {
          const k = dayKey(d)
          const evs = byDay[k] || []
          const shown = mode === 'week' ? evs : evs.slice(0, 2)
          const dim = mode === 'month' && d.getMonth() !== cursor.getMonth()
          return (
            <button key={k} onClick={() => onSelect(k)} aria-label={`${d.toDateString()}, ${evs.length} events`}
              style={{ ...cell(k === todayKey, k === selected, dim), minHeight: mode === 'week' ? '9rem' : '5.2rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: k === todayKey ? 700 : 400, color: k === todayKey ? C.turquoise : 'white' }}>{d.getDate()}</div>
              {shown.map(e => (
                <div key={e.id} title={e.title}
                  style={{ marginTop: '0.2rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${TYPE_COLORS[e.type] || '#8fd3ff'}` }}>
                  {mode === 'week' ? `${fmtTime(e.date)} ` : ''}{e.title}
                </div>
              ))}
              {mode === 'month' && evs.length > 2 && <div style={{ ...muted, fontSize: '0.7rem', marginTop: '0.2rem' }}>+{evs.length - 2} more</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
