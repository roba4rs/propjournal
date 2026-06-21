import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'
import { computeAccountMetrics } from '../lib/accountMetrics'

// ─── Design tokens (matches rest of app) ────────────────────────────
const T = {
  bg:         'var(--bg-page)',
  card:       'var(--bg-surface)',
  cardBorder: 'var(--border-color)',
  stat:       'var(--bg-hover)',
  statBorder: 'var(--border-color)',
  green:      'var(--brand)',
  red:        'var(--red)',
  amber:      'var(--amber)',
  blue:       'var(--blue)',
  muted:      'var(--text-faint)',
  sub:        'var(--text-muted)',
  text:       'var(--text-secondary)',
}

const font = {
  heading: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
}

// Groups (pair/session) with fewer trades than this render amber, not
// green/red — too early to call a trend. Tune freely.
const LOW_SAMPLE_THRESHOLD = 5

// ─── Helpers ───────────────────────────────────────────────────────
function pnlColor(v) { return v > 0 ? T.green : v < 0 ? T.red : T.muted }

function fmtPct(v, decimals = 1) {
  if (v == null || !isFinite(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(decimals) + '%'
}

function fmtPF(v) {
  if (v == null) return '—'
  return isFinite(v) ? v.toFixed(2) : '∞'
}

function fmtSigned(v, decimals = 1) {
  if (v == null || !isFinite(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(decimals)
}

// health status → badge styling
const HEALTH = {
  healthy: { emoji: '🟢', label: 'Healthy', color: T.green },
  neutral: { emoji: '🟡', label: 'Neutral', color: T.amber },
  risk:    { emoji: '🔴', label: 'Risk',    color: T.red   },
}

// ── Calendar-aligned date ranges (Mon–Sun / 1st–end of month) ───────
function ymd(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}
function endOfWeek(d) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  return e
}
function startOfMonth(d) { const date = new Date(d); return new Date(date.getFullYear(), date.getMonth(), 1) }
function endOfMonth(d)   { const date = new Date(d); return new Date(date.getFullYear(), date.getMonth() + 1, 0) }

function getRanges(period, now = new Date()) {
  if (period === 'month') {
    const curStart = startOfMonth(now), curEnd = endOfMonth(now)
    const prevAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { curStart, curEnd, prevStart: startOfMonth(prevAnchor), prevEnd: endOfMonth(prevAnchor) }
  }
  const curStart = startOfWeek(now), curEnd = endOfWeek(now)
  const prevAnchor = new Date(now); prevAnchor.setDate(prevAnchor.getDate() - 7)
  return { curStart, curEnd, prevStart: startOfWeek(prevAnchor), prevEnd: endOfWeek(prevAnchor) }
}

function tradesInRange(trades, start, end) {
  const s = ymd(start), e = ymd(end)
  return trades.filter(t => t.date >= s && t.date <= e)
}

function weekdayShort(dateStr) {
  try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }) }
  catch { return '' }
}

// % P&L of a single trade, relative to its OWN account's size — this is
// what makes trades comparable across pairs/sessions/accounts with
// different risk sizing (per master prompt: use % not RR).
function tradePct(trade, account) {
  const size = parseFloat(account?.account_size) || 0
  if (!size || trade.pnl == null) return 0
  return (parseFloat(trade.pnl) / size) * 100
}

// ── Aggregate stats for a set of trades (period comparison, account-level avg win/loss) ──
function computeStats(trades, accountsById) {
  const withPnl = trades.filter(t => t.pnl != null)
  let bestTrade = null, worstTrade = null
  const pcts = []
  withPnl.forEach(t => {
    const pct = tradePct(t, accountsById[t.account_id])
    pcts.push(pct)
    if (!bestTrade || pct > bestTrade.pct) bestTrade = { pct, pair: t.pair, weekday: weekdayShort(t.date) }
    if (!worstTrade || pct < worstTrade.pct) worstTrade = { pct, pair: t.pair, weekday: weekdayShort(t.date) }
  })
  const wins = pcts.filter(p => p > 0)
  const losses = pcts.filter(p => p < 0)
  const netPnlPct = pcts.reduce((s, p) => s + p, 0)
  const grossWinPct = wins.reduce((s, p) => s + p, 0)
  const grossLossPct = Math.abs(losses.reduce((s, p) => s + p, 0))
  const profitFactor = grossLossPct > 0 ? grossWinPct / grossLossPct : (grossWinPct > 0 ? Infinity : 0)
  return {
    tradeCount: withPnl.length,
    winRate: withPnl.length ? (wins.length / withPnl.length) * 100 : 0,
    netPnlPct, profitFactor,
    avgWin: wins.length ? grossWinPct / wins.length : 0,
    avgLoss: losses.length ? losses.reduce((s, p) => s + p, 0) / losses.length : 0,
    winsCount: wins.length, lossesCount: losses.length,
    bestTrade, worstTrade,
  }
}

// ── Group breakdown (by pair / by session) ──────────────────────────
function computeGroupBreakdown(trades, accountsById, keyFn) {
  const groups = {}
  trades.forEach(t => {
    if (t.pnl == null) return
    const key = keyFn(t)
    if (!key) return
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  return Object.entries(groups).map(([key, list]) => {
    const pcts = list.map(t => tradePct(t, accountsById[t.account_id]))
    const wins = pcts.filter(p => p > 0)
    const losses = pcts.filter(p => p < 0)
    const netPnlPct = pcts.reduce((s, p) => s + p, 0)
    const grossWinPct = wins.reduce((s, p) => s + p, 0)
    const grossLossPct = Math.abs(losses.reduce((s, p) => s + p, 0))
    return {
      key,
      count: list.length,
      winRate: list.length ? (wins.length / list.length) * 100 : 0,
      avgWin: wins.length ? grossWinPct / wins.length : 0,
      avgLoss: losses.length ? losses.reduce((s, p) => s + p, 0) / losses.length : 0,
      profitFactor: grossLossPct > 0 ? grossWinPct / grossLossPct : (grossWinPct > 0 ? Infinity : 0),
      netPnlPct,
      lowSample: list.length < LOW_SAMPLE_THRESHOLD,
    }
  }).sort((a, b) => b.netPnlPct - a.netPnlPct)
}

// ── Lifetime equity sparkline points (handwritten SVG, no axes) ─────
function buildSparklinePoints(trades, width = 280, height = 44) {
  const withPnl = trades.filter(t => t.pnl != null).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  if (!withPnl.length) return null
  let cum = 0
  const series = withPnl.map(t => { cum += parseFloat(t.pnl); return cum })
  const min = Math.min(0, ...series), max = Math.max(0, ...series)
  const range = (max - min) || 1
  const n = series.length
  return series.map((v, i) => {
    const x = n === 1 ? width : (i / (n - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

// ─── Sub-components ────────────────────────────────────────────────
function Card({ children, style, mobile = false }) {
  return (
    <div style={{
      background: T.card, border: `0.5px solid ${T.cardBorder}`,
      borderRadius: mobile ? 10 : 12,
      padding: mobile ? '14px' : '24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children, mobile = false, style }) {
  return (
    <div style={{ fontFamily: font.heading, fontSize: mobile ? 12 : 13, fontWeight: 600,
                  color: T.sub, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: mobile ? 12 : 16, ...style }}>
      {children}
    </div>
  )
}

function EmptyState({ message = 'No challenge accounts yet.' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '48px 0', color: T.muted }}>
      <div style={{ fontFamily: font.mono, fontSize: 28, marginBottom: 12, opacity: 0.3 }}>◌</div>
      <div style={{ fontFamily: font.body, fontSize: 13 }}>{message}</div>
    </div>
  )
}

function Skeleton({ h = 20, w = '100%', r = 8, mb = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, var(--border-color) 25%, var(--bg-surface-2) 50%, var(--border-color) 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function Divider({ label, mobile }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: mobile ? '12px 0' : '16px 0' }}>
      <div style={{ flex: 1, height: 0.5, background: T.cardBorder }} />
      <div style={{ fontFamily: font.mono, fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 0.5, background: T.cardBorder }} />
    </div>
  )
}

// ── Period Comparison (8-stat grid, week/month toggle) ───────────────
// `period` / `onPeriodChange` are controlled by the parent so By Pair / By
// Session (rendered separately) can share the same week/month window.
function PeriodComparison({ trades, accountsById, mobile, period, onPeriodChange, periodLabel = 'vs last' }) {
  const { curStart, curEnd, prevStart, prevEnd } = useMemo(() => getRanges(period), [period])

  const curStats = useMemo(() => computeStats(tradesInRange(trades, curStart, curEnd), accountsById), [trades, accountsById, curStart, curEnd])
  const prevStats = useMemo(() => computeStats(tradesInRange(trades, prevStart, prevEnd), accountsById), [trades, accountsById, prevStart, prevEnd])

  const unitLabel = period === 'week' ? 'week' : 'month'
  const subLabel = period === 'week'
    ? `This week (Mon–Sun) ${periodLabel} week`
    : `This month (1st–end) ${periodLabel} month`

  const Toggle = ({ value, children }) => (
    <div
      onClick={() => onPeriodChange(value)}
      style={{
        padding: '6px 16px', cursor: 'pointer', fontFamily: font.mono, fontSize: 12,
        color: period === value ? T.blue : T.sub,
        background: period === value ? 'rgba(59,130,196,0.15)' : 'transparent',
      }}
    >
      {children}
    </div>
  )

  const deltaNum = (curr, prev) => curr - prev
  const deltaColor = (d) => d > 0 ? T.green : d < 0 ? T.red : T.muted

  const stats = [
    {
      label: 'Net P&L',
      value: fmtPct(curStats.netPnlPct), valueColor: pnlColor(curStats.netPnlPct),
      delta: (() => { const d = deltaNum(curStats.netPnlPct, prevStats.netPnlPct); return { text: `${fmtSigned(d)}% ${periodLabel} ${unitLabel}`, color: deltaColor(d) } })(),
    },
    {
      label: 'Win rate',
      value: `${curStats.winRate.toFixed(0)}%`, valueColor: T.text,
      delta: (() => { const d = deltaNum(curStats.winRate, prevStats.winRate); return { text: `${fmtSigned(d, 0)}% ${periodLabel} ${unitLabel}`, color: deltaColor(d) } })(),
    },
    {
      label: 'Trades taken',
      value: curStats.tradeCount, valueColor: T.text,
      delta: (() => { const d = curStats.tradeCount - prevStats.tradeCount; return { text: `${fmtSigned(d, 0)} ${periodLabel} ${unitLabel}`, color: deltaColor(d) } })(),
    },
    {
      label: 'Profit factor',
      value: fmtPF(curStats.profitFactor), valueColor: T.text,
      delta: (() => { const d = isFinite(curStats.profitFactor) && isFinite(prevStats.profitFactor) ? curStats.profitFactor - prevStats.profitFactor : 0; return { text: `${fmtSigned(d, 2)} ${periodLabel} ${unitLabel}`, color: deltaColor(d) } })(),
    },
    {
      label: 'Avg win',
      value: fmtPct(curStats.avgWin), valueColor: T.green,
      delta: { text: `${curStats.winsCount} winner${curStats.winsCount === 1 ? '' : 's'}`, color: T.muted },
    },
    {
      label: 'Avg loss',
      value: fmtPct(curStats.avgLoss), valueColor: T.red,
      delta: { text: `${curStats.lossesCount} loser${curStats.lossesCount === 1 ? '' : 's'}`, color: T.muted },
    },
    {
      label: 'Best trade',
      value: curStats.bestTrade ? fmtPct(curStats.bestTrade.pct) : '—', valueColor: T.green,
      delta: { text: curStats.bestTrade ? `${curStats.bestTrade.pair || '—'}, ${curStats.bestTrade.weekday}` : '—', color: T.muted },
    },
    {
      label: 'Worst trade',
      value: curStats.worstTrade ? fmtPct(curStats.worstTrade.pct) : '—', valueColor: T.red,
      delta: { text: curStats.worstTrade ? `${curStats.worstTrade.pair || '—'}, ${curStats.worstTrade.weekday}` : '—', color: T.muted },
    },
  ]

  return (
    <Card mobile={mobile}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <SectionTitle mobile={mobile} style={{ marginBottom: 0 }}>Period Comparison</SectionTitle>
        <div style={{ display: 'flex', border: `0.5px solid ${T.cardBorder}`, borderRadius: 8, overflow: 'hidden', fontFamily: font.mono, fontSize: 12 }}>
          <Toggle value="week">Week</Toggle>
          <div style={{ width: 0.5, background: T.cardBorder }} />
          <Toggle value="month">Month</Toggle>
        </div>
      </div>
      <div style={{ fontFamily: font.mono, fontSize: 11, color: T.muted, marginBottom: 14 }}>{subLabel}</div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: mobile ? '16px 12px' : 20 }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: font.heading, fontSize: mobile ? 16 : 18, fontWeight: 600, color: s.valueColor, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: font.mono, fontSize: 10.5, color: s.delta.color }}>{s.delta.text}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── By Pair / By Session table ───────────────────────────────────────
function GroupTable({ title, breakdown, mobile, footnote, scopeLabel }) {
  return (
    <Card mobile={mobile}>
      <SectionTitle mobile={mobile} style={{ marginBottom: scopeLabel ? 4 : undefined }}>{title}</SectionTitle>
      {scopeLabel && <div style={{ fontFamily: font.mono, fontSize: 11, color: T.muted, marginBottom: 14 }}>{scopeLabel}</div>}
      {breakdown.length === 0 ? (
        <EmptyState message={`No ${title.toLowerCase()} data yet.`} />
      ) : mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {breakdown.map(g => (
            <div key={g.key} style={{ background: 'var(--bg-hover)', border: `0.5px solid ${T.statBorder}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: font.body, fontSize: 13, color: T.text, fontWeight: 500 }}>{g.key}</span>
                <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 500, color: g.lowSample ? T.amber : pnlColor(g.netPnlPct) }}>{fmtPct(g.netPnlPct)}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: font.mono, fontSize: 11, color: T.muted }}>
                <span>{g.count} trades</span>
                <span style={{ color: g.lowSample ? T.amber : T.sub }}>{g.winRate.toFixed(0)}% WR</span>
                <span style={{ color: g.lowSample ? T.amber : T.sub }}>{fmtPF(g.profitFactor)} PF</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['', 'Trades', 'Win Rate', 'Avg Win', 'Avg Loss', 'Profit Factor', 'Net P&L'].map((h, i) => (
                  <th key={h + i} style={{
                    fontFamily: font.mono, fontSize: 10, color: T.sub,
                    textAlign: i === 0 ? 'left' : 'right', padding: '0 12px 10px 0',
                    letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 400,
                    borderBottom: `0.5px solid ${T.cardBorder}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdown.map((g, i) => (
                <tr key={g.key} style={{ borderBottom: i < breakdown.length - 1 ? `0.5px solid ${T.cardBorder}` : 'none' }}>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.body, fontSize: 13, color: T.text }}>{g.key}</td>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.mono, fontSize: 13, color: T.muted, textAlign: 'right' }}>{g.count}</td>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.mono, fontSize: 13, textAlign: 'right', color: g.lowSample ? T.amber : T.text }}>{g.winRate.toFixed(0)}%</td>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.mono, fontSize: 13, textAlign: 'right', color: T.green }}>{fmtPct(g.avgWin)}</td>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.mono, fontSize: 13, textAlign: 'right', color: T.red }}>{fmtPct(g.avgLoss)}</td>
                  <td style={{ padding: '10px 12px 10px 0', fontFamily: font.mono, fontSize: 13, textAlign: 'right', color: g.lowSample ? T.amber : T.text }}>{fmtPF(g.profitFactor)}</td>
                  <td style={{ padding: '10px 0', fontFamily: font.mono, fontSize: 13, fontWeight: 500, textAlign: 'right', color: g.lowSample ? T.amber : pnlColor(g.netPnlPct) }}>{fmtPct(g.netPnlPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footnote && breakdown.some(g => g.lowSample) && (
        <div style={{ fontFamily: font.mono, fontSize: 11, color: T.muted, marginTop: 12 }}>{footnote}</div>
      )}
    </Card>
  )
}

// ─── Highlight card (Best / Worst) ──────────────────────────────────
function HighlightCard({ label, metrics, accountTrades, accent, pairLabel, mobile }) {
  if (!metrics) {
    return (
      <Card mobile={mobile}>
        <SectionTitle mobile={mobile}>{label}</SectionTitle>
        <EmptyState message="No active accounts to compare yet." />
      </Card>
    )
  }
  const health = HEALTH[metrics.healthStatus]
  const sparkPoints = buildSparklinePoints(accountTrades)

  return (
    <Card mobile={mobile}>
      <SectionTitle mobile={mobile}>{label}</SectionTitle>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: font.heading, fontSize: mobile ? 16 : 18, fontWeight: 600, color: T.text }}>
            {metrics.name}
          </div>
          <div style={{ fontFamily: font.body, fontSize: 12, color: T.muted, marginTop: 2 }}>
            {metrics.firmName || '—'}
          </div>
        </div>
        <span style={{
          background: 'var(--bg-hover)', border: `0.5px solid ${T.statBorder}`, borderRadius: 6,
          padding: '4px 10px', fontFamily: font.mono, fontSize: 11, color: health.color,
        }}>
          {health.emoji} {health.label}
        </span>
      </div>

      {sparkPoints && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Equity curve · lifetime
          </div>
          <svg width="100%" height="44" viewBox="0 0 280 44" preserveAspectRatio="none" style={{ display: 'block' }}>
            <polyline points={sparkPoints} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {(() => {
              const last = sparkPoints.split(' ').pop().split(',')
              return <circle cx={last[0]} cy={last[1]} r="3" fill={accent} />
            })()}
          </svg>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '14px 16px' }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Net P&L</div>
          <div style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 600, color: accent }}>{fmtPct(metrics.netPnlPct)}</div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Win Rate</div>
          <div style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 600, color: T.text }}>{metrics.winRate.toFixed(0)}%</div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Profit Factor</div>
          <div style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 600, color: T.text }}>{fmtPF(metrics.profitFactor)}</div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Avg Win / Loss</div>
          <div style={{ fontFamily: font.mono, fontSize: 13 }}>
            <span style={{ color: T.green }}>{fmtPct(metrics.avgWin)}</span> / <span style={{ color: T.red }}>{fmtPct(metrics.avgLoss)}</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{pairLabel}</div>
          {metrics.pairTag ? (
            <span style={{
              display: 'inline-block', fontFamily: font.mono, fontSize: 12, fontWeight: 500,
              color: pnlColor(metrics.pairTag.netPnlPct), border: `0.5px solid ${T.statBorder}`,
              borderRadius: 6, padding: '3px 8px',
            }}>
              {metrics.pairTag.key} {fmtPct(metrics.pairTag.netPnlPct)}
            </span>
          ) : <span style={{ fontFamily: font.mono, fontSize: 13, color: T.muted }}>—</span>}
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Drawdown Used</div>
          <div style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 600, color: metrics.ddConsumedPct >= 60 ? T.red : T.text }}>
            {metrics.ddConsumedPct.toFixed(0)}%
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function Analytics() {
  const { collapsed } = useSidebar()
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // All non-archived accounts (challenge + personal) in one query —
        // split by type client-side so we can render both sections without
        // a second round trip.
        const { data: accountsData, error: accErr } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
        if (accErr) throw accErr

        const ids = (accountsData || []).map(a => a.id)
        let tradesData = []
        if (ids.length) {
          const { data, error: tradeErr } = await supabase
            .from('trades')
            .select('*')
            .in('account_id', ids)
          if (tradeErr) throw tradeErr
          tradesData = data || []
        }

        setAccounts(accountsData || [])
        setTrades(tradesData)
      } catch (e) {
        console.error('Analytics fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Split by type ──────────────────────────────────────────────────
  const challengeAccounts = useMemo(() => accounts.filter(a => a.type !== 'personal'), [accounts])
  const personalAccounts  = useMemo(() => accounts.filter(a => a.type === 'personal'), [accounts])
  const accountsById = useMemo(() => Object.fromEntries(accounts.map(a => [a.id, a])), [accounts])

  const challengeIds = useMemo(() => new Set(challengeAccounts.map(a => a.id)), [challengeAccounts])
  const personalIds  = useMemo(() => new Set(personalAccounts.map(a => a.id)), [personalAccounts])
  const challengeTrades = useMemo(() => trades.filter(t => challengeIds.has(t.account_id)), [trades, challengeIds])
  const personalTrades   = useMemo(() => trades.filter(t => personalIds.has(t.account_id)), [trades, personalIds])

  // ── Challenge account-level metrics (reuses accountMetrics.js) ──────
  const metrics = useMemo(() => {
    return challengeAccounts.map(acc =>
      computeAccountMetrics(acc, challengeTrades.filter(t => t.account_id === acc.id))
    )
  }, [challengeAccounts, challengeTrades])

  const activeMetrics = useMemo(() => metrics.filter(m => m.status === 'active'), [metrics])

  const best = useMemo(() => {
    if (!activeMetrics.length) return null
    return [...activeMetrics].sort((a, b) => b.profitProgressPct - a.profitProgressPct)[0]
  }, [activeMetrics])

  const worst = useMemo(() => {
    if (!activeMetrics.length) return null
    return [...activeMetrics].sort((a, b) => b.ddConsumedPct - a.ddConsumedPct)[0]
  }, [activeMetrics])

  // Extend best/worst with avg win/loss + best/worst pair tag for the highlight cards
  const bestExtended = useMemo(() => {
    if (!best) return null
    const accTrades = challengeTrades.filter(t => t.account_id === best.accountId)
    const stats = computeStats(accTrades, accountsById)
    const pairs = computeGroupBreakdown(accTrades, accountsById, t => t.pair ? t.pair.toUpperCase() : null)
    return { ...best, avgWin: stats.avgWin, avgLoss: stats.avgLoss, pairTag: pairs[0] || null }
  }, [best, challengeTrades, accountsById])

  const worstExtended = useMemo(() => {
    if (!worst) return null
    const accTrades = challengeTrades.filter(t => t.account_id === worst.accountId)
    const stats = computeStats(accTrades, accountsById)
    const pairs = computeGroupBreakdown(accTrades, accountsById, t => t.pair ? t.pair.toUpperCase() : null)
    return { ...worst, avgWin: stats.avgWin, avgLoss: stats.avgLoss, pairTag: pairs[pairs.length - 1] || null }
  }, [worst, challengeTrades, accountsById])

  const bestAccTrades = useMemo(() => best ? challengeTrades.filter(t => t.account_id === best.accountId) : [], [best, challengeTrades])
  const worstAccTrades = useMemo(() => worst ? challengeTrades.filter(t => t.account_id === worst.accountId) : [], [worst, challengeTrades])

  // ── Period state — one toggle per section, shared between Period
  // Comparison and By Pair / By Session so they always show the same window ──
  const [challengePeriod, setChallengePeriod] = useState('week')
  const [personalPeriod, setPersonalPeriod] = useState('week')

  const challengeRange = useMemo(() => getRanges(challengePeriod), [challengePeriod])
  const personalRange = useMemo(() => getRanges(personalPeriod), [personalPeriod])

  const scopeLabel = (period, range) => period === 'week'
    ? `This week (Mon–Sun, ${range.curStart.getMonth() + 1}/${range.curStart.getDate()}\u2013${range.curEnd.getMonth() + 1}/${range.curEnd.getDate()})`
    : `This month (${range.curStart.toLocaleDateString('en-US', { month: 'short' })} ${range.curStart.getDate()}\u2013${range.curEnd.getDate()})`

  // ── By Pair / By Session — pooled across all active challenge accounts,
  // scoped to the same week/month window as Period Comparison above ──
  const challengePeriodTrades = useMemo(() => tradesInRange(challengeTrades, challengeRange.curStart, challengeRange.curEnd), [challengeTrades, challengeRange])
  const byPair = useMemo(() => computeGroupBreakdown(challengePeriodTrades, accountsById, t => t.pair ? t.pair.toUpperCase() : null), [challengePeriodTrades, accountsById])
  const bySession = useMemo(() => computeGroupBreakdown(challengePeriodTrades, accountsById, t => t.session || null), [challengePeriodTrades, accountsById])

  // ── Personal account breakdowns (isolated, no drawdown framing), same
  // period-scoping treatment ──
  const personalPeriodTrades = useMemo(() => tradesInRange(personalTrades, personalRange.curStart, personalRange.curEnd), [personalTrades, personalRange])
  const personalByPair = useMemo(() => computeGroupBreakdown(personalPeriodTrades, accountsById, t => t.pair ? t.pair.toUpperCase() : null), [personalPeriodTrades, accountsById])
  const personalBySession = useMemo(() => computeGroupBreakdown(personalPeriodTrades, accountsById, t => t.session || null), [personalPeriodTrades, accountsById])

  const lowSampleFootnote = `Low sample sizes (under ~${LOW_SAMPLE_THRESHOLD} trades) shown in amber — too early to call a trend.`

  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
        <Sidebar />
        <main style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (collapsed ? 60 : 220),
          padding: isMobile ? 16 : 40,
          paddingBottom: isMobile ? 80 : 40,
          transition: 'margin-left 0.2s',
        }}>
          <div style={{ marginBottom: isMobile ? 20 : 32 }}>
            <h1 style={{ fontFamily: font.heading, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: T.text, margin: '0 0 6px 0' }}>
              Analytics
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 13, color: T.muted, margin: 0 }}>
              Where your edge is, and where it isn't.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 12, padding: 24 }}>
                <Skeleton h={12} w="160px" mb={16} />
                <Skeleton h={60} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 12, padding: 24 }}>
                    <Skeleton h={12} w="100px" mb={16} />
                    <Skeleton h={40} w="60%" />
                  </div>
                ))}
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <Card mobile={isMobile}>
              <EmptyState message="No accounts yet — add one from Challenge Tracker to see analytics here." />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>

              {challengeAccounts.length > 0 && (
                <>
                  {personalAccounts.length > 0 && (
                    <div style={{ fontFamily: font.heading, fontSize: isMobile ? 12 : 13, fontWeight: 600, color: T.sub, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Challenge Accounts
                    </div>
                  )}

                  {/* ── 1. Period Comparison ── */}
                  <PeriodComparison trades={challengeTrades} accountsById={accountsById} mobile={isMobile} period={challengePeriod} onPeriodChange={setChallengePeriod} />

                  {/* ── 2. Best / Needs Attention ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}>
                    <HighlightCard label="Best Performing Account" metrics={bestExtended} accountTrades={bestAccTrades} accent={T.green} pairLabel="Best Pair" mobile={isMobile} />
                    <HighlightCard label="Needs Attention" metrics={worstExtended} accountTrades={worstAccTrades} accent={T.red} pairLabel="Worst Pair" mobile={isMobile} />
                  </div>

                  {/* ── 3. By Pair (same week/month window as Period Comparison above) ── */}
                  <GroupTable title="By Pair" breakdown={byPair} mobile={isMobile} footnote={lowSampleFootnote} scopeLabel={scopeLabel(challengePeriod, challengeRange)} />

                  {/* ── 4. By Session ── */}
                  <GroupTable title="By Session" breakdown={bySession} mobile={isMobile} footnote={lowSampleFootnote} scopeLabel={scopeLabel(challengePeriod, challengeRange)} />

                  {/* ── 5. Account Comparison ── */}
                  <Card mobile={isMobile}>
                    <SectionTitle mobile={isMobile}>Account Comparison</SectionTitle>
                    {activeMetrics.length === 0 ? (
                      <EmptyState message="No active accounts right now." />
                    ) : isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeMetrics.map(m => {
                          const health = HEALTH[m.healthStatus]
                          return (
                            <div key={m.accountId} style={{
                              background: 'var(--bg-hover)', border: `0.5px solid ${T.statBorder}`,
                              borderRadius: 10, padding: '12px 14px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                  <div style={{ fontFamily: font.body, fontSize: 13, color: T.text, fontWeight: 500 }}>{m.name}</div>
                                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>{m.firmName || '—'}</div>
                                </div>
                                <span style={{ fontFamily: font.mono, fontSize: 11, color: health.color, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>
                                  {health.emoji} {health.label}
                                </span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>P&L</div>
                                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 500, color: pnlColor(m.netPnl) }}>{fmtPct(m.netPnlPct)}</div>
                                </div>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Win Rate</div>
                                  <div style={{ fontFamily: font.mono, fontSize: 13, color: m.winRate >= 50 ? T.green : T.amber }}>{m.winRate.toFixed(0)}%</div>
                                </div>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Profit Factor</div>
                                  <div style={{ fontFamily: font.mono, fontSize: 13, color: m.profitFactor >= 1 ? T.green : T.red }}>{fmtPF(m.profitFactor)}</div>
                                </div>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Drawdown</div>
                                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 500, color: m.ddConsumedPct >= 60 ? T.red : T.sub }}>
                                    {m.ddConsumedPct.toFixed(0)}% <span style={{ color: T.muted, fontWeight: 400 }}>of limit</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ width: '100%', overflowX: 'visible' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              {['Account', 'P&L', 'Win Rate', 'Profit Factor', 'Drawdown', 'Status'].map(h => (
                                <th key={h} style={{
                                  fontFamily: font.mono, fontSize: 10, color: T.sub,
                                  textAlign: 'left', padding: '0 12px 12px 0',
                                  letterSpacing: '0.07em', textTransform: 'uppercase',
                                  borderBottom: `0.5px solid ${T.cardBorder}`, fontWeight: 400,
                                }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeMetrics.map((m, i) => {
                              const health = HEALTH[m.healthStatus]
                              return (
                                <tr key={m.accountId} style={{ borderBottom: i < activeMetrics.length - 1 ? `0.5px solid ${T.cardBorder}` : 'none' }}>
                                  <td style={{ padding: '14px 12px 14px 0' }}>
                                    <div style={{ fontFamily: font.body, fontSize: 13, color: T.text, fontWeight: 500 }}>{m.name}</div>
                                    <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>{m.firmName || '—'}</div>
                                  </td>
                                  <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 13, color: pnlColor(m.netPnl), fontWeight: 500 }}>{fmtPct(m.netPnlPct)}</td>
                                  <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 12, color: m.winRate >= 50 ? T.green : T.amber }}>{m.winRate.toFixed(0)}%</td>
                                  <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 12, color: m.profitFactor >= 1 ? T.green : T.red }}>{fmtPF(m.profitFactor)}</td>
                                  <td style={{ padding: '14px 12px 14px 0' }}>
                                    <div style={{ fontFamily: font.mono, fontSize: 12, color: m.ddConsumedPct >= 60 ? T.red : T.sub, fontWeight: 500 }}>{m.ddConsumedPct.toFixed(0)}% of limit</div>
                                    <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>{m.maxDDUsedPct.toFixed(1)}% / {m.maxDDLimitPct.toFixed(1)}%</div>
                                  </td>
                                  <td style={{ padding: '14px 0' }}>
                                    <span style={{ fontFamily: font.mono, fontSize: 11, color: health.color, whiteSpace: 'nowrap' }}>{health.emoji} {health.label}</span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* ── 6. Personal Account section (isolated, no challenge rules) ── */}
              {personalAccounts.length > 0 && (
                <>
                  <Divider label="Personal account — no challenge rules" mobile={isMobile} />
                  <PeriodComparison trades={personalTrades} accountsById={accountsById} mobile={isMobile} period={personalPeriod} onPeriodChange={setPersonalPeriod} />
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}>
                    <GroupTable title="By Pair" breakdown={personalByPair} mobile={isMobile} footnote={lowSampleFootnote} scopeLabel={scopeLabel(personalPeriod, personalRange)} />
                    <GroupTable title="By Session" breakdown={personalBySession} mobile={isMobile} footnote={lowSampleFootnote} scopeLabel={scopeLabel(personalPeriod, personalRange)} />
                  </div>
                </>
              )}

            </div>
          )}
        </main>
      </div>
    </>
  )
}