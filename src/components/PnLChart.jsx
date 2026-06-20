import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useState, useMemo } from 'react'

const tabs = ['30D', '7D', 'All']

function buildCumulativeData(trades) {
  if (!trades.length) return []
  let running = 0
  return trades
    .filter(t => t.pnl != null)
    .map(t => {
      running += parseFloat(t.pnl)
      return { date: t.date, pnl: parseFloat(running.toFixed(2)) }
    })
}

function getLastTradeDate(withPnl) {
  if (!withPnl.length) return new Date()
  // trades are date strings like 'YYYY-MM-DD' — max string compare works for that format
  const maxDateStr = withPnl.reduce((max, t) => (t.date > max ? t.date : max), withPnl[0].date)
  return new Date(maxDateStr)
}

function filterTrades(trades, tab, account) {
  const withPnl = trades.filter(t => t.pnl != null)
  if (tab === 'All') return withPnl

  // Anchor to the account's last trade date, not today — so old/inactive
  // accounts still show their last real activity instead of an empty window.
  const anchor = getLastTradeDate(withPnl)

  if (tab === '7D') {
    const cutoff = new Date(anchor)
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return withPnl.filter(t => t.date >= cutoffStr)
  }
  if (tab === '30D') {
    const cutoff = new Date(anchor)
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return withPnl.filter(t => t.date >= cutoffStr)
  }
  return withPnl
}

// Calculate where zero sits as a % from top, for the gradient split
function getZeroPercent(data) {
  if (!data.length) return 0
  const values = data.map(d => d.pnl)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = max - min
  if (range === 0) return 0
  // zero from top = max / range
  return Math.max(0, Math.min(1, max / range))
}

function SplitGradient({ id, zeroPercent }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {/* Green zone — above zero */}
        <stop offset="0%"               stopColor="var(--brand)" stopOpacity={0.25} />
        <stop offset={`${zeroPercent * 100}%`} stopColor="var(--brand)" stopOpacity={0.04} />
        {/* Red zone — below zero */}
        <stop offset={`${zeroPercent * 100}%`} stopColor="var(--red)" stopOpacity={0.04} />
        <stop offset="100%"             stopColor="var(--red)" stopOpacity={0.25} />
      </linearGradient>
    </defs>
  )
}

export default function PnLChart({ trades = [], account, noMargin, mobile }) {
  const [activeTab, setActiveTab] = useState('All')

  const data = useMemo(() => {
    const filtered = filterTrades(trades, activeTab, account)
    return buildCumulativeData(filtered)
  }, [trades, activeTab, account])

  const isEmpty = data.length === 0
  const chartData = isEmpty ? [{ date: '—', pnl: 0 }] : data

  const totalPnl = data.length > 0 ? data[data.length - 1].pnl : 0
  const isPositive = totalPnl >= 0
  const zeroPercent = getZeroPercent(data)
  const lineColor = isPositive ? 'var(--brand)' : 'var(--red)'

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px 8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Cumulative P&L
            </span>
            {!isEmpty && (
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: isPositive ? 'var(--brand)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                {isPositive ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? 'var(--green-bg)' : 'transparent',
                border: '0.5px solid',
                borderColor: activeTab === tab ? 'var(--green-bg-2)' : 'var(--border-color)',
                borderRadius: '5px', padding: '3px 8px',
                color: activeTab === tab ? 'var(--brand)' : 'var(--text-faint)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}>{tab}</button>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint-2)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
            No trades in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={130} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <SplitGradient id="splitGradMobile" zeroPercent={zeroPercent} />
              <XAxis dataKey="date" stroke="var(--text-faint-2)" tick={{ fill: 'var(--text-faint)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} tickLine={false} axisLine={false} tickFormatter={d => d && d.length >= 10 ? String(parseInt(d.slice(8, 10), 10)) : d} />
              <YAxis stroke="var(--text-faint-2)" tick={{ fill: 'var(--text-faint)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} width={38} />
              <ReferenceLine y={0} stroke="var(--text-faint-2)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="pnl" stroke={lineColor} strokeWidth={2} fill="url(#splitGradMobile)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
      borderRadius: '12px', padding: '24px',
      marginBottom: noMargin ? 0 : '24px',
      flex: noMargin ? 1 : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0' }}>Cumulative P&L</h2>
          {!isEmpty && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '13px', color: isPositive ? 'var(--brand)' : 'var(--red)' }}>
              {isPositive ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? 'var(--green-bg)' : 'transparent',
              border: '0.5px solid',
              borderColor: activeTab === tab ? 'var(--green-bg-2)' : 'var(--border-color)',
              borderRadius: '6px', padding: '5px 12px',
              color: activeTab === tab ? 'var(--brand)' : 'var(--text-faint)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint-2)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
          No trades in this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
          <AreaChart data={chartData}>
            <SplitGradient id="splitGradDesktop" zeroPercent={zeroPercent} />
            <XAxis dataKey="date" stroke="var(--text-faint-2)" tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'DM Mono, monospace' }} />
            <YAxis stroke="var(--text-faint-2)" tick={{ fill: 'var(--text-faint)', fontSize: 11, fontFamily: 'DM Mono, monospace' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}
              formatter={v => [`$${v}`, 'P&L']}
            />
            <ReferenceLine y={0} stroke="var(--text-faint-2)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="pnl" stroke={lineColor} strokeWidth={2} fill="url(#splitGradDesktop)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}