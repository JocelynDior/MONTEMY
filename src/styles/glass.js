// Shared style objects used by almost every page. The file keeps its old name and exports, but the
// look is now plain: solid surfaces, thin borders, no blur and no gradients. Every value is a theme
// token from styles/theme.css, so Dark and Light work with no extra code.
export const C = {
  navy: 'var(--bg)',             // the page background colour (black in Dark, white in Light)
  turquoise: 'var(--fg)',        // the main foreground colour (white in Dark, black in Light)
  navyAlpha: 'rgba(var(--bg-rgb), 0.7)',
}

export const glassCard = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  position: 'relative',
  overflow: 'hidden',
  color: 'var(--fg)',
  minWidth: 0,
}

export const glassNav = {
  background: 'var(--bg)',
  borderBottom: '1px solid var(--border)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  padding: 'calc(0.75rem + var(--safe-top)) calc(var(--page-gutter) + var(--safe-right)) 0.75rem calc(var(--page-gutter) + var(--safe-left))',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1rem',
  justifyContent: 'space-between',
  alignItems: 'center',
  minWidth: 0,
}

export const glassInput = {
  width: '100%',
  minWidth: 0,
  padding: '0.75rem 1rem',
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--fg)',
  fontSize: '1rem',          // 16px or more, so iPhones do not zoom in when the field is focused
  fontFamily: 'inherit',
}

export const glassBtn = {
  background: 'var(--fg)',
  color: 'var(--bg)',
  border: '1px solid var(--fg)',
  padding: '0.75rem 1.25rem',
  minHeight: '2.75rem',      // comfortable touch target
  borderRadius: 'var(--radius-md)',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '1rem',
  fontFamily: 'inherit',
  lineHeight: 1.2,
  width: '100%',
  maxWidth: '100%',
}

export function addRipple(e) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const ripple = document.createElement('span')
  const size = Math.max(rect.width, rect.height)
  ripple.className = 'ripple'
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`
  el.appendChild(ripple)
  setTimeout(() => ripple.remove(), 700)
}
