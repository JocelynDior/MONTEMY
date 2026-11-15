// Calendar entry types. Each one (other than "Other") has a small static line-icon drawn directly
// on the calendar so a day's items can be told apart at a glance, without relying on colour alone
// (G1/G5 — no hex colours, no emoji). "Other" is deliberately icon-less: it shows only the title
// the admin/principal typed, nothing invented to go with it.
//
// A merged School Event (from the Events feature) carries its own, slightly different set of type
// keys ('general', 'academic', 'sports', 'meeting', 'holiday', 'other' — see
// src/components/events/eventUtils.js). iconPathsFor() understands both sets so MonthCard and
// DayModal can draw a merged list without caring which system an item came from.

export const CALENDAR_ENTRY_TYPE_KEYS = ['holiday', 'exam', 'term_start', 'term_end', 'sports_day', 'parents_evening', 'other']

// Each value is an array of SVG <path> "d" strings on a 24x24 grid, drawn with the viewer's own
// text colour (currentColor) so it reads correctly in light and dark themes. null = no icon.
const ICON_PATHS = {
  holiday: ['M12 4v2', 'M12 18v2', 'M4 12h2', 'M18 12h2', 'M6.3 6.3l1.4 1.4', 'M16.3 16.3l1.4 1.4', 'M6.3 17.7l1.4-1.4', 'M16.3 7.7l1.4-1.4', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  exam: ['M6 2h9l5 5v15H6z', 'M15 2v5h5', 'M9 13h6', 'M9 17h6', 'M9 9h2'],
  term_start: ['M5 21V4', 'M5 4l9 3-9 3'],
  term_end: ['M5 21V4', 'M5 4h5v3h4v3H5'],
  sports_day: ['M7 4h10v3a5 5 0 0 1-10 0z', 'M7 5H4v1a3 3 0 0 0 3 3', 'M17 5h3v1a3 3 0 0 1-3 3', 'M12 14v3', 'M9 21h6', 'M9 17h6v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z'],
  parents_evening: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1', 'M16 4.2a3 3 0 0 1 0 5.6', 'M18.5 14a5 5 0 0 1 3.5 4.8V21'],
  other: null,
  // School Events enum (src/components/events/eventUtils.js EVENT_TYPE_KEYS) that calendar_entries
  // does not already cover
  general: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  academic: ['M12 3L2 8l10 5 10-5z', 'M6 10.5V16c0 1 2.5 3 6 3s6-2 6-3v-5.5'],
  sports: ['M7 4h10v3a5 5 0 0 1-10 0z', 'M7 5H4v1a3 3 0 0 0 3 3', 'M17 5h3v1a3 3 0 0 1-3 3', 'M12 14v3', 'M9 21h6', 'M9 17h6v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z'],
  meeting: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1', 'M16 4.2a3 3 0 0 1 0 5.6', 'M18.5 14a5 5 0 0 1 3.5 4.8V21'],
}

export function iconPathsFor(type) {
  return ICON_PATHS[String(type || '').toLowerCase()] || null
}

// Translation key for a type's label. Namespaced under shared.calendar.type_<key>.
export function typeLabelKey(type) {
  return `shared.calendar.type_${String(type || 'other').toLowerCase()}`
}
