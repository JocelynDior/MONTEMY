import React from 'react'

export default function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)' }}>
      <style>{`@keyframes montemy-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: '48px', height: '48px', border: '4px solid rgba(var(--color-primary-rgb),0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'montemy-spin 0.9s linear infinite' }} />
    </div>
  )
}
