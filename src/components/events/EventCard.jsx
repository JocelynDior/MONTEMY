import React from 'react'
import { useT } from '../../i18n/index.js'
import { Chip, ghostBtn, muted, panel, smallBtn } from '../parent/parentUi'
import Icon from '../shared/Icon'
import { fmtLongDate, fmtTime, typeStyle } from './eventUtils'

// One event: details, RSVP buttons, headcounts (principal/admin) and edit/delete (when allowed)
export default function EventCard({ ev, past, canRsvp, rsvpBusy, onRsvp, confirmDelete, onAskDelete, onDelete, onEdit }) {
  const t = useT()
  const mine = ev.myRsvp
  const pill = (active) => ({
    ...smallBtn, background: active ? 'var(--fg)' : 'transparent', color: active ? 'var(--color-bg)' : 'var(--fg)',
    border: `1px solid ${active ? 'var(--fg)' : 'rgba(128,128,128,0.4)'}`, boxShadow: 'none', fontWeight: active ? 700 : 400,
  })
  const typeKey = String(ev.type || 'general').toLowerCase()
  const typeLabel = t(`shared.events.types.${typeKey}`) === `shared.events.types.${typeKey}` ? ev.type : t(`shared.events.types.${typeKey}`)

  return (
    <div style={{ ...panel, marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>{ev.title}</span>
        <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ev.isPlatform && <Chip color="#ffd166">{t('shared.events.platformWide')}</Chip>}
          {ev.type && <Chip color="#8fd3ff">{typeLabel}</Chip>}
        </span>
      </div>
      <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem' }}>
        {fmtLongDate(ev.date)}, {fmtTime(ev.date)}{ev.location ? ` · ${ev.location}` : ''}
      </div>
      {ev.description && <p style={{ ...muted, marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{ev.description}</p>}

      {ev.counts && (
        <p style={{ ...muted, fontSize: '0.85rem', marginTop: '0.6rem' }}>
          {t('shared.events.rsvpCounts', { attending: ev.counts.attending, notAttending: ev.counts.notAttending })}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        {!past && canRsvp && (
          <>
            <button disabled={rsvpBusy} aria-pressed={mine === 'attending'}
              onClick={() => onRsvp(ev, mine === 'attending' ? null : 'attending')} style={pill(mine === 'attending')}>
              {mine === 'attending' && <Icon name="check" size={13} style={{ marginRight: '0.3rem' }} />}{t('shared.events.attending')}
            </button>
            <button disabled={rsvpBusy} aria-pressed={mine === 'not_attending'}
              onClick={() => onRsvp(ev, mine === 'not_attending' ? null : 'not_attending')} style={pill(mine === 'not_attending')}>
              {mine === 'not_attending' && <Icon name="check" size={13} style={{ marginRight: '0.3rem' }} />}{t('shared.events.notAttending')}
            </button>
          </>
        )}
        {past && mine && <span style={{ ...muted, fontSize: '0.8rem' }}>{t('shared.events.youAnswered', { answer: mine === 'attending' ? t('shared.events.attending') : t('shared.events.notAttending') })}</span>}

        {ev.canEdit && (confirmDelete === ev.id ? (
          <>
            <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>{t('shared.events.confirmDelete')}</span>
            <button onClick={() => onDelete(ev.id)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>{t('shared.events.yesDelete')}</button>
            <button onClick={() => onAskDelete(null)} style={ghostBtn}>{t('shared.cancel')}</button>
          </>
        ) : (
          <>
            <button onClick={() => onEdit(ev)} style={ghostBtn}><Icon name="pencil" size={13} style={{ marginRight: '0.3rem' }} />{t('shared.edit')}</button>
            <button onClick={() => onAskDelete(ev.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}><Icon name="trash" size={13} style={{ marginRight: '0.3rem' }} />{t('shared.delete')}</button>
          </>
        ))}
      </div>
    </div>
  )
}
