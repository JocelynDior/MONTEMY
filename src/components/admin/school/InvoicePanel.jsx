import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '../../../api/apiClient'
import { useApiData } from '../../../hooks/useApiData'
import { Chip, ErrorBox, ghostBtn, muted, panel, smallBtn } from '../../parent/parentUi'
import { glassInput } from '../../../styles/glass'
import SkeletonList from '../../shared/Skeleton'

const dangerBtn = { ...smallBtn, background: 'rgba(255,80,80,0.85)', color: 'white', boxShadow: 'none' }
const opt = { color: '#000' }
const FREQUENCIES = ['once', 'monthly', 'termly', 'annually']

function statusColor(s) {
  if (s === 'paid') return '#7CFC9A'
  if (s === 'cancelled') return '#ff8f8f'
  return '#ffd166'
}

export default function InvoicePanel({ orgId }) {
  const { t } = useTranslation('admin')
  const { data, loading, error, reload } = useApiData(`/api/billing/admin/${orgId}/invoices`)
  const [form, setForm] = useState({ description: '', amount: '', currency: 'ZAR', frequency: 'once' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.description.trim()) return setCreateError(t('school.invoice.descRequired'))
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return setCreateError(t('school.invoice.amtRequired'))
    setCreating(true); setCreateError('')
    try {
      await apiFetch(`/api/billing/admin/${orgId}/invoices`, {
        method: 'POST',
        body: { description: form.description.trim(), amount: amt, currency: form.currency, frequency: form.frequency },
      })
      setForm({ description: '', amount: '', currency: 'ZAR', frequency: 'once' })
      reload()
    } catch (err) {
      setCreateError(err.message)
    }
    setCreating(false)
  }

  const cancel = async (id) => {
    setBusy(true)
    try {
      await apiFetch(`/api/billing/admin/${orgId}/invoices/${id}/cancel`, { method: 'POST' })
      setConfirmId(null); reload()
    } catch {}
    setBusy(false)
  }

  const invoices = data?.invoices || []

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Create form */}
      <div style={panel}>
        <p style={{ ...muted, fontSize: '0.88rem', marginBottom: '0.75rem' }}>{t('school.invoice.createHeading')}</p>
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <input value={form.description} onChange={e => set('description', e.target.value)} maxLength={120}
            placeholder={t('school.invoice.descPlaceholder')} style={glassInput} />
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <input value={form.amount} onChange={e => set('amount', e.target.value)} type="number" min="0" step="0.01"
              placeholder={t('school.invoice.amount')} style={{ ...glassInput, flex: '1 1 100px' }} />
            <input value={form.currency} onChange={e => set('currency', e.target.value.toUpperCase())} maxLength={3}
              placeholder="ZAR" style={{ ...glassInput, width: '5rem' }} />
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} style={{ ...glassInput, flex: '1 1 110px' }}>
              {FREQUENCIES.map(f => <option key={f} value={f} style={opt}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          {createError && <p role="alert" style={{ color: '#ffb3b3', fontSize: '0.9rem' }}>{createError}</p>}
          <button disabled={creating} onClick={create} style={smallBtn}>
            {creating ? '…' : t('school.invoice.create')}
          </button>
        </div>
      </div>

      {/* Invoice list */}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <SkeletonList />}
      {data && invoices.length === 0 && (
        <div style={{ ...panel, ...muted, textAlign: 'center', padding: '2rem' }}>{t('school.invoice.none')}</div>
      )}

      {invoices.map(inv => (
        <div key={inv.id} style={{ ...panel, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <div style={{ fontWeight: 600 }}>{inv.description}</div>
            <div style={{ ...muted, fontSize: '0.82rem' }}>{inv.currency} {Number(inv.amount).toFixed(2)} · {inv.frequency}</div>
          </div>
          <Chip color={statusColor(inv.status)}>{inv.status}</Chip>
          {inv.status !== 'cancelled' && inv.status !== 'paid' && (
            confirmId === inv.id ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button disabled={busy} onClick={() => cancel(inv.id)} style={dangerBtn}>{busy ? '…' : t('school.invoice.yesCancel')}</button>
                <button onClick={() => setConfirmId(null)} style={ghostBtn}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmId(inv.id)} style={{ ...ghostBtn, color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.5)' }}>
                {t('school.invoice.cancel')}
              </button>
            )
          )}
        </div>
      ))}
    </div>
  )
}
