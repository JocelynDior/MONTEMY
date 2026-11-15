import React from 'react'
import { useT } from '../../i18n/index.js'
import { dayKey, monthGrid } from '../events/eventUtils'
import { iconPathsFor } from './eventTypes'
import { panel, panelTitle } from '../parent/parentUi'

// A tiny static line-icon drawn straight from an array of SVG path "d" strings (see eventTypes.js).
function TypeDot({ type, size = 12 }) {
  const paths = iconPathsFor(type)
  if (!paths) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

// One month, as a 7-column grid. `entries` is the whole year's date -> entries[] map (YearCalendar
// loads it once for every open month); this card just reads the days that fall inside its own month.
export default function MonthCard({ year, month, entries, onDayClick }) {
  const t = useT()
  const first = new Date(year, month - 1, 1)
  const grid = monthGrid(first)
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const weekdayLabels = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(k => t(`shared.events.day_${k}`))

  return (
    <div style={panel}>
      <h3 style={panelTitle}>{monthLabel}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 'clamp(2px, 0.6vw, 6px)' }}>
        {weekdayLabels.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', padding: '0.2rem 0' }}>{w}</div>
        ))}
        {grid.map(d => {
          const iso = dayKey(d)
          const inMonth = d.getMonth() === month - 1
          const isToday = dayKey(new Date()) === iso
          const dayEntries = entries[iso] || []
          const types = [...new Set(dayEntries.map(e => e.type))].slice(0, 3)
          return (
            <button key={iso} onClick={() => onDayClick(iso)}
              aria-label={d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              style={{
                aspectRatio: '1', minHeight: '2.2rem', borderRadius: '0.5rem', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem',
                background: isToday ? 'rgba(128,128,128,0.22)' : 'transparent',
                border: isToday ? '1px solid var(--color-primary)' : '1px solid transparent',
                opacity: inMonth ? 1 : 0.35,
                color: 'var(--fg)',
                fontFamily: 'inherit',
              }}>
              <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
              {types.length > 0 && (
                <span style={{ display: 'flex', gap: '0.15rem' }}>
                  {types.map(ty => <TypeDot key={ty} type={ty} size={10} />)}
                  {dayEntries.length > types.length && <span style={{ fontSize: '0.55rem' }}>+</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
