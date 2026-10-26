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

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const TYPE_COLORS = {
  General: '#8fd3ff', Academic: '#7be3b1', Sports: '#ffb36b', Meeting: '#c7a8ff', Holiday: '#ff9bb5', Other: '#d0d6dc',
}

// Where each role's timetable lives (for the "Timetable" shortcut)
export const TIMETABLE_PATH = {
  student: '/student/schedule', teacher: '/teacher/schedule',
  principal: '/principal/timetable', schoolmember: '/schoolmember/schedules',
}
export const ROLE_HOME = {
  student: '/student/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard',
  principal: '/principal/dashboard', tutor: '/tutor/dashboard', schoolmember: '/schoolmember/dashboard',
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
