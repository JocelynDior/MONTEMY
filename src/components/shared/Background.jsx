import React, { useState } from 'react'
import { BACKGROUND_VIDEO } from '../../config/media'

// Full-screen page background. The gradient is always there; the video (when BACKGROUND_VIDEO is set)
// plays on top of it. If the video fails to load, or the person prefers reduced motion or is saving
// data, they simply see the gradient.
const fill = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }

const skipVideo = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true
  } catch { return false }
}

export default function Background() {
  const [failed, setFailed] = useState(false)
  const showVideo = !!BACKGROUND_VIDEO && !failed && !skipVideo()
  return (
    <>
      <div aria-hidden="true" style={{ ...fill, background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-2) 100%)' }} />
      {showVideo && (
        <video aria-hidden="true" autoPlay loop muted playsInline preload="metadata" onError={() => setFailed(true)}
          style={{ ...fill, objectFit: 'cover' }}>
          <source src={BACKGROUND_VIDEO} type="video/mp4" onError={() => setFailed(true)} />
        </video>
      )}
    </>
  )
}
