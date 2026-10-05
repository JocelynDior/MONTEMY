import React from 'react'

export default function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #001F3F 0%, #003366 100%)' }}>
      <style>{`@keyframes montemy-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: '48px', height: '48px', border: '4px solid rgba(64,224,208,0.2)', borderTopColor: '#40E0D0', borderRadius: '50%', animation: 'montemy-spin 0.9s linear infinite' }} />
    </div>
  )
}
