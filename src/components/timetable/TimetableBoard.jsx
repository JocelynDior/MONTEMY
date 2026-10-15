import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../parent/parentUi'
import LessonEditor from './LessonEditor'
import { DAY_NAMES, addDays, eventsOn, fmtTerm, holidayOn, mondayOf, subjectColor, weekLabel } from './ttUtils'

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .tt-print, .tt-print * { visibility: visible !important; color: #000 !important; background: transparent !important;
    border-color: #888 !important; box-shadow: none !important; text-shadow: none !important; }
  .tt-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  .no-print { display: none !important; }
  @page { size: landscape; margin: 12mm; }
}`

const cellBase = { border: '1px solid rgba(255,255,255,0.14)', padding: '0.35rem', verticalAlign: 'top', height: '4.6rem' }

function Lesson({ slot, showClass, showTeacher, onOpen, onDragStart, onDragEnd, dimmed }) {
  const h = subjectColor(slot.subject)
  const open = () => slot.editable && onOpen(slot)
  return (
    <div
      role={slot.editable ? 'button' : undefined}
      tabIndex={slot.editable ? 0 : undefined}
      aria-label={`${slot.subject}${showClass ? `, ${slot.className}` : ''}${slot.room ? `, room ${slot.room}` : ''}${slot.editable ? ', press to edit' : ''}`}
      draggable={slot.editable}
      onDragStart={slot.editable ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', slot.id); onDragStart(slot) } : undefined}
      onDragEnd={onDragEnd}
      onClick={open}
      onKeyDown={(e) => { if (slot.editable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open() } }}
      style={{
        height: '100%', borderRadius: '8px', padding: '0.35rem 0.5rem', fontSize: '0.8rem', lineHeight: 1.3,
        background: `hsla(${h}, 70%, 55%, 0.22)`, borderLeft: `4px solid hsl(${h}, 70%, 60%)`,
        cursor: slot.editable ? 'grab' : 'default', opacity: dimmed ? 0.45 : 1, overflow: 'hidden',
      }}>
      <div style={{ fontWeight: 700 }}>{slot.subject}</div>
      {showClass && <div style={{ color: 'rgba(255,255,255,0.8)' }}>{slot.className}</div>}
      {showTeacher && slot.teacherName && <div style={{ color: 'rgba(255,255,255,0.8)' }}>{slot.teacherName}</div>}
      {slot.room && <div style={{ color: 'rgba(255,255,255,0.65)' }}>Room {slot.room}</div>}
    </div>
  )
}

function Board({ meta }) {
  const isStudent = meta.role === 'student'
  const initialView = useMemo(() => {
    if (isStudent) return { type: 'class', id: meta.myClassId }
    if (meta.role === 'teacher') return { type: 'teacher', id: meta.userId }
    return meta.classes[0] ? { type: 'class', id: meta.classes[0].id } : null
  }, [isStudent, meta])

  const [view, setView] = useState(initialView)
  const [weekStart, setWeekStart] = useState(() => mondayOf())
  const [editor, setEditor] = useState(null)
  const [message, setMessage] = useState({ kind: '', text: '' })
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState('')
  const dragging = useRef(null)

  const path = isStudent
    ? (meta.myClassId ? `/api/timetable?weekStart=${weekStart}` : null)
    : view ? `/api/timetable?weekStart=${weekStart}&${view.type === 'class' ? 'classId' : 'teacherId'}=${view.id}` : null
  const { data, loading, error, reload } = useApiData(path)

  // Only show Saturday when a lesson is on it
  const showSat = (data?.slots || []).some(s => s.day === 6)
  const days = DAY_NAMES.slice(0, showSat ? 6 : 5)
  const cells = useMemo(() => {
    const m = {}
    for (const s of data?.slots || []) m[`${s.day}-${s.period}`] = s
    return m
  }, [data])
  const subjectHints = useMemo(() => [...new Set((data?.slots || []).map(s => s.subject))].sort(), [data])

  useEffect(() => { if (message.kind === 'ok') { const t = setTimeout(() => setMessage({ kind: '', text: '' }), 4000); return () => clearTimeout(t) } }, [message])

  const viewedClass = view?.type === 'class' ? meta.classes.find(c => c.id === view.id) : null
  const canAddHere = meta.canEdit && (
    meta.role === 'principal' ||
    (meta.role === 'teacher' && (view?.type === 'teacher' ? view.id === meta.userId : !!viewedClass?.mine))
  )

  const viewValue = view ? `${view.type === 'class' ? 'c' : 't'}:${view.id}` : ''
  const changeView = (e) => {
    const [t, id] = e.target.value.split(':')
    setView({ type: t === 'c' ? 'class' : 'teacher', id })
    setEditor(null)
  }
  const viewTitle = isStudent
    ? `Class ${meta.classes[0]?.name || ''}`
    : view?.type === 'class' ? `Class ${viewedClass?.name || ''}`
      : view?.id === meta.userId ? 'My timetable' : `Timetable: ${meta.teachers.find(t => t.id === view?.id)?.name || 'Teacher'}`

  const afterSave = () => { setEditor(null); setMessage({ kind: 'ok', text: 'Timetable updated.' }); reload() }

  const drop = async (e, day, period) => {
    e.preventDefault()
    const s = dragging.current
    dragging.current = null
    setOver('')
    if (!s || (s.day === day && s.period === period)) return
    setBusy(true)
    setMessage({ kind: '', text: '' })
    try {
      await apiFetch(`/api/timetable/slots/${s.id}`, {
        method: 'PUT',
        body: { classId: s.classId, day, period, subject: s.subject, teacherId: s.teacherId, room: s.room },
      })
      setMessage({ kind: 'ok', text: `Moved ${s.subject} to ${DAY_NAMES[day - 1]}, ${meta.periods.find(p => p.period === period)?.label}.` })
      reload()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (!isStudent && !view) {
    return <div style={{ ...panel, ...muted }}>There are no classes in your school yet, so there is no timetable to show.</div>
  }
  if (isStudent && !meta.myClassId) {
    return <div style={{ ...panel, ...muted }}>Choose your class under My Academics, Subjects. Your timetable will show here once you have.</div>
  }

  const holidays = (data?.terms || [])
  const emptyAll = data && data.slots.length === 0

  return (
    <div>
      <style>{PRINT_CSS}</style>

      <div className="no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        {!isStudent && (
          <select aria-label="Whose timetable" value={viewValue} onChange={changeView} style={{ ...glassInput, width: 'auto', minWidth: '12rem', padding: '0.55rem 0.9rem', fontSize: '0.9rem' }}>
            {meta.role === 'teacher' && <option value={`t:${meta.userId}`} style={{ color: '#000' }}>My timetable</option>}
            <optgroup label="Classes" style={{ color: '#000' }}>
              {meta.classes.map(c => <option key={c.id} value={`c:${c.id}`} style={{ color: '#000' }}>{c.name}{c.mine ? ' (mine)' : ''}</option>)}
            </optgroup>
            {meta.teachers.length > 0 && (
              <optgroup label="Teachers" style={{ color: '#000' }}>
                {meta.teachers.filter(t => !(meta.role === 'teacher' && t.id === meta.userId)).map(t => <option key={t.id} value={`t:${t.id}`} style={{ color: '#000' }}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
        )}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button aria-label="Previous week" onClick={() => setWeekStart(w => addDays(w, -7))} style={ghostBtn}>‹</button>
          <button onClick={() => setWeekStart(mondayOf())} style={ghostBtn}>This week</button>
          <button aria-label="Next week" onClick={() => setWeekStart(w => addDays(w, 7))} style={ghostBtn}>›</button>
        </div>
        <span style={{ fontWeight: 600 }}>{weekLabel(weekStart)}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {canAddHere && <button onClick={() => setEditor({ day: 1, period: meta.periods.find(p => !p.isBreak)?.period || 1, classId: viewedClass?.id })} style={smallBtn}>+ Add lesson</button>}
          <button onClick={() => window.print()} style={ghostBtn}>Print</button>
        </span>
      </div>

      {message.text && (
        <div role={message.kind === 'error' ? 'alert' : 'status'} className="no-print"
          style={{ ...panel, padding: '0.7rem 1rem', marginBottom: '1rem', color: message.kind === 'error' ? '#ffb3b3' : '#7CFC9A', borderColor: message.kind === 'error' ? 'rgba(255,80,80,0.4)' : 'rgba(124,252,154,0.4)' }}>
          {message.text}
        </div>
      )}

      {meta.canEdit && meta.periodsAreDefault && meta.role === 'principal' && (
        <p className="no-print" style={{ ...muted, marginBottom: '0.75rem' }}>These are the standard bell times. Open the Periods tab to set your school's own.</p>
      )}

      {editor && (
        <LessonEditor key={editor.id || `${editor.day}-${editor.period}-${editor.classId}`} meta={meta} initial={editor} subjectHints={subjectHints}
          onClose={() => setEditor(null)} onSaved={afterSave} />
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <p style={muted}>Loading the timetable...</p>}

      {data && (
        <div className="tt-print" style={{ opacity: busy ? 0.6 : 1 }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{viewTitle}<span style={{ ...muted, fontWeight: 400 }}> · {weekLabel(weekStart)}</span></h3>

          {holidays.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {holidays.map(t => <Chip key={t.id} color={t.kind === 'holiday' ? '#ffb36b' : '#8fd3ff'}>{t.title} · {fmtTerm(t)}</Chip>)}
            </div>
          )}

          {emptyAll && (
            <p className="no-print" style={{ ...muted, marginBottom: '0.75rem' }}>
              {canAddHere ? 'No lessons yet. Use Add lesson, or click an empty block in the grid.' : 'No lessons have been added to this timetable yet.'}
            </p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...cellBase, height: 'auto', width: '7.5rem' }} />
                  {days.map((name, i) => {
                    const iso = addDays(weekStart, i)
                    const hol = holidayOn(iso, data.terms)
                    const evs = eventsOn(iso, data.events)
                    return (
                      <th key={name} style={{ ...cellBase, height: 'auto', textAlign: 'left', background: hol ? 'rgba(255,179,107,0.12)' : 'rgba(255,255,255,0.05)' }}>
                        <div>{name}</div>
                        <div style={{ ...muted, fontSize: '0.75rem', fontWeight: 400 }}>{new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                        {hol && <div style={{ fontSize: '0.7rem', color: '#ffb36b' }}>{hol.title}</div>}
                        {evs.map(ev => (
                          <div key={ev.id} title={ev.location || ''} style={{ fontSize: '0.7rem', color: '#8fd3ff', fontWeight: 400 }}>
                            ● {ev.title}{ev.date ? ` ${new Date(ev.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </div>
                        ))}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {meta.periods.map(p => (
                  <tr key={p.period}>
                    <th scope="row" style={{ ...cellBase, height: p.isBreak ? '2.2rem' : cellBase.height, textAlign: 'left', fontWeight: 600, fontSize: '0.8rem' }}>
                      {p.label}
                      <div style={{ ...muted, fontSize: '0.72rem', fontWeight: 400 }}>{p.start}–{p.end}</div>
                    </th>
                    {p.isBreak ? (
                      <td colSpan={days.length} style={{ ...cellBase, height: '2.2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)' }}>{p.label}</td>
                    ) : days.map((name, i) => {
                      const day = i + 1
                      const iso = addDays(weekStart, i)
                      const hol = holidayOn(iso, data.terms)
                      const slot = cells[`${day}-${p.period}`]
                      const key = `${day}-${p.period}`
                      return (
                        <td key={key}
                          onDragOver={canAddHere || meta.canEdit ? (e) => { if (dragging.current) { e.preventDefault(); setOver(key) } } : undefined}
                          onDragLeave={() => setOver(o => (o === key ? '' : o))}
                          onDrop={(e) => drop(e, day, p.period)}
                          style={{ ...cellBase, background: over === key ? 'rgba(var(--color-primary-rgb),0.25)' : hol ? 'rgba(255,179,107,0.06)' : 'transparent' }}>
                          {slot ? (
                            <Lesson slot={slot} showClass={view?.type === 'teacher'} showTeacher={view?.type === 'class' || isStudent} dimmed={!!hol}
                              onOpen={(s) => setEditor({ id: s.id, classId: s.classId, day: s.day, period: s.period, subject: s.subject, teacherId: s.teacherId, room: s.room })}
                              onDragStart={(s) => { dragging.current = s }} onDragEnd={() => { dragging.current = null; setOver('') }} />
                          ) : canAddHere ? (
                            <button className="no-print" aria-label={`Add a lesson on ${name}, ${p.label}`}
                              onClick={() => setEditor({ day, period: p.period, classId: viewedClass?.id })}
                              style={{ width: '100%', height: '100%', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>+</button>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta.canEdit && <p className="no-print" style={{ ...muted, fontSize: '0.8rem', marginTop: '0.6rem' }}>Drag a lesson to another block to move it, or click it to edit. A teacher or room cannot be in two places at once.</p>}
        </div>
      )}
    </div>
  )
}

// Loads what the board needs, then draws it. Used on every role's schedule page.
export default function TimetableBoard() {
  const { data: meta, loading, error, reload } = useApiData('/api/timetable/meta')
  if (loading) return <p style={muted}>Loading...</p>
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!meta) return null
  return <Board meta={meta} />
}
export { Board }
