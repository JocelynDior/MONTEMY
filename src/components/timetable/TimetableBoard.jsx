import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { useApiData } from '../../hooks/useApiData'
import { glassInput } from '../../styles/glass'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../parent/parentUi'
import Icon from '../shared/Icon'
import LessonEditor from './LessonEditor'
import { DAY_KEYS, addDays, eventsOn, fmtTerm, holidayOn, mondayOf, subjectStyle, weekLabel } from './ttUtils'
import SkeletonList from '../../components/shared/Skeleton'

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .tt-print, .tt-print * { visibility: visible !important; color: #000 !important; background: transparent !important;
    border-color: #888 !important; box-shadow: none !important; text-shadow: none !important; }
  .tt-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  .no-print { display: none !important; }
  @page { size: landscape; margin: 12mm; }
}`

const cellBase = { border: '1px solid rgba(128,128,128,0.25)', padding: '0.35rem', verticalAlign: 'top', height: '4.6rem' }

function useNarrow() {
  const query = '(max-width: 760px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = (e) => setNarrow(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function Lesson({ slot, showClass, showTeacher, onOpen, onDragStart, onDragEnd, dimmed, t }) {
  const st = subjectStyle(slot.subject)
  const open = () => slot.editable && onOpen(slot)
  return (
    <div
      role={slot.editable ? 'button' : undefined}
      tabIndex={slot.editable ? 0 : undefined}
      aria-label={`${slot.subject}${showClass ? `, ${slot.className}` : ''}${slot.room ? `, ${t('shared.timetable.room')} ${slot.room}` : ''}${slot.editable ? `, ${t('shared.timetable.pressToEdit')}` : ''}`}
      draggable={slot.editable}
      onDragStart={slot.editable ? (e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', slot.id); onDragStart(slot) } : undefined}
      onDragEnd={onDragEnd}
      onClick={open}
      onKeyDown={(e) => { if (slot.editable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open() } }}
      style={{
        height: '100%', borderRadius: '0.5rem', padding: '0.35rem 0.5rem', fontSize: '0.8rem', lineHeight: 1.3,
        ...st, cursor: slot.editable ? 'grab' : 'default', opacity: dimmed ? 0.45 : 1, overflow: 'hidden', minWidth: 0,
      }}>
      <div style={{ fontWeight: 700 }}>{slot.subject}</div>
      {showClass && <div style={muted}>{slot.className}</div>}
      {showTeacher && slot.teacherName && <div style={muted}>{slot.teacherName}</div>}
      {slot.room && <div style={muted}>{t('shared.timetable.room')} {slot.room}</div>}
    </div>
  )
}

function Board({ meta }) {
  const t = useT()
  const narrow = useNarrow()
  const DAY_NAMES = DAY_KEYS.map(k => t(`shared.timetable.day_${k}`))
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
  const [dayIdx, setDayIdx] = useState(() => Math.min(new Date().getDay() === 0 ? 0 : new Date().getDay() - 1, 5))
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

  useEffect(() => { if (message.kind === 'ok') { const tm = setTimeout(() => setMessage({ kind: '', text: '' }), 4000); return () => clearTimeout(tm) } }, [message])

  const viewedClass = view?.type === 'class' ? meta.classes.find(c => c.id === view.id) : null
  const canAddHere = meta.canEdit && (
    meta.role === 'principal' ||
    (meta.role === 'teacher' && (view?.type === 'teacher' ? view.id === meta.userId : !!viewedClass?.mine))
  )

  const viewValue = view ? `${view.type === 'class' ? 'c' : 't'}:${view.id}` : ''
  const changeView = (e) => {
    const [ty, id] = e.target.value.split(':')
    setView({ type: ty === 'c' ? 'class' : 'teacher', id })
    setEditor(null)
  }
  const viewTitle = isStudent
    ? `${t('shared.timetable.classLabel')} ${meta.classes[0]?.name || ''}`
    : view?.type === 'class' ? `${t('shared.timetable.classLabel')} ${viewedClass?.name || ''}`
      : view?.id === meta.userId ? t('shared.timetable.myTimetable') : `${t('shared.timetable.title')}: ${meta.teachers.find(tc => tc.id === view?.id)?.name || t('shared.roles.teacher')}`

  const afterSave = () => { setEditor(null); setMessage({ kind: 'ok', text: t('shared.timetable.updated') }); reload() }

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
      setMessage({ kind: 'ok', text: t('shared.timetable.moved', { subject: s.subject, day: DAY_NAMES[day - 1], period: meta.periods.find(p => p.period === period)?.label }) })
      reload()
    } catch (err) {
      setMessage({ kind: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  if (!isStudent && !view) {
    return <div style={{ ...panel, ...muted }}>{t('shared.timetable.noClasses')}</div>
  }
  if (isStudent && !meta.myClassId) {
    return <div style={{ ...panel, ...muted }}>{t('shared.timetable.pickClassFirst')}</div>
  }

  const holidays = (data?.terms || [])
  const emptyAll = data && data.slots.length === 0

  const headerControls = (
    <div className="no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
      {!isStudent && (
        <select aria-label={t('shared.timetable.whoseTimetable')} value={viewValue} onChange={changeView} style={{ ...glassInput, width: 'auto', minWidth: '10rem', padding: '0.55rem 0.9rem', fontSize: '0.9rem' }}>
          {meta.role === 'teacher' && <option value={`t:${meta.userId}`} style={{ color: '#000' }}>{t('shared.timetable.myTimetable')}</option>}
          <optgroup label={t('shared.timetable.classesGroup')} style={{ color: '#000' }}>
            {meta.classes.map(c => <option key={c.id} value={`c:${c.id}`} style={{ color: '#000' }}>{c.name}{c.mine ? ` (${t('shared.timetable.mine')})` : ''}</option>)}
          </optgroup>
          {meta.teachers.length > 0 && (
            <optgroup label={t('shared.timetable.teachersGroup')} style={{ color: '#000' }}>
              {meta.teachers.filter(tc => !(meta.role === 'teacher' && tc.id === meta.userId)).map(tc => <option key={tc.id} value={`t:${tc.id}`} style={{ color: '#000' }}>{tc.name}</option>)}
            </optgroup>
          )}
        </select>
      )}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button aria-label={t('shared.previous')} onClick={() => setWeekStart(w => addDays(w, -7))} style={ghostBtn}><Icon name="chevron-left" size={14} /></button>
        <button onClick={() => setWeekStart(mondayOf())} style={ghostBtn}>{t('shared.timetable.thisWeek')}</button>
        <button aria-label={t('shared.next')} onClick={() => setWeekStart(w => addDays(w, 7))} style={ghostBtn}><Icon name="chevron" size={14} /></button>
      </div>
      <span style={{ fontWeight: 600 }}>{weekLabel(weekStart)}</span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {canAddHere && <button onClick={() => setEditor({ day: 1, period: meta.periods.find(p => !p.isBreak)?.period || 1, classId: viewedClass?.id })} style={smallBtn}><Icon name="plus" size={14} style={{ marginRight: '0.3rem' }} />{t('shared.timetable.addLesson')}</button>}
        <button onClick={() => window.print()} style={ghostBtn}>{t('shared.print')}</button>
      </span>
    </div>
  )

  return (
    <div>
      <style>{PRINT_CSS}</style>
      {headerControls}

      {message.text && (
        <div role={message.kind === 'error' ? 'alert' : 'status'} className="no-print"
          style={{ ...panel, padding: '0.7rem 1rem', marginBottom: '1rem', color: message.kind === 'error' ? '#ffb3b3' : '#7CFC9A', borderColor: message.kind === 'error' ? 'rgba(255,80,80,0.4)' : 'rgba(124,252,154,0.4)' }}>
          {message.text}
        </div>
      )}

      {meta.canEdit && meta.periodsAreDefault && meta.role === 'principal' && (
        <p className="no-print" style={{ ...muted, marginBottom: '0.75rem' }}>{t('shared.timetable.defaultBellTimes')}</p>
      )}

      {editor && (
        <LessonEditor key={editor.id || `${editor.day}-${editor.period}-${editor.classId}`} meta={meta} initial={editor} subjectHints={subjectHints}
          onClose={() => setEditor(null)} onSaved={afterSave} />
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}

      {data && (
        <div className="tt-print" style={{ opacity: busy ? 0.6 : 1 }}>
          <h3 style={{ marginBottom: '0.5rem' }}>{viewTitle}<span style={{ ...muted, fontWeight: 400 }}> · {weekLabel(weekStart)}</span></h3>

          {holidays.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {holidays.map(ht => <Chip key={ht.id} color={ht.kind === 'holiday' ? '#ffb36b' : '#8fd3ff'}>{ht.title} · {fmtTerm(ht)}</Chip>)}
            </div>
          )}

          {emptyAll && (
            <p className="no-print" style={{ ...muted, marginBottom: '0.75rem' }}>
              {canAddHere ? t('shared.timetable.noLessonsEditable') : t('shared.timetable.noLessons')}
            </p>
          )}

          {narrow ? (
            <>
              {/* Day-by-day view on phones */}
              <div className="no-print" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', marginBottom: '0.9rem', paddingBottom: '0.2rem' }}>
                {days.map((name, i) => (
                  <button key={name} onClick={() => setDayIdx(i)} style={{
                    flexShrink: 0, cursor: 'pointer', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.82rem', fontFamily: 'inherit',
                    color: 'var(--fg)', fontWeight: dayIdx === i ? 700 : 400,
                    border: dayIdx === i ? '1px solid var(--color-primary)' : '1px solid rgba(128,128,128,0.3)',
                    background: dayIdx === i ? 'rgba(var(--color-primary-rgb),0.25)' : 'rgba(128,128,128,0.08)',
                  }}>{name}</button>
                ))}
              </div>
              {(() => {
                const day = dayIdx + 1
                const iso = addDays(weekStart, dayIdx)
                const hol = holidayOn(iso, data.terms)
                const evs = eventsOn(iso, data.events)
                return (
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {hol && <div style={{ ...panel, fontSize: '0.85rem', color: '#ffb36b' }}>{hol.title}</div>}
                    {evs.map(ev => <div key={ev.id} style={{ ...panel, fontSize: '0.82rem' }}>{ev.title}</div>)}
                    {meta.periods.map(p => {
                      const slot = cells[`${day}-${p.period}`]
                      return (
                        <div key={p.period} style={{ ...panel, padding: '0.6rem 0.8rem', opacity: p.isBreak ? 0.6 : 1 }}>
                          <div style={{ ...muted, fontSize: '0.75rem', marginBottom: '0.3rem' }}>{p.label} · {p.start}–{p.end}</div>
                          {p.isBreak ? <div style={{ ...muted, fontSize: '0.8rem' }}>{p.label}</div>
                            : slot ? (
                              <Lesson t={t} slot={slot} showClass={view?.type === 'teacher'} showTeacher={view?.type === 'class' || isStudent} dimmed={!!hol}
                                onOpen={(s) => setEditor({ id: s.id, classId: s.classId, day: s.day, period: s.period, subject: s.subject, teacherId: s.teacherId, room: s.room })}
                                onDragStart={() => {}} onDragEnd={() => {}} />
                            ) : canAddHere ? (
                              <button className="no-print" onClick={() => setEditor({ day, period: p.period, classId: viewedClass?.id })}
                                style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed rgba(128,128,128,0.4)', borderRadius: '0.5rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', cursor: 'pointer' }}>
                                <Icon name="plus" size={14} />
                              </button>
                            ) : <span style={{ ...muted, fontSize: '0.8rem' }}>—</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid rgba(128,128,128,0.15)', borderRadius: '0.5rem' }}>
              <table style={{ width: '100%', minWidth: '45rem', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ ...cellBase, height: 'auto', width: '7.5rem' }} />
                    {days.map((name, i) => {
                      const iso = addDays(weekStart, i)
                      const hol = holidayOn(iso, data.terms)
                      const evs = eventsOn(iso, data.events)
                      return (
                        <th key={name} style={{ ...cellBase, height: 'auto', textAlign: 'left', background: hol ? 'rgba(255,179,107,0.12)' : 'rgba(128,128,128,0.06)' }}>
                          <div>{name}</div>
                          <div style={{ ...muted, fontSize: '0.75rem', fontWeight: 400 }}>{new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                          {hol && <div style={{ fontSize: '0.7rem', color: '#ffb36b' }}>{hol.title}</div>}
                          {evs.map(ev => (
                            <div key={ev.id} title={ev.location || ''} style={{ fontSize: '0.7rem', color: '#8fd3ff', fontWeight: 400 }}>
                              {ev.title}{ev.date ? ` ${new Date(ev.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''}
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
                        <td colSpan={days.length} style={{ ...cellBase, height: '2.2rem', textAlign: 'center', ...muted, fontSize: '0.8rem', background: 'rgba(128,128,128,0.04)' }}>{p.label}</td>
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
                              <Lesson t={t} slot={slot} showClass={view?.type === 'teacher'} showTeacher={view?.type === 'class' || isStudent} dimmed={!!hol}
                                onOpen={(s) => setEditor({ id: s.id, classId: s.classId, day: s.day, period: s.period, subject: s.subject, teacherId: s.teacherId, room: s.room })}
                                onDragStart={(s) => { dragging.current = s }} onDragEnd={() => { dragging.current = null; setOver('') }} />
                            ) : canAddHere ? (
                              <button className="no-print" aria-label={t('shared.timetable.addLessonAria', { day: name, period: p.label })}
                                onClick={() => setEditor({ day, period: p.period, classId: viewedClass?.id })}
                                style={{ width: '100%', height: '100%', background: 'transparent', border: '1px dashed rgba(128,128,128,0.35)', borderRadius: '0.5rem', color: 'var(--fg-muted, rgba(128,128,128,0.9))', cursor: 'pointer' }}>
                                <Icon name="plus" size={14} />
                              </button>
                            ) : null}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {meta.canEdit && <p className="no-print" style={{ ...muted, fontSize: '0.8rem', marginTop: '0.6rem' }}>{t('shared.timetable.dragHint')}</p>}
        </div>
      )}
    </div>
  )
}

// Loads what the board needs, then draws it. Used on every role's schedule page.
export default function TimetableBoard() {
  const { data: meta, loading, error, reload } = useApiData('/api/timetable/meta')
  if (loading) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!meta) return null
  return <Board meta={meta} />
}
export { Board }
