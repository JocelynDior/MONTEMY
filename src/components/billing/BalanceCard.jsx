import { useT } from '../../i18n/index.js'
import React from 'react'
import { panel, panelTitle, muted } from '../parent/parentUi'
import Icon from '../shared/Icon'

function fmt(cents, currency) {
  const amount = (cents / 100).toFixed(2)
  return `${currency} ${amount}`
}

export default function BalanceCard({ billing }) {
  const t = useT()

  if (!billing) {
    return (
      <div style={panel}>
        <h3 style={panelTitle}>{t('billing.balance')}</h3>
        <p style={muted}>{t('billing.noBilling')}</p>
      </div>
    )
  }

  const { balance_cents, currency, recurring, recurring_interval, recurring_cents, next_due_date, billing_active } = billing
  const overdue = balance_cents > 0 && next_due_date && new Date(next_due_date) < new Date()

  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h3 style={panelTitle}>{t('billing.balance')}</h3>
        {!billing_active && (
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.6rem' }}>
            {t('billing.inactive')}
          </span>
        )}
      </div>

      <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, color: balance_cents > 0 ? 'var(--fg)' : 'var(--muted)', marginTop: '0.25rem' }}>
        {fmt(balance_cents, currency)}
      </div>

      {overdue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--fg)', fontSize: 'var(--fs-sm)', marginTop: '0.4rem' }}>
          <Icon name="info" size={14} />
          {t('billing.overdue')}
        </div>
      )}

      {recurring && recurring_cents && (
        <p style={{ ...muted, marginTop: '0.5rem', fontSize: 'var(--fs-sm)' }}>
          {t('billing.recurringInfo', { amount: fmt(recurring_cents, currency), interval: recurring_interval })}
          {next_due_date ? ` · ${t('billing.nextDue', { date: new Date(next_due_date).toLocaleDateString() })}` : ''}
        </p>
      )}
    </div>
  )
}
