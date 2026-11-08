import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Dark, Light or Default. Default (called 'system' in code) follows the phone's own setting and
// changes live when the phone switches. The choice is saved on this device. Settings also saves it to
// users.preferred_theme (PUT /api/account/profile) and, after sign-in, the app calls setTheme() with that value.
export const THEME_CHOICES = ['system', 'light', 'dark']

const KEY = 'montemy_theme'
const BAR = { dark: '#000000', light: '#ffffff' }   // browser bar colour (the app is black and white)

const readChoice = () => {
  try {
    const v = localStorage.getItem(KEY)
    return THEME_CHOICES.includes(v) ? v : 'system'
  } catch { return 'system' }
}

const phoneTheme = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' } catch { return 'dark' }
}

const resolveTheme = (choice) => (choice === 'light' || choice === 'dark' ? choice : phoneTheme())

// Puts the theme on the page: <html data-theme>, the native colour scheme and the browser bar colour.
// index.html has one theme-color tag for each phone setting; a fixed choice sets both so the bar always matches.
function paintTheme(choice) {
  const resolved = resolveTheme(choice)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const media = meta.getAttribute('media') || ''
    const own = media.includes('dark') ? 'dark' : media.includes('light') ? 'light' : resolved
    meta.setAttribute('content', BAR[choice === 'system' ? own : resolved])
  })
  return resolved
}

// Called once in main.jsx before React renders, so there is no flash of the wrong theme
export function applyInitialTheme() {
  paintTheme(readChoice())
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readChoice)
  const [resolved, setResolved] = useState(() => resolveTheme(readChoice()))

  useEffect(() => { setResolved(paintTheme(theme)) }, [theme])

  // Default: follow the phone live
  useEffect(() => {
    if (theme !== 'system') return undefined
    let mq
    try { mq = window.matchMedia('(prefers-color-scheme: dark)') } catch { return undefined }
    const onChange = () => setResolved(paintTheme('system'))
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [theme])

  const setTheme = useCallback((choice) => {
    if (!THEME_CHOICES.includes(choice)) return
    try { localStorage.setItem(KEY, choice) } catch { /* private mode: the choice lasts until the page closes */ }
    setThemeState(choice)
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// theme    = what the user chose ('system' | 'light' | 'dark')
// resolved = what is actually showing ('light' | 'dark')
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
