import React from 'react'

// Small dependency-free SVG charts, so no charting library is added to the bundle.
const AXIS = 'rgba(255,255,255,0.18)'
const TEXT = 'rgba(255,255,255,0.7)'

// points: [{ label, value (0-100), title? }] in the order they should appear, left to right
export function LineChart({ points, color = 'var(--color-primary)', ariaLabel }) {
  const W = 600, H = 220, pl = 36, pr = 14, pt = 14, pb = 30
  const n = points.length
  const x = (i) => (n === 1 ? pl + (W - pl - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1))
  const y = (v) => pt + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - pt - pb)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  // Show at most 6 x labels so they never overlap
  const step = Math.max(1, Math.ceil(n / 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={AXIS} strokeDasharray={v === 50 ? '4 4' : undefined} />
          <text x={pl - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={TEXT}>{v}</text>
        </g>
      ))}
      {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="1">
            <title>{p.title || `${p.label}: ${p.value}%`}</title>
          </circle>
          {i % step === 0 && <text x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill={TEXT}>{p.label}</text>}
        </g>
      ))}
    </svg>
  )
}

// bars: [{ label, value, color? }]. Heights scale to the largest value.
export function BarChart({ bars, ariaLabel }) {
  const W = 600, H = 220, pl = 12, pr = 12, pt = 22, pb = 30
  const max = Math.max(1, ...bars.map(b => b.value))
  const slot = (W - pl - pr) / bars.length
  const bw = Math.min(56, slot * 0.7)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke={AXIS} />
      {bars.map((b, i) => {
        const h = (b.value / max) * (H - pt - pb)
        const cx = pl + slot * i + slot / 2
        return (
          <g key={b.label}>
            <rect x={cx - bw / 2} y={H - pb - h} width={bw} height={Math.max(h, b.value ? 2 : 0)} rx="4"
              fill={b.color || 'var(--color-primary)'} opacity="0.85">
              <title>{`${b.label}: ${b.value}`}</title>
            </rect>
            <text x={cx} y={H - pb - h - 6} fontSize="12" textAnchor="middle" fill="white">{b.value}</text>
            <text x={cx} y={H - 10} fontSize="11" textAnchor="middle" fill={TEXT}>{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
