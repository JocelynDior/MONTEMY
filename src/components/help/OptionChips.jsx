import React from 'react'
import { useT } from '../../i18n'
import Icon from '../shared/Icon'
import AvatarPicker from '../settings/AvatarPicker'
import { glassBtn } from '../../styles/glass'
import { LANGUAGES } from '../../i18n/languages'

// What the AI asked the app to show under its message (message.options, saved with the message):
//   { type: 'options', kind: 'avatar', choices: [keys] }     pick a picture
//   { type: 'options', kind: 'choices', choices: [text...] }  quick answers
//   { type: 'open_page', page, label }                        a button that opens a page
//   { type: 'avatar_changed' } / { type: 'language_changed' } a short confirmation
// onPick(text) sends a chat message; onOpen(page) goes to the page; disabled after the person answered.
export default function OptionChips({ options, onPick, onOpen, disabled }) {
  const t = useT()
  if (!Array.isArray(options) || options.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.5rem', maxWidth: 'min(92%, 34rem)' }}>
      {options.map((o, i) => {
        if (o.type === 'options' && o.kind === 'avatar') {
          return (
            <div key={i} style={{ border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', background: 'var(--surface)' }}>
              <AvatarPicker value="" disabled={disabled} size="3rem" onChange={(key) => onPick(t('help.pickedAvatar', { key }), { avatarKey: key })} />
            </div>
          )
        }
        if (o.type === 'options' && o.kind === 'choices') {
          return (
            <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(o.choices || []).map(c => (
                <button key={c} type="button" disabled={disabled} onClick={() => onPick(c)}
                  style={{ padding: '0.5rem 1rem', minHeight: '2.5rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--fg)', cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', opacity: disabled ? 0.6 : 1 }}>{c}</button>
              ))}
            </div>
          )
        }
        if (o.type === 'open_page') {
          return (
            <div key={i}>
              <button type="button" onClick={() => onOpen(o.page)} style={{ ...glassBtn, width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {o.label || t('help.openPage')}<Icon name="chevron" />
              </button>
            </div>
          )
        }
        if (o.type === 'avatar_changed') return <Confirm key={i} text={t('help.avatarChanged')} />
        if (o.type === 'language_changed') {
          const name = LANGUAGES.find(l => l.code === o.language)?.native
          return <Confirm key={i} text={name ? t('help.languageChangedTo', { name }) : t('help.languageChanged')} />
        }
        return null
      })}
    </div>
  )
}

function Confirm({ text }) {
  return <div role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--fs-sm)', color: 'var(--fg-muted)' }}><Icon name="check" />{text}</div>
}
