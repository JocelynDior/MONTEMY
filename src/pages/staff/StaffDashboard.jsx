import React from 'react'
import { useTranslation } from 'react-i18next'
import DashboardShell from '../../components/layout/DashboardShell'
import FeatureIcon from '../../components/shared/FeatureIcon'

// Staff Member home. No bottom bar – circles include Messages, School Events, Profile, Staff, Calendar, Help.
const cards = [
  { name: 'Messages',      path: '/messages',         icon: 'messages'       },
  { name: 'School Events', path: '/events',            icon: 'school-events'  },
  { name: 'Profile',       path: '/settings',          icon: 'profile'        },
  { name: 'Staff',         path: '/chat/staff',        icon: 'staff'          },
  { name: 'Calendar',      path: '/calendar',          icon: 'calendar'       },
  { name: 'Help',          path: '/help',              icon: 'help'           },
]

export default function StaffDashboard() {
  const { t } = useTranslation('staff')

  // Build translated card list
  const translatedCards = cards.map(c => ({
    ...c,
    title: t(`circle.${c.name.toLowerCase().replace(/ /g, '_')}`, { defaultValue: c.name }),
  }))

  return (
    <DashboardShell role="staff" cards={translatedCards} hideBottomBar />
  )
}
