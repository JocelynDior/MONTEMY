// Small date helpers for the timetable. Weeks run Monday to Sunday and dates are plain 'YYYY-MM-DD'
// strings in the viewer's own time zone, so they line up with what the server returns for term dates.
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n) => String(n).padStart(2, '0')

export function toIso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'YYYY-MM-DD' -> local Date at midnight
export function parseIso(s) {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso, n) {
  const d = parseIso(iso)
  d.setDate(d.getDate() + n)
  return toIso(d)
}

export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return toIso(d)
}

export function fmtShort(iso) {
  return parseIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function fmtLong(iso) {
  return parseIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function weekLabel(weekStart) {
  return `${fmtShort(weekStart)} – ${fmtLong(addDays(weekStart, 6))}`
}

export function fmtTerm(t) {
  return t.startDate === t.endDate ? fmtLong(t.startDate) : `${fmtShort(t.startDate)} – ${fmtLong(t.endDate)}`
}

// ISO strings compare correctly as text
export const holidayOn = (iso, terms) => (terms || []).find(t => t.kind === 'holiday' && t.startDate <= iso && iso <= t.endDate) || null
export const eventsOn = (iso, events) => (events || []).filter(e => toIso(new Date(e.date)) === iso)

// A steady colour per subject so the same subject looks the same everywhere
export function subjectColor(subject) {
  let h = 0
  for (const ch of String(subject || '')) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
