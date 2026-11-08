import React from 'react'
import { useT } from '../../i18n'

export default function LoadingScreen() {
  const t = useT()
  return (
    <div role="status" aria-label={t('common.loading')}
      style={{ minHeight: 'var(--app-height)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '3rem', height: '3rem', border: '0.25rem solid rgba(var(--fg-rgb), 0.2)', borderTopColor: 'var(--fg)', borderRadius: '50%', animation: 'montemy-spin 0.9s linear infinite' }} />
    </div>
  )
}
