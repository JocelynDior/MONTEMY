// Small helpers shared by the student, parent, teacher and principal pages.
// Nothing here uses colour to carry meaning: a status or grade always has its word next to it, and the
// greys only add emphasis. Pass t (from useT()) to get words in the user's language.

// Dates follow the app language (i18n/index.js writes it to <html lang>)
function dateLocale() {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : ''
  if (!lang) return undefined
  try { return Intl.DateTimeFormat.supportedLocalesOf([lang])[0] } catch { return undefined }
}

// '' when there is no date, so pages decide what to write instead
export function fmtDate(iso, withTime = true) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const loc = dateLocale()
  const day = d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' })
  if (!withTime) return day
  return `${day}, ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`
}

// A plain 'YYYY-MM-DD' (exam dates) shown in the user's language
export function fmtDay(ymd, withWeekday = true) {
  if (!ymd) return ''
  const [y, m, d] = String(ymd).split('-').map(Number)
  const date = new Date(y, (m || 1) - 1, d || 1)
  if (isNaN(date)) return ''
  return date.toLocaleDateString(dateLocale(), withWeekday ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

// Today as 'YYYY-MM-DD' in the viewer's time zone, to tell upcoming exams from past ones
export function todayYmd() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "Due in 2d", "Overdue by 3d". Without t the English words are returned, so pages not yet moved still work.
export function dueIn(iso, t) {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.floor(Math.abs(diff) / 86400000)
  const hours = Math.floor(Math.abs(diff) / 3600000)
  if (t) {
    if (diff < 0) return days >= 1 ? t('student.overdueDays', { n: days }) : t('student.overdue')
    if (days >= 1) return t('student.dueInDays', { n: days })
    return hours >= 1 ? t('student.dueInHours', { n: hours }) : t('student.dueSoon')
  }
  if (diff < 0) return days >= 1 ? `Overdue by ${days}d` : 'Overdue'
  if (days >= 1) return `Due in ${days}d`
  return hours >= 1 ? `Due in ${hours}h` : 'Due soon'
}

// The server sends the status as an English word. These are the words and their i18n keys.
const STATUS_KEYS = {
  Graded: 'student.status_graded',
  Submitted: 'student.status_submitted',
  Late: 'student.status_late',
  Reopened: 'student.status_reopened',
  Overdue: 'student.status_overdue',
  'Not submitted': 'student.status_notSubmitted',
}
export const statusLabel = (status, t) => (t && STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status)

// Work that still needs attention is the strongest; finished work is quieter
const NEEDS_ATTENTION = new Set(['Overdue', 'Reopened', 'Late', 'Not submitted'])
export const statusColor = (status) => (NEEDS_ATTENTION.has(status) ? 'var(--fg)' : 'var(--fg-muted)')

// Grades are out of 100. Three levels, each with a word (Strong, Fair, Needs work) shown next to the number.
export function gradeLevel(g) {
  if (g === null || g === undefined || Number.isNaN(Number(g))) return null
  if (g >= 70) return 'high'
  if (g >= 50) return 'mid'
  return 'low'
}
export const gradeLevelKey = (g) => {
  const level = gradeLevel(g)
  return level ? `student.level_${level}` : null
}
// Still exported under its old name: now a grey level, not a colour
export const gradeColor = (g) => {
  const level = gradeLevel(g)
  return level === 'high' ? 'var(--fg)' : level === 'mid' ? 'var(--fg-muted)' : 'var(--fg-subtle)'
}
// Fill for a progress bar: solid (strong), grey (fair), or striped (needs work), so it also reads without colour
export function gradeBarFill(g) {
  const level = gradeLevel(g)
  if (level === 'high') return 'var(--fg)'
  if (level === 'mid') return 'var(--fg-muted)'
  return 'repeating-linear-gradient(135deg, var(--fg-subtle) 0 4px, transparent 4px 8px)'
}

// How worried to be about a student, from their marks in the order they were earned (oldest first, 0 to 100).
// Returns null with no marks, otherwise 'low', 'medium' or 'high'. Shown as a word, never only as a colour.
export function riskLevel(scores) {
  const list = (scores || []).filter(v => typeof v === 'number' && !Number.isNaN(v))
  if (list.length === 0) return null
  const avg = list.reduce((t, v) => t + v, 0) / list.length
  const mean = (a) => a.reduce((t, v) => t + v, 0) / a.length
  const recent = list.slice(-3)
  const before = list.slice(-6, -3)
  const trend = before.length ? mean(recent) - mean(before) : 0
  if (avg < 50 || (trend <= -15 && avg < 65)) return 'high'
  if (avg < 65 || trend <= -10) return 'medium'
  return 'low'
}
export const riskLabelKey = (level) => `student.risk_${level}`

export const norm = (v) => String(v ?? '').replace(/\D/g, '')

export function sortByDue(list) {
  return [...list].sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
}
