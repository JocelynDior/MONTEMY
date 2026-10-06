import React from 'react'
import { useNavigate } from 'react-router-dom'

const s = { navy: 'var(--color-bg)', turquoise: 'var(--color-primary)' }

const resources = [
  { icon: '📖', title: 'Study Guides', description: 'Access curated study materials for all subjects.' },
  { icon: '🎥', title: 'Video Lessons', description: 'Watch video explanations from your teachers.' },
  { icon: '📝', title: 'Practice Papers', description: 'Download past exam papers and practice tests.' },
  { icon: '🔗', title: 'Useful Links', description: 'Explore recommended educational websites.' },
]

export default function StudentResources() {
  const navigate = useNavigate()
  return (
    <div style={{ background: s.navy, minHeight: '100vh', color: 'white', fontFamily: 'Arial' }}>
      <nav style={{ background: s.turquoise, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: s.navy, fontSize: '1.2rem', fontWeight: 'bold' }}>MONTEMY</div>
        <button onClick={() => navigate('/student/dashboard')} style={{ background: s.navy, color: s.turquoise, padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>
      </nav>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <h2 style={{ color: s.turquoise, marginBottom: '1.5rem' }}>📚 Learning Resources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {resources.map(r => (
            <div key={r.title} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', borderLeft: `4px solid ${s.turquoise}`, padding: '1.5rem', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--color-primary-rgb),0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{r.icon}</div>
              <h3 style={{ color: s.turquoise, marginBottom: '0.5rem' }}>{r.title}</h3>
              <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>{r.description}</p>
              <div style={{ marginTop: '1rem', color: '#aaa', fontSize: '0.8rem', fontStyle: 'italic' }}>Coming soon...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
