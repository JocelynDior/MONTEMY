// What every role sees on its home screen, in one place.
//
//   circles    the home circles, most important first (the order comes from the plan, "Home circles per role")
//   menu       extra lines in the side menu, above Settings (Messages and School Events live in the bottom bar,
//              so the menu repeats them for quick access; the Staff Member has them as circles instead)
//   bottomBar  false for the Staff Member only
//
// Each entry: { page, route, verified, label? }
//   page      the page key. It is also the key the Help assistant uses (api/ai/appKnowledge.js PAGE_KEYS)
//   route     where it opens. Routes of pages built in later phases are fixed here now and wired in Phase 10
//   verified  true = locked (shows a lock, opens the verification page) until an admin verifies the account
//   label     only when the role's name for the page differs from the standard one (Child Progress)
//
// The words for each page are in i18n/ns/shell.js as f_<page>. A page with a School and a Firm version also
// has f_<page>_firm (see FIRM_LABELS).

import { ROLE_ROUTES } from '../supabase/authHelpers'

// page key -> name of the home-circle picture in public/icons/features/ (dark-mode-NAME.png)
export const PAGE_ICONS = {
  ai_tutor: 'ai-tutor',
  homework: 'homework',
  timetable: 'timetable',
  textbooks: 'textbooks',
  exams: 'exams',
  subjects: 'subjects',
  progress: 'progress',
  calendar: 'calendar',
  help: 'help',
  classes: 'classes',
  staff: 'staff',
  parents: 'parents',
  students: 'students',
  sessions: 'sessions',
  learning_plans: 'learning-plans',
  school_statistics: 'school-statistics',
  billing: 'billing',
  student_progress: 'progress',
  messages: 'messages',
  events: 'school-events',
  profile: 'profile',
  users: 'users',
  organisations: 'organisations',
  school_management: 'school-management',
  pending_verification: 'pending-verification',
  broadcast: 'broadcast',
  parent_teacher: 'parent-teacher',
  branding: 'branding',
  platform_statistics: 'school-statistics',
  staff_management: 'staff',
}

// Pages whose name says School in a school and Firm in a tutor firm
export const FIRM_LABELS = new Set(['events', 'school_statistics', 'school_management'])

const e = (page, route, verified = true, label) => (label ? { page, route, verified, label } : { page, route, verified })

const CALENDAR = e('calendar', '/calendar', false)
const HELP = e('help', '/help', false)

export const ROLE_FEATURES = {
  student: {
    bottomBar: true,
    menu: [e('messages', '/messages'), e('events', '/events', false)],
    circles: [
      e('ai_tutor', '/student/ai-tutor', false),
      e('homework', '/student/academics?tab=homework'),
      e('timetable', '/student/schedule'),
      e('textbooks', '/student/resources', false),
      e('exams', '/student/exams'),
      e('subjects', '/student/academics?tab=subjects'),
      e('progress', '/student/academics?tab=progress'),
      CALENDAR, HELP,
    ],
  },
  teacher: {
    bottomBar: true,
    menu: [e('messages', '/messages'), e('events', '/events', false)],
    circles: [
      e('classes', '/teacher/classes'),
      e('homework', '/teacher/assignments'),
      e('progress', '/teacher/progress'),
      e('timetable', '/teacher/schedule'),
      e('textbooks', '/teacher/resources', false),
      e('staff', '/chat/staff'),
      e('parents', '/chat/parents'),
      CALENDAR, HELP,
    ],
  },
  tutor: {
    bottomBar: true,
    menu: [e('messages', '/messages'), e('events', '/events', false)],
    circles: [
      e('students', '/tutor/students'),
      e('sessions', '/tutor/sessions'),
      e('learning_plans', '/tutor/plans'),
      e('progress', '/tutor/reports'),
      e('textbooks', '/tutor/resources', false),
      CALENDAR, HELP,
    ],
  },
  parent: {
    bottomBar: true,
    menu: [e('messages', '/messages'), e('events', '/events', false)],
    circles: [
      e('progress', '/parent/progress', true, 'child_progress'),
      e('homework', '/parent/homework'),
      e('timetable', '/parent/timetable'),
      e('exams', '/parent/exams'),
      CALENDAR, HELP,
    ],
  },
  principal: {
    bottomBar: true,
    // Staff Management is reached from the menu, not from a circle
    menu: [e('messages', '/messages'), e('events', '/events', false), e('staff_management', '/principal/staff')],
    circles: [
      e('school_statistics', '/principal/stats'),
      e('billing', '/principal/billing'),
      e('student_progress', '/principal/student-progress'),
      e('staff', '/chat/staff'),
      e('parents', '/chat/parents'),
      CALENDAR, HELP,
    ],
  },
  staff: {
    bottomBar: false,
    menu: [],
    circles: [
      e('messages', '/messages'),
      e('events', '/events', false),
      e('profile', '/settings?section=profile', false),
      e('staff', '/chat/staff'),
      CALENDAR, HELP,
    ],
  },
  admin: {
    bottomBar: true,
    menu: [e('messages', '/messages', false), e('events', '/events', false)],
    circles: [
      e('users', '/admin/users', false),
      e('classes', '/admin/classes', false),
      e('organisations', '/admin/organisations', false),
      e('school_management', '/admin/school-management', false),
      e('pending_verification', '/admin/dashboard?tab=pending', false),
      e('broadcast', '/admin/dashboard?tab=broadcast', false),
      e('parent_teacher', '/admin/dashboard?tab=pt', false),
      e('branding', '/admin/dashboard?tab=brand', false),
      e('textbooks', '/admin/dashboard?tab=resources', false),
      e('platform_statistics', '/admin/dashboard?tab=overview', false),
      e('billing', '/admin/school-management?tab=billing', false),
      CALENDAR,
      e('help', '/admin/help-inbox', false),
    ],
  },
}

// The four buttons of the bottom bar. Messages needs a verified account (admins never do).
export const BOTTOM_BAR = [
  { page: 'messages', route: '/messages', icon: 'messages', verified: true },
  { page: 'events', route: '/events', icon: 'events', verified: false },
  { page: 'settings', route: '/settings', icon: 'settings', verified: false },
  { page: 'profile', route: '/settings?section=profile', icon: 'profile', verified: false },
]

export const hasBottomBar = (role) => !!ROLE_FEATURES[role]?.bottomBar
export const featuresFor = (role) => ROLE_FEATURES[role] || { bottomBar: false, menu: [], circles: [] }

// Pages every role can open the same way
const COMMON_ROUTES = {
  settings: '/settings',
  help: '/help',
  messages: '/messages',
  events: '/events',
  calendar: '/calendar',
  profile: '/settings?section=profile',
  privacy: '/privacy',
  terms: '/terms',
  more_info: '/more-info',
  pending_verification: '/pending-verification',
}

// Turns a page key (as used by the Help assistant) into a route for this role, or null if the role has no such page
export function routeForPage(role, page) {
  if (page === 'home') return ROLE_ROUTES[role] || null
  const own = featuresFor(role)
  const hit = [...own.circles, ...own.menu].find(f => f.page === page)
  if (hit) return hit.route
  return COMMON_ROUTES[page] || null
}

// A circle or menu line is locked until verification, except for admins
export const isLocked = (entry, role, isVerified) => !!entry.verified && !isVerified && role !== 'admin'

// i18n key for the name of a page, with the Firm version in a tutor firm
export function featureLabelKey(entry, isFirm) {
  const base = entry.label || entry.page
  return `shell.f_${isFirm && FIRM_LABELS.has(base) ? `${base}_firm` : base}`
}
