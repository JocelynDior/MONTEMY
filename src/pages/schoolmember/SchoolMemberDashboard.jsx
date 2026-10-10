import React from 'react'
import DashboardShell from '../../components/layout/DashboardShell'

const cards = [
  { icon: '📋', title: 'Schedules', description: 'View and manage school schedules', path: '/schoolmember/schedules', requiresVerification: true },
  { icon: '💬', title: 'Messages', description: 'Communicate with all school members', path: '/messages', requiresVerification: true },
  { icon: '📅', title: 'Events', description: 'View and help coordinate school events', path: '/schoolmember/events', requiresVerification: false },
  { icon: '📋', title: 'Administration', description: 'Handle administrative tasks and paperwork', path: '/schoolmember/admin-tasks', requiresVerification: true },
  { icon: '⚙️', title: 'Contact Admin', description: 'Get help from Montemy support', path: '/schoolmember/contact-admin', requiresVerification: false },
]

export default function SchoolMemberDashboard() {
  return <DashboardShell role="school member" collection="schoolMembers" cards={cards} />
}
