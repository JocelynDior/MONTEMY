export const pad = (n) => String(n).padStart(2, '0')

// Local calendar day as YYYY-MM-DD (the viewer's own time zone)
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ISO string -> value for <input type="datetime-local"> in the browser's time zone
export function toLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))   // weeks start on Monday
  return x
}
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// Six rows of seven days covering the month that contains `d`
export function monthGrid(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export const fmtTime = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
export const fmtLongDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export const DAY_SHORT_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Token-coloured event type styles, told apart by weight and a short translated label (never colour alone).
export const EVENT_TYPE_KEYS = ['general', 'academic', 'sports', 'meeting', 'holiday', 'other']
export function typeStyle(type) {
  const key = String(type || 'general').toLowerCase()
  const emphasised = key === 'holiday' || key === 'meeting'
  return {
    background: emphasised ? 'var(--fg)' : 'rgba(128,128,128,0.25)',
    color: emphasised ? 'var(--color-bg)' : 'var(--fg)',
    border: '1px solid var(--border, rgba(128,128,128,0.4))',
  }
}

// Where each role's timetable lives (for the "Timetable" shortcut)
export const TIMETABLE_PATH = {
  student: '/student/schedule', teacher: '/teacher/schedule',
  principal: '/principal/timetable', staff: '/staff/schedules',
}
export const ROLE_HOME = {
  student: '/student/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard',
  principal: '/principal/dashboard', tutor: '/tutor/dashboard', staff: '/staff/dashboard',
  admin: '/admin/dashboard',
}

// Group events by local day
export function groupByDay(events) {
  const map = {}
  for (const e of events) {
    const k = dayKey(new Date(e.date));
    (map[k] || (map[k] = [])).push(e)
  }
  for (const k in map) map[k].sort((a, b) => new Date(a.date) - new Date(b.date))
  return map
}
