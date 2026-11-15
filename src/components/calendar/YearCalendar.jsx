import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../../i18n/index.js'
import { apiFetch } from '../../api/apiClient'
import { ErrorBox } from '../parent/parentUi'
import SkeletonList from '../shared/Skeleton'
import { addDays } from '../timetable/ttUtils'
import MonthCard from './MonthCard'
import DayModal from './DayModal'

// Stacked month cards for one year. Fetches every open month's entries once (so DayModal's
// prev/next-day arrows can move across a month boundary without a reload) and keeps a single
// date -> entries[] map that every MonthCard reads from.
export default function YearCalendar({ year, months, canManage, managePath }) {
  const t = useT()
  const [byMonth, setByMonth] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalDay, setModalDay] = useState(null)
  const monthsKey = months.join(',')

  const loadAll = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const results = await Promise.all(months.map(m => apiFetch(`/api/calendar/entries?year=${year}&month=${m}`)))
      const map = {}
      months.forEach((m, i) => { map[m] = results[i]?.entries || [] })
      setByMonth(map)
    } catch (err) {
      setError(err.message || t('shared.calendar.errLoad'))
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, monthsKey])

  useEffect(() => { loadAll() }, [loadAll])

  const dayMap = useMemo(() => {
    const map = {}
    for (const m of months) {
      for (const e of (byMonth[m] || [])) {
        (map[e.date] || (map[e.date] = [])).push(e)
      }
    }
    return map
  }, [byMonth, monthsKey])

  if (loading && !Object.keys(byMonth).length) return <SkeletonList />
  if (error) return <ErrorBox message={error} onRetry={loadAll} />

  return (
    <>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {months.map(m => (
          <MonthCard key={m} year={year} month={m} entries={dayMap} onDayClick={setModalDay} />
        ))}
      </div>
      {modalDay && (
        <DayModal
          dateIso={modalDay}
          entries={dayMap[modalDay] || []}
          canManage={canManage}
          managePath={managePath}
          onClose={() => setModalDay(null)}
          onPrevDay={() => setModalDay(d => addDays(d, -1))}
          onNextDay={() => setModalDay(d => addDays(d, 1))}
          onMutated={loadAll}
        />
      )}
    </>
  )
}
