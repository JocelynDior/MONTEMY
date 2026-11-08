import React from 'react'
import { useT } from '../../i18n'

// Grey shimmering placeholders shown while data loads (the shimmer is in styles/theme.css)
export function Skeleton({ height = '1rem', width = '100%', radius = '0.5rem', style }) {
  return <div className="sk" aria-hidden="true" style={{ height, width, borderRadius: radius, maxWidth: '100%', ...style }} />
}

// A few stacked bars: the default for "this page's data is loading"
export default function SkeletonList({ rows = 3 }) {
  const t = useT()
  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')} style={{ display: 'grid', gap: '0.8rem', padding: '0.25rem 0' }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height="4.2rem" radius="0.875rem" />)}
    </div>
  )
}

// Placeholder for a dashboard's card grid
export function SkeletonCards({ count = 6 }) {
  const t = useT()
  return (
    <div role="status" aria-busy="true" aria-label={t('common.loading')}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(15rem, 100%), 1fr))', gap: 'var(--sp-4)', marginTop: 'var(--sp-5)' }}>
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} height="8rem" radius="1rem" />)}
    </div>
  )
}
