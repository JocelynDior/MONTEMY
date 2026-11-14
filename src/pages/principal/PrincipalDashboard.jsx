import { useT } from '../../i18n/index.js'
import React from 'react'
import DashboardShell from '../../components/layout/DashboardShell'

// Phase 7 edit: supply role to DashboardShell, stat blocks via i18n, remove Timetable,
// replace emoji with FeatureIcon names, no hard-coded colours.
const CARDS = [
  { key: 'school_statistics', path: '/principal/stats',    icon: 'school-statistics' },
  { key: 'billing',           path: '/principal/billing',  icon: 'billing'            },
  { key: 'student_progress',  path: '/principal/progress', icon: 'student-progress'   },
  { key: 'staff',             path: '/principal/staff',    icon: 'staff'              },
  { key: 'parents',           path: '/messages/parents',   icon: 'parents'            },
  { key: 'calendar',          path: '/calendar',           icon: 'calendar'           },
  { key: 'help',              path: '/help',               icon: 'help'               },
]

export default function PrincipalDashboard() {
  const t = useT()

  const cards = CARDS.map(c => ({
    ...c,
    title: t(`circle.${c.key}`, { defaultValue: c.key }),
  }))

  return <DashboardShell role="principal" cards={cards} />
}
