import React from 'react'

// Full-screen page background: one plain theme colour (black in Dark, white in Light).
// The old gradient and background video are gone.
export default function Background() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, background: 'var(--bg)' }} />
  )
}
