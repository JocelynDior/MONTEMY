import { useT } from '../../i18n/index.js'
import React, { useState } from 'react'
import StudentPage from '../../components/student/StudentPage'
import { ErrorBox, muted, panel, panelTitle } from '../../components/parent/parentUi'
import { useApiData } from '../../hooks/useApiData'
import SkeletonList from '../../components/shared/Skeleton'
import BalanceCard from '../../components/billing/BalanceCard'
import InvoiceList from '../../components/billing/InvoiceList'
import AddCardForm from '../../components/billing/AddCardForm'
import { glassBtn } from '../../styles/glass'
import Icon from '../../components/shared/Icon'

export default function PrincipalBilling() {
  const t = useT()
  const { data, loading, error, reload } = useApiData('/api/billing')
  const [showAddCard, setShowAddCard] = useState(false)
  const [removing, setRemoving] = useState(null)

  async function removeCard(id) {
    setRemoving(id)
    try {
      await fetch(`/api/billing/card/${id}`, { method: 'DELETE' })
      reload()
    } finally {
      setRemoving(null) }
  }

  return (
    <StudentPage title={t('billing.title')} icon="CreditCard" backPath="/principal/dashboard">
      {loading && !data && <SkeletonList />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <BalanceCard billing={data.billing} />
          <InvoiceList invoices={data.invoices} currency={data.billing?.currency ?? 'ZAR'} />

          {/* Saved cards */}
          <div style={panel}>
            <h3 style={panelTitle}>{t('billing.savedCards')}</h3>

            {data.cards.length === 0 && !showAddCard && (
              <p style={{ ...muted, marginBottom: '0.75rem' }}>{t('billing.noCards')}</p>
            )}

            {data.cards.map(card => (
              <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Icon name="creditCard" size={18} />
                  <span>
                    <strong>{card.brand}</strong>
                    {' ·· '}{card.last4}
                    {' '}<span style={muted}>{card.exp_month}/{card.exp_year}</span>
                    {card.holder_name && <span style={{ ...muted, marginLeft: '0.5rem' }}>{card.holder_name}</span>}
                    {card.is_default && (
                      <span style={{ marginLeft: '0.5rem', fontSize: 'var(--fs-xs)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                        {t('billing.default')}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => removeCard(card.id)}
                  disabled={removing === card.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem' }}
                  aria-label={t('common:delete')}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}

            {showAddCard
              ? <div style={{ marginTop: '1rem' }}><AddCardForm onSaved={() => { setShowAddCard(false); reload() }} onCancel={() => setShowAddCard(false)} /></div>
              : (
                <button onClick={() => setShowAddCard(true)} style={{ ...glassBtn, width: 'auto', padding: '0.6rem 1.4rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Icon name="plus" size={16} />
                  {t('billing.addCard')}
                </button>
              )
            }
          </div>
        </div>
      )}
    </StudentPage>
  )
}
