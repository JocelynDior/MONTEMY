import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BACKGROUND_VIDEO } from '../../config/media'
import { glassCard, glassBtn, addRipple, C } from '../../styles/glass'

const accounts = [
  {
    id: 'student',
    icon: '🎓',
    label: 'Student',
    description: 'Access your subjects, submit homework, track your grades, get 24/7 AI tutor support, and communicate with your teachers.',
    color: 'rgba(var(--color-primary-rgb),0.2)',
  },
  {
    id: 'tutor',
    icon: '📖',
    label: 'Tutor',
    description: 'Manage your students, create personalised learning plans, track progress, schedule sessions, and grow your tutoring practice.',
    color: 'rgba(100,200,255,0.2)',
  },
  {
    id: 'parent',
    icon: '👨‍👩‍👧',
    label: 'Parent',
    description: 'Monitor your child\'s academic journey, communicate with teachers, view assignments and grades, and stay informed.',
    color: 'rgba(180,255,200,0.15)',
  },
  {
    id: 'teacher',
    icon: '🏫',
    label: 'Teacher',
    description: 'Create classes, assign homework, track student progress, communicate with parents, and access teaching resources.',
    color: 'rgba(255,200,100,0.15)',
  },
  {
    id: 'principal',
    icon: '👔',
    label: 'Principal',
    description: 'Oversee school operations, manage staff, generate reports, monitor academic performance, and coordinate activities.',
    color: 'rgba(200,150,255,0.15)',
  },
  {
    id: 'schoolmember',
    icon: '🏢',
    label: 'School Member',
    description: 'Manage schedules, communicate with all school members, handle administrative tasks, and support school operations.',
    color: 'rgba(255,150,150,0.15)',
  },
]

export default function AccountTypeSelect() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [animating, setAnimating] = useState(null)

  const handleSelect = (account, e) => {
    addRipple(e)
    setAnimating(account.id)
    setTimeout(() => {
      setSelected(account)
      setAnimating(null)
    }, 300)
  }

  const handleCreate = (e) => {
    addRipple(e)
    setTimeout(() => navigate(`/register/${selected.id}`), 150)
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>

      {BACKGROUND_VIDEO ? (
        <video autoPlay loop muted playsInline style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)', zIndex: -1 }} />
      )}

      <style>{`
        @keyframes blockPop {
          0% { transform: scale(1); }
          50% { transform: scale(0.93); }
          100% { transform: scale(1); }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-10px); max-height: 0; }
          to { opacity: 1; transform: translateY(0); max-height: 500px; }
        }
        .acct-block {
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s !important;
          cursor: pointer;
        }
        .acct-block:hover {
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: 0 12px 40px rgba(var(--color-primary-rgb),0.35) !important;
        }
        .acct-block.animating {
          animation: blockPop 0.3s ease;
        }
        .acct-block.selected {
          border-color: rgba(var(--color-primary-rgb),0.8) !important;
          box-shadow: 0 0 35px rgba(var(--color-primary-rgb),0.5) !important;
          transform: scale(1.03) !important;
        }
        .expand-anim {
          animation: expandIn 0.4s ease forwards;
        }
        .wave-inner::before {
          content:'';
          position:absolute;
          top:-80%;left:-80%;
          width:260%;height:260%;
          background: radial-gradient(ellipse at 30% 40%, rgba(var(--color-primary-rgb),0.12) 0%, transparent 60%);
          animation: glassWave 6s ease-in-out infinite;
          pointer-events:none;
        }
      `}</style>

      {/* Nav */}
      <nav style={{ background: 'rgba(var(--color-bg-rgb),0.5)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(var(--color-primary-rgb),0.25)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: C.turquoise, fontSize: '1.4rem', cursor: 'pointer' }}>←</button>
        <span style={{ color: C.turquoise, fontWeight: '700', fontSize: '1.4rem' }}>MONTEMY</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginLeft: 'auto' }}>Select your account type</span>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', color: C.turquoise, marginBottom: '0.5rem' }}>Create Account</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.95rem' }}>Choose your account type below</p>
        </div>

        {/* 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          {accounts.map((acct) => (
            <div
              key={acct.id}
              className={`acct-block glass ripple-container wave-inner ${selected?.id === acct.id ? 'selected' : ''} ${animating === acct.id ? 'animating' : ''}`}
              onClick={(e) => handleSelect(acct, e)}
              style={{
                ...glassCard,
                padding: '1.75rem',
                textAlign: 'center',
                border: selected?.id === acct.id ? '1px solid rgba(var(--color-primary-rgb),0.8)' : '1px solid rgba(255,255,255,0.15)',
                background: selected?.id === acct.id ? 'rgba(var(--color-primary-rgb),0.12)' : acct.color,
              }}
            >
              <div style={{ fontSize: '2.8rem', marginBottom: '0.6rem' }}>{acct.icon}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '600', color: selected?.id === acct.id ? C.turquoise : 'white' }}>
                {acct.label}
              </div>

              {/* Expanded section */}
              {selected?.id === acct.id && (
                <div className="expand-anim" style={{ marginTop: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: '1px', background: 'rgba(var(--color-primary-rgb),0.3)', marginBottom: '1rem' }} />
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', lineHeight: '1.65', marginBottom: '1.25rem' }}>
                    {acct.description}
                  </p>
                  <button
                    className="ripple-container"
                    onClick={handleCreate}
                    style={{ ...glassBtn, fontSize: '0.95rem', padding: '0.8rem 1rem' }}>
                    Create Account
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <span onClick={() => navigate('/login')} style={{ color: C.turquoise, cursor: 'pointer', textDecoration: 'underline' }}>Login here</span>
        </p>
      </div>
    </div>
  )
}
