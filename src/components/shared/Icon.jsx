import React from 'react'

// Line icons for the app frame and buttons. They are drawn in the current text colour, so they are
// black on white or white on black automatically and never need a colour of their own.
//   <Icon name="bell" />                       1.25em square, follows the font size
//   <Icon name="back" size="1.5rem" title="Back" />
// Arrows and chevrons mirror in right-to-left languages (the icon-flip class in theme.css).
const PATHS = {
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  messages: ['M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  events: ['M5 22V3', 'M5 4h13l-2 4 2 4H5'],
  settings: ['M4 6h9', 'M17 6h3', 'M15 4v4', 'M4 12h3', 'M11 12h9', 'M9 10v4', 'M4 18h11', 'M19 18h1', 'M17 16v4'],
  profile: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  privacy: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  terms: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 9h2', 'M8 13h8', 'M8 17h8'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  help: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3', 'M12 17h.01'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  back: ['M19 12H5', 'M12 19l-7-7 7-7'],
  chevron: ['M9 18l6-6-6-6'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-up': ['M18 15l-6-6-6 6'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  check: ['M20 6L9 17l-5-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  trash: ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6', 'M10 11v6', 'M14 11v6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  pencil: ['M17 3l4 4L7 21H3v-4z', 'M14 6l4 4'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  home: ['M3 11l9-8 9 8', 'M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': ['M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 5.1-5.9', 'M9.9 4.2A9 9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2', 'M1 1l22 22', 'M14.1 14.1a3 3 0 0 1-4.2-4.2'],
  warning: ['M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4', 'M12 17h.01'],
  'wifi-off': ['M1 1l22 22', 'M16.7 11.1A11 11 0 0 1 19 12.6', 'M5 12.6a11 11 0 0 1 5.2-2.5', 'M10.7 5.1A16 16 0 0 1 22.6 9', 'M1.4 9a16 16 0 0 1 4.7-2.9', 'M8.5 16.1a6 6 0 0 1 7 0', 'M12 20h.01'],
  refresh: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.5 9a9 9 0 0 1 14.9-3.4L23 10', 'M1 14l4.6 4.4A9 9 0 0 0 20.5 15'],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M21 15l-5-5L5 21'],
  more: ['M12 12h.01', 'M5 12h.01', 'M19 12h.01'],
}

// Icons that point in a direction mirror when the page is right to left
const FLIPS = new Set(['back', 'chevron', 'chevron-left', 'send', 'logout'])

export const ICON_NAMES = Object.keys(PATHS)
export const hasIcon = (name) => typeof name === 'string' && Object.prototype.hasOwnProperty.call(PATHS, name)

export default function Icon({ name, size = '1.25em', title, strokeWidth = 2, className = '', style }) {
  const paths = hasIcon(name) ? PATHS[name] : null
  if (!paths) return null
  const flip = FLIPS.has(name) ? 'icon-flip' : ''
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={`${flip} ${className}`.trim()}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', ...style }}
      role={title ? 'img' : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true} focusable="false">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}
