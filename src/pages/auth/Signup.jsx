import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BACKGROUND_VIDEO } from '../../config/media'

const accountTypes = [
  {
    icon: '🎓',
    title: 'Students',
    description: 'Upload homework, get 24/7 tutor support, communicate with teachers, access learning materials, and track your academic progress.',
    label: 'Create Student Account',
    path: '/signup/student'
  },
  {
    icon: '📚',
    title: 'Teachers',
    description: 'Create and manage classes, assign homework, track student progress, communicate with students and parents, and access teaching resources.',
    label: 'Create Teacher Account',
    path: '/signup/teacher'
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parents',
    description: 'Monitor your child\'s academic progress, communicate with teachers, view assignments and grades, and receive important school notifications.',
    label: 'Create Parent Account',
    path: '/signup/parent'
  },
  {
    icon: '👔',
    title: 'Principals',
    description: 'Manage school operations, oversee staff and faculty, generate reports, monitor academic performance, and coordinate school activities.',
    label: 'Create Principal Account',
    path: '/signup/principal'
  },
  {
    icon: '👥',
    title: 'Staff Members',
    description: 'This account is for staff members excluding principals and teachers. Communicate with all school members, track schedules and more.',
    label: 'Create Staff Account',
    path: '/signup/staff'
  },
  {
    icon: '⚙️',
    title: 'Administrators',
    description: 'Manage system settings, user accounts, school data, technical configurations, and provide platform support for all users.',
    label: 'Create Admin Account',
    path: '/signup/admin'
  }
]

export default function Signup() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif', color: 'white', position: 'relative' }}>

      {/* Background */}
      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
      )}

      {/* Navbar */}
      <nav style={{ background: 'var(--color-primary)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(var(--color-primary-rgb),0.3)' }}>
        <div style={{ color: 'var(--color-bg)', fontSize: '1.8rem', fontWeight: 'bold' }}>MONTEMY</div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ color: 'var(--color-primary)', fontSize: '2.5rem', textShadow: '0 0 15px rgba(var(--color-primary-rgb),0.7)' }}>Create Account</h1>
        </div>

        {/* Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {accountTypes.map((account) => (
            <div key={account.title}
              style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(var(--color-primary-rgb),0.3)', boxShadow: '0 0 15px rgba(var(--color-primary-rgb),0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 30px rgba(var(--color-primary-rgb),0.7)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 15px rgba(var(--color-primary-rgb),0.2)'}>

              <div>
                <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>{account.icon}</div>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>{account.title}</h2>
                <p style={{ color: '#CCCCCC', marginBottom: '2rem', lineHeight: '1.6' }}>{account.description}</p>
              </div>

              <button onClick={() => navigate(account.path)}
                style={{ background: 'var(--color-primary)', color: 'var(--color-bg)', border: 'none', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', width: '100%', boxShadow: '0 0 20px rgba(var(--color-primary-rgb),0.7)' }}>
                {account.label}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '3rem', color: '#CCCCCC', fontSize: '0.9rem' }}>
          <p>Already have an account?{' '}
            <span onClick={() => navigate('/')} style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}>Sign in here</span>
          </p>
          <p style={{ marginTop: '0.5rem' }}>© 2024 Montemy. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
