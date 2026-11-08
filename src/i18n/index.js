// Language system.
//
//   const t = useT()
//   t('common.save')                          -> "Save" in the user's language
//   t('common.installTitle', { appName })     -> "Install Montemy"
//
// A key is "namespace.word". Every file in src/i18n/ns/ is a namespace and is loaded automatically:
//   export default { en: { word: 'Word' }, zu: { word: '...' }, ... }
// A missing word falls back to the language's fallback, then English, then shows the key itself.
// This file has no JSX on purpose, so it can stay a plain .js file.

import { createContext, createElement, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, isSupportedLanguage } from './languages'

const KEY = 'montemy_language'

// ---- Word files: one file per namespace, each holding all languages ----
const loaders = import.meta.glob('./ns/*.js')
const dictionary = {}
let loading = null

function loadAll() {
  if (!loading) {
    loading = Promise.allSettled(Object.entries(loaders).map(async ([path, load]) => {
      const ns = path.split('/').pop().replace(/\.js$/, '')
      const mod = await load()
      dictionary[ns] = mod.default || {}
    }))
  }
  return loading
}

function translate(lang, key, vars) {
  const dot = String(key).indexOf('.')
  const ns = dot === -1 ? 'common' : key.slice(0, dot)
  const word = dot === -1 ? key : key.slice(dot + 1)
  const entry = dictionary[ns]
  let text
  if (entry) {
    for (const code of [lang, getLanguage(lang).fallback, DEFAULT_LANGUAGE]) {
      const v = entry[code]?.[word]
      if (typeof v === 'string' && v) { text = v; break }
    }
  }
  if (text === undefined) return key
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text
}

// ---- Which language to start in: saved choice, then the phone's language, then English ----
function detectLanguage() {
  try {
    const saved = localStorage.getItem(KEY)
    if (isSupportedLanguage(saved)) return saved
  } catch { /* ignore */ }
  const phone = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || []
  for (const tag of phone) {
    const lower = String(tag || '').toLowerCase()
    if (isSupportedLanguage(lower)) return lower
    const base = lower.split('-')[0]
    if (base === 'tl') return 'fil'
    if (isSupportedLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}

// Writes <html lang> and <html dir> (rtl for Arabic and Urdu)
export function applyDocumentLanguage(code) {
  const l = getLanguage(code)
  const root = document.documentElement
  root.lang = l.htmlLang
  root.dir = l.rtl ? 'rtl' : 'ltr'
}

// Called once in main.jsx before React renders
export function applyInitialLanguage() {
  applyDocumentLanguage(detectLanguage())
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLanguage)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    loadAll().then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [])

  useLayoutEffect(() => { applyDocumentLanguage(lang) }, [lang])

  // Saved on this device. Settings also saves it to users.preferred_language, and after sign-in the app
  // calls setLang() with that value.
  const setLang = useCallback((code) => {
    if (!isSupportedLanguage(code)) return
    try { localStorage.setItem(KEY, code) } catch { /* ignore */ }
    setLangState(code)
  }, [])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang, ready])

  const value = useMemo(
    () => ({ lang, setLang, t, languages: LANGUAGES, rtl: getLanguage(lang).rtl }),
    [lang, setLang, t],
  )

  // The word files are precached, so this blank moment lasts a few milliseconds
  if (!ready) return null
  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

export const useT = () => useI18n().t
