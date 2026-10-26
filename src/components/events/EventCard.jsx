import React from 'react'
import { Chip, ghostBtn, muted, panel, smallBtn } from '../parent/parentUi'
import { fmtLongDate, fmtTime, TYPE_COLORS } from './eventUtils'

// One event: details, RSVP buttons, headcounts (principal/admin) and edit/delete (when allowed)
export default function EventCard({ ev, past, canRsvp, rsvpBusy, onRsvp, confirmDelete, onAskDelete, onDelete, onEdit }) {
  const mine = ev.myRsvp
  const pill = (active, color) => ({
    ...smallBtn, background: active ? color : 'transparent', color: active ? '#04202c' : 'white',
    border: `1px solid ${active ? color : 'rgba(255,255,255,0.3)'}`, boxShadow: 'none', fontWeight: active ? 700 : 400,
  })

  return (
    <div style={{ ...panel, marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>{ev.title}</span>
        <span style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {ev.isPlatform && <Chip color="#ffd166">Platform-wide</Chip>}
          {ev.type && <Chip color={TYPE_COLORS[ev.type] || '#8fd3ff'}>{ev.type}</Chip>}
        </span>
      </div>
      <div style={{ ...muted, fontSize: '0.85rem', marginTop: '0.3rem' }}>
        {fmtLongDate(ev.date)}, {fmtTime(ev.date)}{ev.location ? ` · ${ev.location}` : ''}
      </div>
      {ev.description && <p style={{ ...muted, marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{ev.description}</p>}

      {ev.counts && (
        <p style={{ ...muted, fontSize: '0.85rem', marginTop: '0.6rem' }}>
          RSVPs: {ev.counts.attending} attending · {ev.counts.notAttending} not attending
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.9rem', flexWrap: 'wrap' }}>
        {!past && canRsvp && (
          <>
            <button disabled={rsvpBusy} aria-pressed={mine === 'attending'}
              onClick={() => onRsvp(ev, mine === 'attending' ? null : 'attending')} style={pill(mine === 'attending', '#7be3b1')}>
              {mine === 'attending' ? '✓ Attending' : 'Attending'}
            </button>
            <button disabled={rsvpBusy} aria-pressed={mine === 'not_attending'}
              onClick={() => onRsvp(ev, mine === 'not_attending' ? null : 'not_attending')} style={pill(mine === 'not_attending', '#ff9b9b')}>
              {mine === 'not_attending' ? '✓ Not attending' : 'Not attending'}
            </button>
          </>
        )}
        {past && mine && <span style={{ ...muted, fontSize: '0.8rem' }}>You answered: {mine === 'attending' ? 'attending' : 'not attending'}</span>}

        {ev.canEdit && (confirmDelete === ev.id ? (
          <>
            <span style={{ fontSize: '0.85rem', color: '#ffaaaa' }}>Delete this event for everyone?</span>
            <button onClick={() => onDelete(ev.id)} style={{ ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }}>Yes, delete</button>
            <button onClick={() => onAskDelete(null)} style={ghostBtn}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => onEdit(ev)} style={ghostBtn}>Edit</button>
            <button onClick={() => onAskDelete(ev.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>Delete</button>
          </>
        ))}
      </div>
    </div>
  )
}
