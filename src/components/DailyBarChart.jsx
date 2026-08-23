import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { useMemo, useState } from 'react'
import { useTheme } from '../ThemeContext'

function toLocalDateStr(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getLastTradeDate(trades) {
  const withPnl = trades.filter(t => t.pnl != null)
  if (!withPnl.length) return new Date()
  const maxDateStr = withPnl.reduce((max, t) => (t.date > max ? t.date : max), withPnl[0].date)
  return new Date(maxDateStr)
}

function getLast7Data(trades) {
  const map = {}
  trades.filter(t => t.pnl != null).forEach(t => {
    if (!map[t.date]) map[t.date] = 0
    map[t.date] = parseFloat((map[t.date] + parseFloat(t.pnl)).toFixed(2))
  })
  const anchor = getLastTradeDate(trades)
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor)
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateStr(d)
    if (dateStr in map) {
      days.push({ label: dateStr.slice(5), date: dateStr, pnl: map[dateStr] })
    }
  }
  return days
}

function getLast30Data(trades) {
  const map = {}
  trades.filter(t => t.pnl != null).forEach(t => {
    if (!map[t.date]) map[t.date] = 0
    map[t.date] = parseFloat((map[t.date] + parseFloat(t.pnl)).toFixed(2))
  })
  const anchor = getLastTradeDate(trades)
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(anchor)
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateStr(d)
    if (dateStr in map) {
      days.push({ label: String(new Date(d).getDate()), date: dateStr, pnl: map[dateStr] })
    }
  }
  return days
}

function getMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthlyData(trades, monthsCount = 6) {
  const map = {}
  trades.filter(t => t.pnl != null).forEach(t => {
    const key = t.date.slice(0, 7) // "YYYY-MM"
    map[key] = parseFloat(((map[key] || 0) + parseFloat(t.pnl)).toFixed(2))
  })
  const anchor = getLastTradeDate(trades)

  // Pull one extra month before the window so the first bar can also show growth
  const prevWindowDate = new Date(anchor.getFullYear(), anchor.getMonth() - monthsCount, 1)
  const prevWindowKey = getMonthKey(prevWindowDate)
  let priorPnl = prevWindowKey in map ? map[prevWindowKey] : null

  const months = []
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const key = getMonthKey(d)
    const pnl = key in map ? map[key] : 0
    const growthPct = priorPnl == null || priorPnl === 0 ? null : ((pnl - priorPnl) / Math.abs(priorPnl)) * 100
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      date: key,
      pnl,
      growthPct,
    })
    priorPnl = pnl
  }
  return months
}

const toggleStyle = (active) => ({
  background: active ? 'var(--border-color)' : 'transparent',
  border: `0.5px solid var(--border-color-2)`,
  borderRadius: '6px',
  color: active ? 'var(--text-primary)' : 'var(--text-faint)',
  padding: '3px 10px',
  cursor: 'pointer',
  fontFamily: 'DM Mono, monospace',
  fontSize: '10px',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
})

export default function DailyBarChart({ trades = [], mobile = false }) {
  const { isLight } = useTheme()
  const [view, setView] = useState('30d')
  const data = useMemo(() => {
    if (view === '7d') return getLast7Data(trades)
    if (view === '30d') return getLast30Data(trades)
    return getMonthlyData(trades)
  }, [trades, view])
  const hasData = data.some(d => d.pnl !== 0)
  const noDataLabel = view === '7d' ? '7 days' : view === '30d' ? '30 days' : '6 months'

  // Resolved hex for Recharts direct props (these don't go through CSS, so var() won't resolve here)
  const chart = {
    brand: isLight ? '#169c69' : '#1db97b',
    red: isLight ? '#e0524f' : '#c03535',
    neutral: isLight ? '#d8d8da' : '#222222',
    axisStroke: isLight ? '#a8a8ab' : '#555555',
    tickFill: isLight ? '#8a8a8d' : '#777777',
  }

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '10px 14px 10px' }}>
        {/* Header row: label + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif' }}>{view === '6m' ? 'Monthly PnL' : 'Daily PnL'}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={toggleStyle(view === '7d')} onClick={() => setView('7d')}>7d</button>
            <button style={toggleStyle(view === '30d')} onClick={() => setView('30d')}>30d</button>
            <button style={toggleStyle(view === '6m')} onClick={() => setView('6m')}>6m</button>
          </div>
        </div>

        {!hasData ? (
          <div style={{ height: '52px', display: 'flex', alignItems: 'center', color: 'var(--text-faint-2)', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
            No trades in the last {noDataLabel}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={52} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
            <BarChart data={data} barSize={view === '30d' ? 6 : view === '6m' ? 22 : 16} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <YAxis domain={[(dataMin) => Math.min(0, dataMin), (dataMax) => Math.max(0, dataMax)]} hide />
              <ReferenceLine y={0} stroke={chart.neutral} />
              <Bar dataKey="pnl" radius={[0, 0, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl > 0 ? chart.brand : entry.pnl < 0 ? chart.red : chart.neutral} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)',
      borderRadius: '12px', padding: '24px',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: 0 }}>
          {view === '6m' ? 'Monthly P&L — Last 6 Months' : `Daily P&L — ${view === '7d' ? 'Last 7 Days' : 'Last 30 Days'}`}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={toggleStyle(view === '7d')} onClick={() => setView('7d')}>Last 7 days</button>
          <button style={toggleStyle(view === '30d')} onClick={() => setView('30d')}>Last 30 days</button>
          <button style={toggleStyle(view === '6m')} onClick={() => setView('6m')}>Last 6 months</button>
        </div>
      </div>
      {!hasData ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint-2)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
          No trades in the last {noDataLabel}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
          <BarChart data={data} barSize={view === '30d' ? 14 : view === '6m' ? 40 : 36}>
            <XAxis dataKey="label" stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: 'DM Mono, monospace' }} />
            <YAxis
              domain={[(dataMin) => Math.min(0, dataMin), (dataMax) => Math.max(0, dataMax)]}
              stroke={chart.axisStroke}
              tick={{ fill: chart.tickFill, fontSize: 11, fontFamily: 'DM Mono, monospace' }}
              tickFormatter={v => `$${v}`}
            />
            <Tooltip
              cursor={false}
              contentStyle={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)', borderRadius: '8px', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}
              itemStyle={{ color: 'var(--text-primary)' }}
              labelStyle={{ color: 'var(--text-soft)' }}
              formatter={(v, _name, props) => {
                if (view === '6m') {
                  const g = props.payload.growthPct
                  const growthStr = g == null ? '' : ` (${g >= 0 ? '+' : ''}${g.toFixed(1)}% vs prior mo.)`
                  return [`$${v}${growthStr}`, props.payload.monthLabel]
                }
                return [`$${v}`, props.payload.date]
              }}
              labelFormatter={() => ''}
            />
            <ReferenceLine y={0} stroke={chart.neutral} />
            <Bar dataKey="pnl" radius={[0, 0, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl > 0 ? chart.brand : entry.pnl < 0 ? chart.red : chart.neutral} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}