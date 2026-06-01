// src/components/ScoreCard.jsx
import { useState, useMemo } from 'react'

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function computeMaxDrawdown(trades) {
  if (!trades || trades.length === 0) return 0
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
  let peak = 0, cumPnl = 0, maxDD = 0
  for (const t of sorted) {
    cumPnl += t.pnl || 0
    if (cumPnl > peak) peak = cumPnl
    const dd = peak - cumPnl
    if (dd > maxDD) maxDD = dd
  }
  return maxDD
}

function computeConsistency(trades) {
  // Group by day
  const byDay = {}
  for (const t of trades) {
    if (!byDay[t.date]) byDay[t.date] = 0
    byDay[t.date] += parseFloat(t.pnl) || 0
  }
  const vals = Object.values(byDay)
  if (vals.length < 2) return vals.length === 1 ? 0.7 : 0

  // Use average absolute daily P&L as the reference scale.
  // This works regardless of whether the trader is net positive,
  // net negative, or has BE (zero) days mixed in.
  const avgAbs = vals.reduce((s, v) => s + Math.abs(v), 0) / vals.length

  // If every single day was $0 there is nothing to measure
  if (avgAbs === 0) return 0

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
  const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length)

  // Normalised std: how large is the spread relative to the typical day size
  // A value of 0 means every day was identical — perfect consistency
  // A value >= 3 means extremely erratic — score 0
  const normStd = std / avgAbs
  return Math.max(0, Math.min(1, 1 - normStd / 3))
}

function computeScores(trades) {
  if (!trades || trades.length === 0) {
    return { winRate: 0, profitFactor: 0, avgWinLoss: 0, maxDrawdown: 0, consistency: 0, recovery: 0, overall: 0 }
  }

  const wins   = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const grossWin  = wins.reduce((s, t) => s + (t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))
  const totalPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0)

  // Raw metrics
  const rawWinRate     = trades.length ? wins.length / trades.length : 0
  const rawPF          = grossLoss === 0 ? (grossWin > 0 ? 5 : 0) : grossWin / grossLoss
  const avgWin         = wins.length   ? grossWin / wins.length   : 0
  const avgLoss        = losses.length ? grossLoss / losses.length : 0
  const rawAvgWL       = avgLoss === 0 ? (avgWin > 0 ? 5 : 0) : avgWin / avgLoss
  const rawMaxDD       = computeMaxDrawdown(trades)
  const rawConsistency = computeConsistency(trades)
  const rawRecovery    = rawMaxDD === 0 ? (totalPnl > 0 ? 5 : 0) : totalPnl / rawMaxDD

  // Normalize each to 0-100
  const winRateScore     = Math.min(100, rawWinRate * 160)
  const pfScore          = Math.min(100, (rawPF / 3) * 100)
  const avgWLScore       = Math.min(100, (rawAvgWL / 3) * 100)
  const ddRef            = grossWin > 0 ? grossWin : 1
  const ddRatio          = rawMaxDD / ddRef
  const maxDDScore       = Math.max(0, Math.min(100, (1 - ddRatio) * 100))
  const consistencyScore = Math.min(100, rawConsistency * 100)
  const recoveryScore    = Math.min(100, (rawRecovery / 3) * 100)

  const overall = Math.round(
    winRateScore     * 0.20 +
    pfScore          * 0.25 +
    avgWLScore       * 0.15 +
    maxDDScore       * 0.15 +
    consistencyScore * 0.15 +
    recoveryScore    * 0.10
  )

  return {
    winRate:      Math.round(winRateScore),
    profitFactor: Math.round(pfScore),
    avgWinLoss:   Math.round(avgWLScore),
    maxDrawdown:  Math.round(maxDDScore),
    consistency:  Math.round(consistencyScore),
    recovery:     Math.round(recoveryScore),
    overall,
  }
}

// ─── Radar geometry ───────────────────────────────────────────────────────────

const CX = 130, CY = 118, R = 82

function axisPoint(i, r) {
  const a = -Math.PI / 2 + (2 * Math.PI / 6) * i
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function hexPoints(r) {
  return Array.from({ length: 6 }, (_, i) => axisPoint(i, r))
}

function toPolyStr(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function dataPoints(scores) {
  // Order must match axisLabels: Win%, ProfitFactor, MaxDrawdown, Recovery, AvgWinLoss, Consistency
  const keys = ['winRate', 'profitFactor', 'maxDrawdown', 'recovery', 'avgWinLoss', 'consistency']
  return keys.map((k, i) => {
    const val = Math.max(0.02, Math.min(1, scores[k] / 100))
    return axisPoint(i, R * val)
  })
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const DICT = [
  { key: 'Win %',          def: 'Percentage of trades closed in profit.' },
  { key: 'Profit Factor',  def: "Gross profit divided by gross loss. Above 1 means you're profitable." },
  { key: 'Avg Win/Loss',   def: 'Your average winning trade size vs average losing trade size.' },
  { key: 'Recovery Factor',def: 'Net profit divided by max drawdown. Higher means faster recovery.' },
  { key: 'Max Drawdown',   def: 'Largest peak-to-trough loss. Higher score = smaller drawdown relative to gains.' },
  { key: 'Consistency',    def: 'How similar your daily P&L results are to each other. Less erratic swings = higher score.' },
]

function InfoTooltip({ show }) {
  if (!show) return null
  return (
    <div style={{
      position: 'absolute', top: '22px', left: 0,
      background: '#161616', border: '0.5px solid #2a2a2a',
      borderRadius: '10px', padding: '12px 14px', width: '230px',
      zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      {DICT.map(d => (
        <div key={d.key} style={{ marginBottom: '9px' }}>
          <div style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: '#1db97b', fontWeight: '600', marginBottom: '2px' }}>{d.key}</div>
          <div style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', color: '#777', lineHeight: '1.5' }}>{d.def}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScoreCard({ trades, mobile }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const scores = useMemo(() => computeScores(trades), [trades])
  const dataPts = useMemo(() => dataPoints(scores), [scores])
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0]

  const axisLabels = [
    { lines: ['Win %'],           anchor: 'middle', dx: 0,   dy: -10 },
    { lines: ['Profit', 'Factor'],anchor: 'start',  dx: 10,  dy: -2  },
    { lines: ['Max', 'Drawdown'], anchor: 'start',  dx: 10,  dy: -2  },
    { lines: ['Recovery'],        anchor: 'middle', dx: 0,   dy: 14  },
    { lines: ['Avg', 'Win/Loss'], anchor: 'end',    dx: -10, dy: -2  },
    { lines: ['Consis-', 'tency'],anchor: 'end',    dx: -10, dy: -2  },
  ]

  const card = {
    background: '#111',
    border: '0.5px solid #1e1e1e',
    borderRadius: '12px',
    padding: mobile ? '14px' : '20px',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', position: 'relative' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: '600', color: '#aaa' }}>Score</span>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(v => !v)}
          style={{
            background: 'none', border: '0.5px solid #2a2a2a', borderRadius: '50%',
            width: '16px', height: '16px', color: '#777', fontSize: '9px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, lineHeight: 1, position: 'relative',
          }}
        >
          i
        </button>
        <InfoTooltip show={showTooltip} />
      </div>

      {/* Radar SVG */}
      <svg viewBox={`0 0 ${CX * 2} ${CY * 2 + 20}`} width="100%" style={{ flex: 1, minHeight: 0 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="scoreFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1db97b" stopOpacity="0.38"/>
            <stop offset="100%" stopColor="#1db97b" stopOpacity="0.08"/>
          </radialGradient>
        </defs>

        {/* Grid rings */}
        {gridRings.map((pct, i) => (
          <polygon
            key={i}
            points={toPolyStr(hexPoints(R * pct))}
            fill="none"
            stroke={pct === 1.0 ? '#282828' : '#1e1e1e'}
            strokeWidth="0.7"
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const pt = axisPoint(i, R)
          return <line key={i} x1={CX} y1={CY} x2={pt.x.toFixed(1)} y2={pt.y.toFixed(1)} stroke="#1e1e1e" strokeWidth="0.7" />
        })}

        {/* Axis labels */}
        {Array.from({ length: 6 }, (_, i) => {
          const outer = axisPoint(i, R + 16)
          const lbl   = axisLabels[i]
          const x = (outer.x + lbl.dx).toFixed(1)
          const baseY = (outer.y + lbl.dy).toFixed(1)
          return (
            <text
              key={i}
              x={x}
              y={baseY}
              textAnchor={lbl.anchor}
              fill="#666"
              fontSize="9"
              fontFamily="DM Sans, sans-serif"
            >
              {lbl.lines.map((line, li) => (
                <tspan key={li} x={x} dy={li === 0 ? '0' : '11'}>
                  {line}
                </tspan>
              ))}
            </text>
          )
        })}

        {/* Data polygon */}
        <polygon
          points={toPolyStr(dataPts)}
          fill="url(#scoreFill)"
          stroke="#1db97b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Data dots */}
        {dataPts.map((pt, i) => (
          <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r="3.5" fill="#1db97b" />
        ))}
      </svg>

      {/* Score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '10px', color: '#777', marginBottom: '2px' }}>Your Score</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: '700', color: '#f0f0f0', lineHeight: 1 }}>
            {scores.overall}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666', marginBottom: '4px', fontFamily: 'DM Mono, monospace' }}>
            {[0, 20, 40, 60, 80, 100].map(n => <span key={n}>{n}</span>)}
          </div>
          <div style={{ height: '5px', background: '#181818', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${scores.overall}%`,
              background: 'linear-gradient(to right, #c03535, #c97a00, #e8d44d, #1db97b)',
              borderRadius: '3px',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}