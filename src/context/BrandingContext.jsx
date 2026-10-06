import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from './AuthContext'

// ---- Defaults (Montemy) ----
export const DEFAULT_BRANDING = {
  appName: 'Montemy',
  primaryColor: '#40E0D0',
  bgColor: '#001F3F',
  logoUrl: '',
  faviconUrl: '',
}

const CACHE_KEY = 'montemy_branding'
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

// ---- Colour helpers ----
const hexToRgb = (hex) => {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const clamp = (v) => Math.max(0, Math.min(255, v))
const toHex = (rgb) => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const scale = (rgb, f) => rgb.map(v => clamp(v * f))
const mixWhite = (rgb, t) => rgb.map(v => clamp(v + (255 - v) * t))
const rgbStr = (rgb) => rgb.map(Math.round).join(', ')

// Turns a branding object into the full set of CSS variables
function buildTheme(b) {
  const p = hexToRgb(b.primaryColor)
  const bg = hexToRgb(b.bgColor)
  const defaultPrimary = b.primaryColor.toLowerCase() === DEFAULT_BRANDING.primaryColor.toLowerCase()
  const defaultBg = b.bgColor.toLowerCase() === DEFAULT_BRANDING.bgColor.toLowerCase()

  // Default colours use the exact original shades; custom colours get derived shades
  const pDark = defaultPrimary ? [32, 178, 170] : scale(p, 0.8)
  const bg2 = defaultBg ? [0, 51, 102] : scale(bg, 1.62)
  const bgLight = defaultBg ? [10, 42, 74] : mixWhite(bg, 0.05)
  const bgDark = defaultBg ? [0, 26, 53] : scale(bg, 0.82)

  return {
    '--color-primary': toHex(p),
    '--color-primary-rgb': rgbStr(p),
    '--color-primary-dark': toHex(pDark),
    '--color-primary-dark-rgb': rgbStr(pDark),
    '--color-bg': toHex(bg),
    '--color-bg-rgb': rgbStr(bg),
    '--color-bg-2': toHex(bg2),
    '--color-bg-2-rgb': rgbStr(bg2),
    '--color-bg-light': toHex(bgLight),
    '--color-bg-light-rgb': rgbStr(bgLight),
    '--color-bg-dark': toHex(bgDark),
    '--color-bg-dark-rgb': rgbStr(bgDark),
  }
}

// Cleans whatever is stored in organizations.branding; anything invalid falls back to defaults
export function normalizeBranding(raw) {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = null }
  }
  if (!raw || typeof raw !== 'object' || raw.enabled === false) return DEFAULT_BRANDING
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  return {
    appName: str(raw.appName) || DEFAULT_BRANDING.appName,
    primaryColor: HEX.test(str(raw.primaryColor)) ? str(raw.primaryColor) : DEFAULT_BRANDING.primaryColor,
    bgColor: HEX.test(str(raw.bgColor)) ? str(raw.bgColor) : DEFAULT_BRANDING.bgColor,
    logoUrl: str(raw.logoUrl),
    faviconUrl: str(raw.faviconUrl),
  }
}

// Writes the theme to the page: CSS variables, tab title, theme colour, favicon
function applyTheme(b) {
  const root = document.documentElement
  Object.entries(buildTheme(b)).forEach(([k, v]) => root.style.setProperty(k, v))

  document.title = b.appName

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', b.bgColor)

  let icon = document.querySelector('link[data-branding-icon]')
  if (b.faviconUrl) {
    if (!icon) {
      icon = document.createElement('link')
      icon.rel = 'icon'
      icon.setAttribute('data-branding-icon', '1')
      document.head.appendChild(icon)
    }
    icon.href = b.faviconUrl
  } else if (icon) {
    icon.remove()
  }
}

// Last-used branding is cached so a refresh doesn't flash the default colours
const readCache = () => {
  try { return normalizeBranding(localStorage.getItem(CACHE_KEY)) } catch { return DEFAULT_BRANDING }
}
const writeCache = (b) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch { /* ignore */ } }
const clearCache = () => { try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ } }

const BrandingContext = createContext(null)

export function BrandingProvider({ children }) {
  const { session, profile, loading, initializing } = useAuth()
  const [branding, setBranding] = useState(readCache)

  // Apply before paint whenever branding changes
  useLayoutEffect(() => { applyTheme(branding) }, [branding])

  const userId = session?.user?.id
  const orgId = profile?.org_id

  useEffect(() => {
    if (initializing) return

    // Signed out -> default Montemy branding
    if (!session) {
      setBranding(DEFAULT_BRANDING)
      clearCache()
      return
    }
    if (loading) return // profile still loading; keep what we have

    // No organisation (e.g. admin) -> default branding
    if (!orgId) {
      setBranding(DEFAULT_BRANDING)
      clearCache()
      return
    }

    let cancelled = false
    supabase
      .from('organizations')
      .select('branding')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('Could not load branding:', error.message)
          return // keep current theme
        }
        const next = normalizeBranding(data?.branding)
        setBranding(next)
        writeCache(next)
      })
    return () => { cancelled = true }
  }, [initializing, loading, userId, orgId])

  const isWhiteLabel =
    branding.appName !== DEFAULT_BRANDING.appName ||
    branding.primaryColor.toLowerCase() !== DEFAULT_BRANDING.primaryColor.toLowerCase() ||
    branding.bgColor.toLowerCase() !== DEFAULT_BRANDING.bgColor.toLowerCase() ||
    !!branding.logoUrl

  return (
    <BrandingContext.Provider value={{ branding, ...branding, isWhiteLabel }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used inside <BrandingProvider>')
  return ctx
}
