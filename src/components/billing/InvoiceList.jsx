import { useT } from '../../i18n/index.js'
import React from 'react'
import { panel, panelTitle, muted } from '../parent/parentUi'

const STATUS_COLORS = {
  open:      'var(--fg)',
  paid:      'var(--muted)',
  cancelled: 'var(--muted)',
  void:      'var(--muted)',
}

function fmt(cents, currency) {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

export default function InvoiceList({ invoices = [], currency = 'ZAR' }) {
  const t = useT()

  return (
    <div style={panel}>
      <h3 style={panelTitle}>{t('billing.invoices')}</h3>

      {invoices.length === 0
        ? <p style={muted}>{t('billing.noInvoices')}</p>
        : (
          <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr>
                  {['billing.number','billing.description','billing.amount','billing.due','billing.status'].map(k => (
                    <th key={k} style={{ textAlign: 'left', padding: '0.4rem 0.6rem', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                      {t(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      <strong>{inv.number}</strong>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)' }}>
                      {inv.description || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {fmt(inv.amount_cents, inv.currency ?? currency)}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: STATUS_COLORS[inv.status] ?? 'var(--fg)' }}>
                      {t(`billing.status_${inv.status}`, { defaultValue: inv.status })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  )
}
