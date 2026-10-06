// Shared glass/liquid style utilities
export const C = {
  navy: 'var(--color-bg)',
  turquoise: 'var(--color-primary)',
  navyAlpha: 'rgba(var(--color-bg-rgb),0.7)',
}

export const glassCard = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(18px) saturate(180%)',
  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '16px',
  position: 'relative',
  overflow: 'hidden',
  color: 'white',
}

export const glassNav = {
  background: 'rgba(var(--color-bg-rgb),0.55)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderBottom: '1px solid rgba(var(--color-primary-rgb),0.3)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  padding: '1rem 2rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

export const glassInput = {
  width: '100%',
  padding: '0.85rem 1rem',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(var(--color-primary-rgb),0.4)',
  borderRadius: '10px',
  color: 'white',
  fontSize: '1rem',
  outline: 'none',
  fontFamily: 'Roboto Slab, serif',
}

export const glassBtn = {
  background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.9), rgba(var(--color-primary-dark-rgb),0.9))',
  backdropFilter: 'blur(10px)',
  color: 'var(--color-bg)',
  border: 'none',
  padding: '0.9rem 1.5rem',
  borderRadius: '10px',
  fontWeight: '700',
  cursor: 'pointer',
  fontSize: '1rem',
  fontFamily: 'Roboto Slab, serif',
  boxShadow: '0 0 20px rgba(var(--color-primary-rgb),0.4)',
  transition: 'all 0.2s',
  width: '100%',
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
