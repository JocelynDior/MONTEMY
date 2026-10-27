import React from 'react'

// Grey shimmering placeholders shown while data loads (the shimmer is in styles/theme.css)
export function Skeleton({ height = '1rem', width = '100%', radius = '8px', style }) {
  return <div className="sk" aria-hidden="true" style={{ height, width, borderRadius: radius, ...style }} />
}

// A few stacked bars: the default for "this page's data is loading"
export default function SkeletonList({ rows = 3 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" style={{ display: 'grid', gap: '0.8rem', padding: '0.25rem 0' }}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height="4.2rem" radius="14px" />)}
    </div>
  )
}

// Placeholder for a dashboard's card grid
export function SkeletonCards({ count = 6 }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} height="8rem" radius="16px" />)}
    </div>
  )
}
