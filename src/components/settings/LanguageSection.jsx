import React, { useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { apiFetch } from '../../api/apiClient'
import Icon from '../shared/Icon'
import { glassInput } from '../../styles/glass'
import { muted, panel, panelTitle } from '../parent/parentUi'
import { SavedNote } from './AppearanceSection'

// The 33 languages, each written in its own language. The words change at once; the choice is saved to the account
// (users.preferred_language) so the Help assistant answers in it too.
export default function LanguageSection() {
  const { t, lang, setLang, languages } = useI18n()
  const [query, setQuery] = useState('')
  const [note, setNote] = useState({ text: '', error: '' })

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? languages.filter(l => l.native.toLowerCase().includes(q) || l.code.includes(q)) : languages
  }, [languages, query])

  const choose = async (code) => {
    setLang(code)
    setNote({ text: '', error: '' })
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: { preferredLanguage: code } })
      setNote({ text: t('settings.saved'), error: '' })
    } catch { setNote({ text: t('settings.savedHere'), error: '' }) }
  }

  return (
    <section id="language" style={{ ...panel, marginBottom: 'var(--sp-4)' }}>
      <h3 style={panelTitle}>{t('settings.language')}</h3>
      <p style={{ ...muted, marginBottom: '0.8rem' }}>{t('settings.languageText')}</p>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('settings.searchLanguage')} aria-label={t('settings.searchLanguage')} style={{ ...glassInput, marginBottom: '0.75rem' }} />
      <div role="radiogroup" aria-label={t('settings.language')} style={{ maxHeight: '16rem', overflowY: 'auto', display: 'grid', gap: '0.4rem' }}>
        {shown.map(l => {
          const on = l.code === lang
          return (
            <button key={l.code} type="button" role="radio" aria-checked={on} lang={l.htmlLang || l.code} onClick={() => choose(l.code)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', width: '100%', textAlign: 'start', padding: '0.65rem 0.9rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', minHeight: '2.75rem',
                color: 'var(--fg)', background: on ? 'var(--surface-2)' : 'var(--surface)', border: on ? '2px solid var(--fg)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: on ? 700 : 400 }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{l.native}</span>
              {on && <Icon name="check" />}
            </button>
          )
        })}
        {shown.length === 0 && <p style={muted}>{t('settings.noLanguage')}</p>}
      </div>
      <SavedNote text={note.text} error={note.error} />
    </section>
  )
}
