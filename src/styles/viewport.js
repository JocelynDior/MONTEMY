// Measures the real screen once, before the first paint, and keeps it up to date.
// Imported first in main.jsx, so every page is sized from the very first frame.
//
// Sets on <html>:
//   --app-height / --app-width   usable size in px (follows the on-screen keyboard and the phone's browser bars)
//   --safe-top/right/bottom/left notches and rounded corners, in px
//   data-width                   xs (<360)  sm (<480)  md (<768)  lg (<1100)  xl
// Pages should still prefer rem, %, dvh and clamp(); these exist for the few things CSS cannot know.

const root = document.documentElement

function widthClass(w) {
  if (w < 360) return 'xs'
  if (w < 480) return 'sm'
  if (w < 768) return 'md'
  if (w < 1100) return 'lg'
  return 'xl'
}

// CSS can read env(safe-area-inset-*) but JavaScript cannot, so measure it with a hidden element
function measureSafeAreas() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;'
    + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);'
  root.appendChild(probe)
  const cs = getComputedStyle(probe)
  const px = (v) => Math.max(0, Math.round(parseFloat(v) || 0))
  const safe = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) }
  probe.remove()
  return safe
}

export function measureViewport() {
  const vv = window.visualViewport
  const height = Math.round(vv?.height || window.innerHeight)
  const width = Math.round(vv?.width || window.innerWidth)
  const safe = measureSafeAreas()

  root.style.setProperty('--app-height', `${height}px`)
  root.style.setProperty('--app-width', `${width}px`)
  root.style.setProperty('--safe-top', `${safe.top}px`)
  root.style.setProperty('--safe-right', `${safe.right}px`)
  root.style.setProperty('--safe-bottom', `${safe.bottom}px`)
  root.style.setProperty('--safe-left', `${safe.left}px`)
  root.dataset.width = widthClass(width)
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; measureViewport() })
}

measureViewport()
window.addEventListener('resize', schedule)
window.addEventListener('orientationchange', schedule)
window.visualViewport?.addEventListener('resize', schedule)
