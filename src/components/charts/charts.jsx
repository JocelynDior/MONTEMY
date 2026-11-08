import React, { useId, useLayoutEffect, useRef, useState } from 'react'

// Small dependency-free SVG charts, so no charting library is added to the bundle.
// Black and white only: bars are told apart by fill pattern (solid, hatched, dotted, crossed, grey) and by
// their printed labels and values, never by colour alone, so they read the same in Dark and Light.
// The chart is drawn at its real on-screen width, so text stays a readable size even at 320px.
const AXIS = 'rgba(var(--fg-rgb), 0.25)'
const TEXT = 'var(--fg-muted)'
const LABEL_STYLE = { fontSize: '0.75rem', fontFamily: 'inherit' }
const H = 220

// Width of the box the chart sits in, kept up to date when the screen changes size or turns
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const measure = () => setWidth(Math.max(160, Math.round(el.clientWidth) || 600))
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// points: [{ label, value (0-100), title? }] in the order they should appear, left to right
export function LineChart({ points, color = 'var(--fg)', ariaLabel }) {
  const [ref, W] = useWidth()
  const pl = 32, pr = 14, pt = 14, pb = 30
  const n = points.length
  const x = (i) => (n === 1 ? pl + (W - pl - pr) / 2 : pl + (i * (W - pl - pr)) / (n - 1))
  const y = (v) => pt + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - pt - pb)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  // As many x labels as fit (about 56px each), so they never overlap
  const fit = Math.max(1, Math.floor((W - pl - pr) / 56))
  const step = Math.max(1, Math.ceil(n / fit))

  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ display: 'block', maxWidth: '100%' }}>
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke={AXIS} strokeDasharray={v === 50 ? '4 4' : undefined} />
            <text x={pl - 6} y={y(v) + 4} textAnchor="end" fill={TEXT} style={LABEL_STYLE}>{v}</text>
          </g>
        ))}
        {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r="4.5" fill={color} stroke="var(--bg)" strokeWidth="1.5">
              <title>{p.title || `${p.label}: ${p.value}%`}</title>
            </circle>
            {i % step === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fill={TEXT} style={LABEL_STYLE}>{p.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  )
}

// Fill patterns, in the order bars use them. Each is drawn with the foreground colour.
const PATTERNS = [
  { id: 'solid' },
  { id: 'hatch', draw: <path d="M-1,5 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="var(--fg)" strokeWidth="1.6" /> },
  { id: 'dots', draw: <circle cx="4" cy="4" r="1.6" fill="var(--fg)" /> },
  { id: 'cross', draw: <path d="M0,0 l8,8 M8,0 l-8,8" stroke="var(--fg)" strokeWidth="1.2" /> },
  { id: 'grey' },
]

// bars: [{ label, value }]. Heights scale to the largest value. A colour on a bar is ignored: the
// pattern (and the label under the bar) tells bars apart.
export function BarChart({ bars, ariaLabel }) {
  const [ref, W] = useWidth()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pl = 12, pr = 12, pt = 22, pb = 30
  const max = Math.max(1, ...bars.map(b => b.value))
  const slot = (W - pl - pr) / Math.max(1, bars.length)
  const bw = Math.min(56, slot * 0.7)
  // Show every k-th x label when bars are close together, and shorten long labels to fit
  const k = Math.max(1, Math.ceil(46 / slot))
  const maxChars = Math.max(3, Math.floor((slot * k) / 7))
  const short = (s) => (String(s).length > maxChars ? `${String(s).slice(0, maxChars - 1)}…` : String(s))
  const fillFor = (i) => {
    const p = PATTERNS[i % PATTERNS.length]
    return p.id === 'solid' ? 'var(--fg)' : p.id === 'grey' ? 'var(--fg-subtle)' : `url(#${uid}-${p.id})`
  }

  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          {PATTERNS.filter(p => p.draw).map(p => (
            <pattern key={p.id} id={`${uid}-${p.id}`} width="8" height="8" patternUnits="userSpaceOnUse">
              <rect width="8" height="8" fill="var(--bg)" />
              {p.draw}
            </pattern>
          ))}
        </defs>
        <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke={AXIS} />
        {bars.map((b, i) => {
          const h = (b.value / max) * (H - pt - pb)
          const cx = pl + slot * i + slot / 2
          return (
            <g key={`${b.label}-${i}`}>
              <rect x={cx - bw / 2} y={H - pb - h} width={bw} height={Math.max(h, b.value ? 2 : 0)} rx="4"
                fill={fillFor(i)} stroke="var(--fg)" strokeWidth="1.5">
                <title>{`${b.label}: ${b.value}`}</title>
              </rect>
              <text x={cx} y={H - pb - h - 6} textAnchor="middle" fill="var(--fg)" style={{ ...LABEL_STYLE, fontWeight: 700 }}>{b.value}</text>
              {i % k === 0 && (() => {
                // Keep the first and last labels inside the chart instead of running off its edge
                const text = short(b.label)
                const half = (text.length * 6.5) / 2
                const anchor = cx - half < 2 ? 'start' : cx + half > W - 2 ? 'end' : 'middle'
                const lx = anchor === 'start' ? 2 : anchor === 'end' ? W - 2 : cx
                return <text x={lx} y={H - 10} textAnchor={anchor} fill={TEXT} style={LABEL_STYLE}>{text}</text>
              })()}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
