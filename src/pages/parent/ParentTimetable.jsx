import React, { useState } from 'react'
import { ChildPage } from '../../components/parent/ChildSwitcher'
import { Chip, ErrorBox, ghostBtn, muted, panel } from '../../components/parent/parentUi'
import SkeletonList from '../../components/shared/Skeleton'
import Icon from '../../components/shared/Icon'
import { useApiData } from '../../hooks/useApiData'
import { useT } from '../../i18n'
import { addDays, mondayOf } from '../../components/timetable/ttUtils'
import { fmtDay } from '../../components/student/studentUtils'
import { subjectLabel } from '../../config/studentOptions'

const cell = { border: '1px solid var(--border)', padding: '0.35rem', verticalAlign: 'top', height: '4.4rem', minWidth: 0 }

// Weekday and short date in the user's language, from a plain 'YYYY-MM-DD'
function dayHead(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined
  let weekday = ''
  let short = ''
  try {
    weekday = date.toLocaleDateString(lang, { weekday: 'short' })
    short = date.toLocaleDateString(lang, { day: 'numeric', month: 'short' })
  } catch { weekday = date.toDateString().slice(0, 3); short = String(d) }
  return { weekday, short }
}

function Week({ childId }) {
  const t = useT()
  const [weekStart, setWeekStart] = useState(() => mondayOf())
  const { data, loading, error, reload } = useApiData(`/api/parent/children/${childId}/timetable?weekStart=${weekStart}`)

  const nav = (
    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button aria-label={t('parent.prevWeek')} onClick={() => setWeekStart(w => addDays(w, -7))} style={ghostBtn}><Icon name="chevron" style={{ transform: 'scaleX(-1)' }} /></button>
        <button onClick={() => setWeekStart(mondayOf())} style={ghostBtn}>{t('parent.thisWeek')}</button>
        <button aria-label={t('parent.nextWeek')} onClick={() => setWeekStart(w => addDays(w, 7))} style={ghostBtn}><Icon name="chevron" /></button>
      </div>
      <span style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{fmtDay(weekStart, false)} – {fmtDay(addDays(weekStart, 6), false)}</span>
    </div>
  )

  if (error) return <>{nav}<ErrorBox message={error} onRetry={reload} /></>
  if (loading && !data) return <>{nav}<SkeletonList /></>
  if (!data) return null
  if (!data.className) return <div style={{ ...panel, ...muted, textAlign: 'center', padding: 'var(--sp-6) var(--sp-4)' }}>{t('parent.childNoClass')}</div>

  const showSat = data.slots.some(s => s.day === 6)
  const dayCount = showSat ? 6 : 5
  const cells = {}
  for (const s of data.slots) cells[`${s.day}-${s.period}`] = s
  const holidayOn = (iso) => (data.terms || []).find(x => x.kind === 'holiday' && x.startDate <= iso && iso <= x.endDate)

  return (
    <div style={{ minWidth: 0 }}>
      {nav}
      <h3 style={{ marginBottom: '0.5rem' }}>{t('parent.classTimetable', { class: data.className })}</h3>
      {data.terms.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {data.terms.map(x => <Chip key={x.id} color={x.kind === 'holiday' ? 'var(--fg)' : 'var(--fg-muted)'}>{x.title}</Chip>)}
        </div>
      )}
      {data.slots.length === 0 && <p style={{ ...muted, marginBottom: '0.75rem' }}>{t('parent.noLessons')}</p>}

      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ width: '100%', minWidth: '40rem', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...cell, height: 'auto', width: '6.5rem' }} />
              {Array.from({ length: dayCount }, (_, i) => {
                const iso = addDays(weekStart, i)
                const head = dayHead(iso)
                const hol = holidayOn(iso)
                return (
                  <th key={iso} scope="col" style={{ ...cell, height: 'auto', textAlign: 'start', background: 'var(--surface-2)' }}>
                    <div>{head.weekday}</div>
                    <div style={{ ...muted, fontSize: 'var(--fs-xs)', fontWeight: 400 }}>{head.short}</div>
                    {hol && <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{hol.title}</div>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.periods.map(p => (
              <tr key={p.period}>
                <th scope="row" style={{ ...cell, height: p.isBreak ? '2.2rem' : cell.height, textAlign: 'start', fontSize: 'var(--fs-xs)' }}>
                  {p.label}
                  <div style={{ ...muted, fontSize: 'var(--fs-xs)', fontWeight: 400 }}>{p.start}–{p.end}</div>
                </th>
                {p.isBreak ? (
                  <td colSpan={dayCount} style={{ ...cell, height: '2.2rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 'var(--fs-xs)', background: 'var(--surface-2)' }}>{p.label}</td>
                ) : Array.from({ length: dayCount }, (_, i) => {
                  const s = cells[`${i + 1}-${p.period}`]
                  return (
                    <td key={i} style={cell}>
                      {s && (
                        <div style={{ height: '100%', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.45rem', fontSize: 'var(--fs-xs)', lineHeight: 1.3, border: '1px solid var(--border-strong)', borderInlineStart: '4px solid var(--fg)', background: 'var(--surface-2)', overflow: 'hidden', overflowWrap: 'anywhere' }}>
                          <div style={{ fontWeight: 700 }}>{subjectLabel(s.subject, t)}</div>
                          {s.teacherName && <div style={{ color: 'var(--fg-muted)' }}>{s.teacherName}</div>}
                          {s.room && <div style={{ color: 'var(--fg-muted)' }}>{t('parent.room', { room: s.room })}</div>}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ParentTimetable() {
  const t = useT()
  return (
    <ChildPage title={t('shell.f_timetable')} icon="calendar">
      {({ childId }) => <Week childId={childId} />}
    </ChildPage>
  )
}
