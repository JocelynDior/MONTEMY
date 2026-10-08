export function fmtDate(iso, withTime = true) {
  if (!iso) return 'No date'
  const d = new Date(iso)
  if (isNaN(d)) return 'No date'
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  if (!withTime) return day
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
}

export function dueIn(iso) {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.floor(Math.abs(diff) / 86400000)
  const hours = Math.floor(Math.abs(diff) / 3600000)
  const plural = (n) => (n === 1 ? '' : 's')
  if (diff < 0) return days >= 1 ? `Overdue by ${days} day${plural(days)}` : 'Overdue'
  if (days >= 1) return `Due in ${days} day${plural(days)}`
  return hours >= 1 ? `Due in ${hours}h` : 'Due soon'
}

const STATUS_COLORS = {
  Graded: '#7CFC9A',
  Submitted: '#8fd3ff',
  Late: '#ffb36b',
  Overdue: '#ff8f8f',
  'Not submitted': '#ffe08a',
}
export const statusColor = (status) => STATUS_COLORS[status] || '#cfd8e3'

// Assumes grades are out of 100
export function gradeColor(g) {
  if (g >= 70) return '#7CFC9A'
  if (g >= 50) return '#ffe08a'
  return '#ff8f8f'
}

export const norm = (v) => String(v ?? '').replace(/\D/g, '')

export function sortByDue(list) {
  return [...list].sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
}
