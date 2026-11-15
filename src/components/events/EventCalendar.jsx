import React, { useMemo } from 'react'
import { useT } from '../../i18n/index.js'
import { muted, panel } from '../parent/parentUi'
import { DAY_SHORT_KEYS, addDays, dayKey, fmtTime, groupByDay, monthGrid, startOfWeek, typeStyle } from './eventUtils'

const cell = (isToday, isSelected, dim) => ({
  minHeight: '5.2rem', padding: '0.35rem', borderRadius: '0.625rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--fg)',
  background: isSelected ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(128,128,128,0.08)',
  border: isToday ? '1px solid var(--color-primary)' : isSelected ? '1px solid rgba(var(--color-primary-rgb),0.9)' : '1px solid rgba(128,128,128,0.2)',
  opacity: dim ? 0.45 : 1, overflow: 'hidden', minWidth: 0,
})

// Month or week grid. Clicking a day selects it; the page shows that day's events below.
export default function EventCalendar({ mode, cursor, events, selected, onSelect }) {
  const t = useT()
  const byDay = useMemo(() => groupByDay(events), [events])
  const todayKey = dayKey(new Date())

  const days = mode === 'week'
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
    : monthGrid(cursor)

  return (
    <div style={{ ...panel, padding: '0.9rem', marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.3rem', marginBottom: '0.3rem' }}>
        {DAY_SHORT_KEYS.map(d => <div key={d} style={{ ...muted, fontSize: '0.75rem', textAlign: 'center' }}>{t(`shared.events.day_${d}`)}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.3rem' }}>
        {days.map(d => {
          const k = dayKey(d)
          const evs = byDay[k] || []
          const shown = mode === 'week' ? evs : evs.slice(0, 2)
          const dim = mode === 'month' && d.getMonth() !== cursor.getMonth()
          return (
            <button key={k} onClick={() => onSelect(k)} aria-label={t('shared.events.dayAriaLabel', { date: d.toDateString(), count: evs.length })}
              style={{ ...cell(k === todayKey, k === selected, dim), minHeight: mode === 'week' ? '9rem' : '5.2rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: k === todayKey ? 700 : 400, color: k === todayKey ? 'var(--color-primary)' : 'var(--fg)' }}>{d.getDate()}</div>
              {shown.map(e => {
                const st = typeStyle(e.type)
                return (
                  <div key={e.id} title={e.title}
                    style={{ marginTop: '0.2rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...st }}>
                    {mode === 'week' ? `${fmtTime(e.date)} ` : ''}{e.title}
                  </div>
                )
              })}
              {mode === 'month' && evs.length > 2 && <div style={{ ...muted, fontSize: '0.7rem', marginTop: '0.2rem' }}>{t('shared.events.more', { count: evs.length - 2 })}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
