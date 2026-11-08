import React from 'react'
import { useTheme } from '../../context/ThemeContext'

// The artwork for the home circles. The PNGs are transparent line drawings:
//   dark-mode-NAME.png   a black drawing   (shown on a white circle in Dark mode)
//   light-mode-NAME.png  a white drawing   (shown on a black circle in Light mode)
// The circle is drawn here in the foreground colour, so it is white in Dark and black in Light.
// The picture changes the moment the theme changes, including when Default follows the phone.
// Pass circle={false} to get only the drawing (for placing on a surface you draw yourself).
export const FEATURE_ICON_NAMES = [
  'ai-tutor', 'billing', 'branding', 'broadcast', 'calendar', 'classes', 'exams', 'help', 'homework',
  'learning-plans', 'messages', 'organisations', 'parent-teacher', 'parents', 'pending-verification',
  'profile', 'progress', 'school-events', 'school-management', 'school-statistics', 'sessions', 'staff',
  'students', 'subjects', 'textbooks', 'timetable', 'users',
]

export default function FeatureIcon({ name, size = '4rem', alt = '', circle = true, style, className }) {
  const { resolved } = useTheme()
  if (!FEATURE_ICON_NAMES.includes(name)) return null
  const picture = (
    <img
      src={`/icons/features/${resolved}-mode-${name}.png`}
      alt={alt} draggable={false} decoding="async"
      style={{ width: circle ? '64%' : '100%', height: circle ? '64%' : '100%', objectFit: 'contain', display: 'block' }}
    />
  )
  if (!circle) {
    return <span className={className} style={{ display: 'block', width: size, height: size, flexShrink: 0, ...style }}>{picture}</span>
  }
  // The drawing is 64% of the circle (percent of the circle itself, so the size is exact at any size)
  return (
    <span className={className}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0,
        borderRadius: '50%', background: 'var(--fg)', boxSizing: 'border-box', ...style }}>
      {picture}
    </span>
  )
}
