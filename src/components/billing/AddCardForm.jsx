import { useT } from '../../i18n/index.js'
import React, { useState } from 'react'
import { ErrorBox, panelTitle, muted } from '../parent/parentUi'
import { glassBtn, glassInput } from '../../styles/glass'
import { panel } from '../parent/parentUi'
import Icon from '../shared/Icon'

const CARD_BRANDS = ['Visa', 'Mastercard', 'Amex', 'Discover', 'Other']

export default function AddCardForm({ onSaved, onCancel }) {
  const t = useT()
  const [brand, setBrand] = useState('Visa')
  const [last4, setLast4] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [holderName, setHolderName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    if (!/^[0-9]{4}$/.test(last4)) { setError(t('billing.invalidLast4')); return }
    const month = parseInt(expMonth, 10)
    const year  = parseInt(expYear, 10)
    if (month < 1 || month > 12 || year < new Date().getFullYear()) { setError(t('billing.invalidExpiry')); return }

    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/billing/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, last4, expMonth: month, expYear: year, holderName }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Error') }
      const card = await res.json()
      onSaved?.(card)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={panel}>
      <h3 style={panelTitle}>{t('billing.addCard')}</h3>
      <p style={{ ...muted, fontSize: 'var(--fs-sm)', marginBottom: '1rem' }}>
        {t('billing.addCardNote')}
      </p>

      {error && <ErrorBox message={error} />}

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.75rem' }}>
        {/* Card brand */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginBottom: '0.3rem' }}>
            {t('billing.brand')}
          </label>
          <select value={brand} onChange={e => setBrand(e.target.value)} style={{ ...glassInput, width: '100%' }}>
            {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Last 4 digits */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginBottom: '0.3rem' }}>
            {t('billing.last4')}
          </label>
          <input
            type="text" inputMode="numeric" maxLength={4} pattern="[0-9]{4}"
            placeholder="1234"
            value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ ...glassInput, width: '100%' }}
            required
          />
        </div>

        {/* Expiry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginBottom: '0.3rem' }}>
              {t('billing.expMonth')}
            </label>
            <input type="number" min="1" max="12" placeholder="MM"
              value={expMonth} onChange={e => setExpMonth(e.target.value)}
              style={{ ...glassInput, width: '100%' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginBottom: '0.3rem' }}>
              {t('billing.expYear')}
            </label>
            <input type="number" min={new Date().getFullYear()} max={new Date().getFullYear() + 20} placeholder="YYYY"
              value={expYear} onChange={e => setExpYear(e.target.value)}
              style={{ ...glassInput, width: '100%' }} required />
          </div>
        </div>

        {/* Holder name */}
        <div>
          <label style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--muted)', marginBottom: '0.3rem' }}>
            {t('billing.holderName')}
          </label>
          <input type="text" placeholder={t('billing.holderNamePlaceholder')}
            value={holderName} onChange={e => setHolderName(e.target.value)}
            style={{ ...glassInput, width: '100%' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="submit" disabled={saving} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name="check" size={16} />
            {saving ? t('common:loading') : t('billing.saveCard')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem', background: 'transparent' }}>
              {t('common:cancel')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
