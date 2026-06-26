import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import AccountSwitcher from '../components/AccountSwitcher'
import ChallengeCard, { calcDrawdown, ProgressBar } from '../components/ChallengeCard'
import PnLChart from '../components/PnLChart'
import DailyBarChart from '../components/DailyBarChart'
import StreakCard from '../components/StreakCard'
import CalendarPnL from '../components/CalendarPnL'
import RecentTrades from '../components/RecentTrades'
import WinLossDonut from '../components/WinLossDonut'
import ScoreCard from '../components/ScoreCard'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'

function computeStats(trades) {
  if (!trades || trades.length === 0) return { totalPnl: 0, tradeCount: 0, winRate: 0, profitFactor: 0, todayPnl: 0, dayCount: 0 }
  const total = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const wins = trades.filter(t => t.outcome === 'win')
  const losses = trades.filter(t => t.outcome === 'loss')
  const grossWin = wins.reduce((s, t) => s + (t.pnl || 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0))
  const pf = grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : grossWin / grossLoss
  const today = new Date().toISOString().slice(0, 10)
  const todayPnl = trades.filter(t => t.date === today).reduce((s, t) => s + (t.pnl || 0), 0)
  const days = new Set(trades.map(t => t.date)).size
  return {
    totalPnl: total,
    tradeCount: trades.length,
    winRate: trades.length ? Math.round((wins.length / trades.length) * 100) : 0,
    profitFactor: pf,
    todayPnl,
    dayCount: days,
  }
}

function fmt(val) {
  const sign = val >= 0 ? '+' : ''
  return `${sign}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null || n === '') return '—'
  return parseFloat(n).toFixed(2)
}
function pnlColorModal(n) {
  if (n == null) return 'var(--text-faint)'
  if (parseFloat(n) > 0) return 'var(--brand)'
  if (parseFloat(n) < 0) return 'var(--red)'
  return 'var(--text-muted)'
}
function dirBadgeModal(dir) {
  const isLong = dir === 'long'
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
      background: isLong ? 'var(--green-bg)' : 'var(--red-bg-2)',
      color: isLong ? 'var(--brand)' : 'var(--red)',
      border: `0.5px solid ${isLong ? 'var(--green-bg-2)' : 'var(--red-bg)'}`,
    }}>{isLong ? 'Buy' : 'Sell'}</span>
  )
}
function outcomeBadgeModal(outcome) {
  const map = {
    win:         { label: 'WIN',         bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    loss:        { label: 'LOSS',        bg: 'var(--red-bg-2)', color: 'var(--red)', border: 'var(--red-bg)' },
    be:          { label: 'BE',          bg: 'var(--bg-surface-2)', color: 'var(--text-soft)',    border: 'var(--border-color-2)' },
    in_progress: { label: 'IN PROGRESS', bg: 'var(--blue-bg-2)', color: 'var(--blue)', border: 'var(--blue-bg)' },
  }
  const s = map[outcome]
  if (!s) return null
  return (
    <span style={{
      fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px',
      borderRadius: '4px', background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{s.label}</span>
  )
}
function sessionLabel(s) {
  return { london: 'London', new_york: 'NY', asian: 'Asian' }[s] || s || '—'
}

// ─── New top metrics strip ──────────────────────────────────────────────────
function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)', borderRadius: '12px', padding: '18px 20px' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>{label}</p>
      <p style={{ color: color || 'var(--text-primary)', fontFamily: 'DM Mono, monospace', fontSize: '22px', fontWeight: '600', margin: 0 }}>{value}</p>
    </div>
  )
}

// ─── Challenge stats footer (lives under the equity curve now) ─────────────
function buildChallengeFooter(account, trades) {
  if (!account) return null
  const accountType = account.type || 'personal'
  const withPnl = trades.filter(t => t.pnl != null)
  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const accountSize = parseFloat(account.account_size) || 0

  if (accountType === 'personal') {
    const profitableDays = Object.entries(
      withPnl.reduce((acc, t) => { acc[t.date] = (acc[t.date] || 0) + parseFloat(t.pnl); return acc }, {})
    ).filter(([, v]) => v > 0).length
    const totalDays = new Set(withPnl.map(t => t.date)).size
    const consistency = totalDays > 0 ? (profitableDays / totalDays) * 100 : 0
    const growth = accountSize > 0 ? Math.min(Math.max((netPnl / accountSize) * 100, 0), 100) : 0
    const growthRaw = accountSize > 0 ? (netPnl / accountSize) * 100 : 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <ProgressBar
          label={`Consistency — ${profitableDays} of ${totalDays} days profitable`}
          pct={consistency}
          color="var(--brand)"
          rightLabel={`${consistency.toFixed(1)}% profitable days`}
        />
        <ProgressBar
          label="Account Growth"
          pct={growth}
          color="var(--blue)"
          rightLabel={accountSize > 0 ? `${growthRaw >= 0 ? '+' : ''}${growthRaw.toFixed(2)}% on $${accountSize.toLocaleString()}` : 'Set account size to track'}
        />
      </div>
    )
  }

  // Challenge account — profit target / max DD / daily DD
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0
  const drawdownType = account.drawdown_type || 'static'

  const profitPct = profitTarget > 0 ? Math.min((netPnl / profitTarget) * 100, 100) : 0

  const { ddUsed, ddFloor } = calcDrawdown(trades, accountSize, maxDD, drawdownType)
  const maxDDUsedPct = accountSize > 0 ? (ddUsed / accountSize) * 100 : 0
  const maxDDLimitPct = accountSize > 0 ? (maxDD / accountSize) * 100 : 0
  const maxDDPct = maxDDLimitPct > 0 ? Math.min((maxDDUsedPct / maxDDLimitPct) * 100, 100) : 0

  const byDay = {}
  withPnl.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl) })
  const worstDayLoss = Object.values(byDay).length > 0 ? Math.max(0, ...Object.values(byDay).map(v => -v)) : 0
  const dailyDDUsedPct = accountSize > 0 ? (worstDayLoss / accountSize) * 100 : 0
  const dailyDDLimitPct = accountSize > 0 ? (dailyDD / accountSize) * 100 : 0
  const dailyDDPct = dailyDDLimitPct > 0 ? Math.min((dailyDDUsedPct / dailyDDLimitPct) * 100, 100) : 0

  const floorLabel = `Floor $${ddFloor.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <ProgressBar
        label={`Profit Target — ${profitTarget > 0 ? (profitTarget / accountSize * 100).toFixed(1) : '—'}%`}
        pct={profitPct}
        color="var(--brand)"
        rightLabel={`${(netPnl / accountSize * 100 >= 0 ? '+' : '')}${(netPnl / accountSize * 100).toFixed(2)}% of ${profitTarget > 0 ? (profitTarget / accountSize * 100).toFixed(1) : '—'}% target`}
      />
      <ProgressBar
        label={`Max Drawdown — ${maxDDUsedPct.toFixed(2)}% / ${maxDDLimitPct.toFixed(1)}%`}
        pct={maxDDPct}
        color="var(--red)"
        rightLabel={`${maxDDUsedPct.toFixed(2)}% used · ${floorLabel}`}
      />
      <ProgressBar
        label={`Daily Drawdown — ${dailyDDUsedPct.toFixed(2)}% / ${dailyDDLimitPct.toFixed(1)}%`}
        pct={dailyDDPct}
        color="var(--amber)"
        rightLabel={dailyDD > 0 ? 'Worst single day so far' : 'No daily DD rule set'}
      />
    </div>
  )
}

// Resolving an in_progress trade: the stored pnl is already the projected
// risk×RR profit. Win keeps it as-is. Loss derives the original risk amount
// from pnl/rr (since risk% itself isn't stored per-trade) and negates it,
// falling back to mirroring the magnitude if rr is missing/zero.
function resolvedPnl(trade, newOutcome) {
  const projected = trade.pnl_gross != null ? parseFloat(trade.pnl_gross) : (trade.pnl != null ? parseFloat(trade.pnl) : null)
  if (newOutcome === 'win') return projected
  if (newOutcome === 'loss') {
    const rr = parseFloat(trade.rr)
    if (projected != null && rr) return -Math.abs(projected / rr)
    if (projected != null) return -Math.abs(projected)
    return null
  }
  return projected
}

// ─── Trade Detail Modal ───────────────────────────────────────────────────────
function TradeDetailModal({ trade, onClose, isMobile, onResolve }) {
  const [resolving, setResolving] = useState(false)
  if (!trade) return null

  const pnlVal = trade.pnl != null ? parseFloat(trade.pnl) : null
  const isOpen = trade.outcome === 'in_progress'

  async function handleResolve(newOutcome) {
    if (resolving) return
    setResolving(true)
    try {
      await onResolve(trade, newOutcome)
    } finally {
      setResolving(false)
    }
  }

  const resolveSection = isOpen && (
    <div style={{
      background: 'var(--blue-bg-2)', border: '0.5px solid var(--blue-bg)',
      borderRadius: isMobile ? '8px' : '10px', padding: isMobile ? '12px' : '16px 18px',
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? '10px' : '16px',
    }}>
      <div style={{ fontSize: isMobile ? '11px' : '13px', color: 'var(--blue)', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
        This trade is still open — mark the outcome to log the final P&L
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={resolving}
          onClick={() => handleResolve('win')}
          style={{
            flex: isMobile ? 1 : undefined, padding: isMobile ? '9px 14px' : '8px 18px',
            borderRadius: '8px', border: '0.5px solid var(--green-bg-2)',
            background: 'var(--green-bg)', color: 'var(--brand)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: resolving ? 'default' : 'pointer', opacity: resolving ? 0.6 : 1,
          }}
        >Win</button>
        <button
          disabled={resolving}
          onClick={() => handleResolve('loss')}
          style={{
            flex: isMobile ? 1 : undefined, padding: isMobile ? '9px 14px' : '8px 18px',
            borderRadius: '8px', border: '0.5px solid var(--red-bg)',
            background: 'var(--red-bg-2)', color: 'var(--red)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: resolving ? 'default' : 'pointer', opacity: resolving ? 0.6 : 1,
          }}
        >Loss</button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-surface)', borderRadius: '16px 16px 0 0',
          zIndex: 1001, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          border: '0.5px solid var(--border-color)',
        }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: '32px', height: '3px', background: 'var(--text-faint-2)', borderRadius: '2px' }} />
          </div>
          {/* Header */}
          <div style={{ padding: '0 16px 12px', borderBottom: '0.5px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>{trade.pair}</span>
              {dirBadgeModal(trade.direction)}
              {outcomeBadgeModal(trade.outcome)}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
          </div>
          {/* Body */}
          <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {resolveSection}
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'P&L',     value: pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—', color: pnlColorModal(pnlVal) },
                { label: 'R:R',     value: trade.rr ? `${trade.rr}R` : '—' },
                { label: 'Session', value: sessionLabel(trade.session) },
                { label: 'Date',    value: trade.date || '—' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', color: s.color || 'var(--text-secondary)' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Price levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[{ label: 'Entry', value: fmtNum(trade.entry) }, { label: 'Stop Loss', value: fmtNum(trade.stop_loss) }, { label: 'Take Profit', value: fmtNum(trade.take_profit) }].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-soft)' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* Screenshot */}
            {trade.screenshot_url && (
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '0.5px solid var(--border-color)' }}>
                <img src={trade.screenshot_url} alt="Chart" style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'contain', background: 'var(--bg-page)' }} />
              </div>
            )}
            {/* Notes */}
            {trade.notes && (
              <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Notes</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'Inter, sans-serif', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // Desktop
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(820px, 92vw)', maxHeight: '88vh',
        background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
        borderRadius: '16px', zIndex: 1001, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '0.5px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{trade.pair}</span>
            {dirBadgeModal(trade.direction)}
            {outcomeBadgeModal(trade.outcome)}
            <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)' }}>{trade.date}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {resolveSection}
          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '1px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden', border: '0.5px solid var(--border-color)' }}>
            {[
              { label: 'P&L',     value: pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—', color: pnlColorModal(pnlVal) },
              { label: 'R:R',     value: trade.rr ? `${trade.rr}R` : '—' },
              { label: 'Session', value: sessionLabel(trade.session) },
              { label: 'Entry',   value: fmtNum(trade.entry) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '16px 20px', background: 'var(--bg-surface-2)' }}>
                <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontFamily: 'Inter, sans-serif', fontWeight: '600', color: s.color || 'var(--text-secondary)' }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Price levels */}
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Price Levels</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[{ label: 'Entry', value: fmtNum(trade.entry) }, { label: 'Stop Loss', value: fmtNum(trade.stop_loss) }, { label: 'Take Profit', value: fmtNum(trade.take_profit) }].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-soft)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Screenshot */}
          {trade.screenshot_url && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Chart Screenshot</div>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '0.5px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                <img src={trade.screenshot_url} alt="Trade chart" style={{ width: '100%', display: 'block', maxHeight: '460px', objectFit: 'contain', background: 'var(--bg-page)' }} />
              </div>
            </div>
          )}
          {/* Notes */}
          {trade.notes && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Notes</div>
              <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '16px 18px', color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Inter, sans-serif', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Day Trades Modal ─────────────────────────────────────────────────────────
function DayTradesModal({ date, trades, onClose, onSelectTrade, isMobile }) {
  if (!date) return null
  const dayTrades = trades.filter(t => t.date === date)
  const dayPnl = dayTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const outcomeMap = {
    win:         { label: 'WIN',     bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    loss:        { label: 'LOSS',    bg: 'var(--red-bg-2)', color: 'var(--red)', border: 'var(--red-bg)' },
    be:          { label: 'BE',      bg: 'var(--amber-bg-2)', color: 'var(--amber)', border: 'var(--amber-bg)' },
    in_progress: { label: 'IN PROG', bg: 'var(--blue-bg-2)', color: 'var(--blue)', border: 'var(--blue-bg)' },
  }

  const rows = dayTrades.map(t => {
    const pnlVal = t.pnl != null ? parseFloat(t.pnl) : null
    const ob = outcomeMap[t.outcome]
    const isLong = t.direction === 'long'
    return (
      <div key={t.id}
        onClick={() => onSelectTrade(t)}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: isMobile ? '10px 16px' : '12px 24px',
          borderBottom: '0.5px solid var(--border-color)',
          cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: isMobile ? '13px' : '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>{t.pair}</span>
            {ob && <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: ob.bg, color: ob.color, border: `0.5px solid ${ob.border}`, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{ob.label}</span>}
            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: isLong ? 'var(--green-bg)' : 'var(--red-bg-2)', color: isLong ? 'var(--brand)' : 'var(--red)', border: `0.5px solid ${isLong ? 'var(--green-bg-2)' : 'var(--red-bg)'}`, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>{isLong ? 'BUY' : 'SELL'}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{sessionLabel(t.session)}{t.rr ? ` · ${t.rr}R` : ''}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: '500', color: pnlColorModal(pnlVal) }}>
            {pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—'}
          </div>
        </div>
        <span style={{ color: 'var(--text-faint-2)', fontSize: '14px', flexShrink: 0 }}>›</span>
      </div>
    )
  })

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--bg-surface)', borderRadius: '16px 16px 0 0',
          zIndex: 1001, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          border: '0.5px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: '32px', height: '3px', background: 'var(--text-faint-2)', borderRadius: '2px' }} />
          </div>
          <div style={{ padding: '0 16px 12px', borderBottom: '0.5px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>{formattedDate}</div>
              <div style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', marginTop: '3px', color: 'var(--text-faint)' }}>
                {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} ·{' '}
                <span style={{ color: pnlColorModal(dayPnl) }}>{dayPnl >= 0 ? '+' : ''}${Math.abs(dayPnl).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ overflowY: 'auto' }}>{rows}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(540px, 92vw)', maxHeight: '80vh',
        background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
        borderRadius: '16px', zIndex: 1001, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          padding: '24px 28px 18px', borderBottom: '0.5px solid var(--border-color)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{formattedDate}</div>
            <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)' }}>
              {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: pnlColorModal(dayPnl) }}>{dayPnl >= 0 ? '+' : ''}${Math.abs(dayPnl).toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</button>
        </div>
        <div>{rows}</div>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { collapsed } = useSidebar()
  const [searchParams] = useSearchParams()
  const defaultAccountId = searchParams.get('account') || localStorage.getItem('activeAccountId')

  const [activeAccount, setActiveAccount] = useState(null)
  const [paymentToast, setPaymentToast] = useState(searchParams.get('payment') === 'success')

  useEffect(() => {
    if (!paymentToast) return
    const t = setTimeout(() => setPaymentToast(false), 5000)
    return () => clearTimeout(t)
  }, [paymentToast])

  useEffect(() => {
    if (activeAccount?.id) {
      localStorage.setItem('activeAccountId', activeAccount.id)
    }
  }, [activeAccount])

  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [detailTrade, setDetailTrade] = useState(null)
  const [dayModal, setDayModal] = useState(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata
      const full = meta?.full_name || meta?.name || data?.user?.email?.split('@')[0] || ''
      setUserName(full.split(' ')[0])
    })
  }, [])

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!activeAccount) return
    fetchTrades(activeAccount.id)
  }, [activeAccount])

  async function fetchTrades(accountId) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: true })
      if (error) throw error
      // Fold swap + commission into pnl so every stat/chart on the dashboard
      // reflects the true net result of each trade. Trades with no pnl,
      // swap, or commission at all (e.g. still in_progress) are left as-is
      // so they keep showing as "—" instead of "$0.00".
      const normalized = (data || []).map(t => {
        if (t.pnl == null && t.swap == null && t.commission == null) return t
        return {
          ...t,
          pnl_gross: t.pnl,
          pnl: (parseFloat(t.pnl) || 0) + (parseFloat(t.swap) || 0) + (parseFloat(t.commission) || 0),
        }
      })
      setTrades(normalized)
    } catch (err) {
      console.error('Failed to fetch trades:', err)
      setTrades([])
    } finally {
      setLoading(false)
    }
  }

  async function handleResolveTrade(trade, newOutcome) {
    const newPnlGross = resolvedPnl(trade, newOutcome)
    try {
      const { error } = await supabase
        .from('trades')
        .update({ outcome: newOutcome, pnl: newPnlGross })
        .eq('id', trade.id)
      if (error) throw error

      const swap = parseFloat(trade.swap) || 0
      const commission = parseFloat(trade.commission) || 0
      const hasAdjustments = trade.swap != null || trade.commission != null
      const updated = {
        ...trade,
        outcome: newOutcome,
        pnl_gross: hasAdjustments ? newPnlGross : undefined,
        pnl: hasAdjustments ? (parseFloat(newPnlGross) || 0) + swap + commission : newPnlGross,
      }

      setTrades(prev => prev.map(t => (t.id === trade.id ? updated : t)))
      setDetailTrade(updated)
    } catch (err) {
      console.error('Failed to resolve trade:', err)
      alert('Could not save the trade outcome. Please try again.')
    }
  }

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    const stats = computeStats(trades)

    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar
          mobileTopBarRight={
            <AccountSwitcher
              mobile
              compact
              showBalance={false}
              showSelectedNameOnMobile
              onSwitch={(acc) => {
                setActiveAccount(acc)
                if (acc?.id) localStorage.setItem('activeAccountId', acc.id)
              }}
              defaultAccountId={defaultAccountId}
            />
          }
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '52px', paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600' }}>
              Hi{userName ? `, ${userName}` : ''}
            </span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', marginLeft: '8px' }}>
              {todayLabel}
            </span>
          </div>
          {paymentToast && (
            <div style={{
              margin: '12px 14px 0',
              background: 'var(--green-bg)', border: '0.5px solid var(--green-bg-2)',
              borderRadius: '10px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: 'var(--brand)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                ✓ Payment confirmed — your plan is now active!
              </span>
              <button onClick={() => setPaymentToast(false)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            </div>
          )}
          <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid var(--bg-surface)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '3px', fontFamily: 'Inter, sans-serif' }}>Total PnL</div>
            <div style={{ fontSize: '36px', fontWeight: '500', color: stats.totalPnl >= 0 ? 'var(--brand)' : 'var(--red)', lineHeight: 1, marginBottom: '5px', fontFamily: 'Inter, sans-serif' }}>
              {fmt(stats.totalPnl)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              {stats.tradeCount} trades · {stats.dayCount} days
            </div>
          </div>

          <div style={{ margin: '10px 14px 0' }}>
            <ChallengeCard account={activeAccount} trades={trades} loading={loading} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <PnLChart trades={trades} account={activeAccount} noMargin mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <DailyBarChart trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <WinLossDonut trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <StreakCard trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <CalendarPnL trades={trades} account={activeAccount} mobile onDayClick={date => setDayModal(date)} />
          </div>
          <div style={{ margin: '8px 14px 16px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px' }}>
            <RecentTrades trades={trades} loading={loading} mobile onTradeClick={t => setDetailTrade(t)} />
          </div>
        </main>

        {dayModal && (
          <DayTradesModal
            date={dayModal}
            trades={trades}
            isMobile
            onClose={() => setDayModal(null)}
            onSelectTrade={t => { setDayModal(null); setDetailTrade(t) }}
          />
        )}
        {detailTrade && (
          <TradeDetailModal
            trade={detailTrade}
            isMobile
            onClose={() => setDetailTrade(null)}
            onResolve={handleResolveTrade}
          />
        )}
      </div>
    )
  }

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  const stats = computeStats(trades)
  const challengeFooter = buildChallengeFooter(activeAccount, trades)

  return (
    <div style={{ display: 'flex', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px', isolation: 'isolate' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: '600' }}>
              Hi{userName ? `, ${userName}` : ''}
            </span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', marginLeft: '10px' }}>
              {todayLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: 0 }}>Dashboard</h1>
            <AccountSwitcher
              onSwitch={(acc) => {
                setActiveAccount(acc)
                if (acc?.id) localStorage.setItem('activeAccountId', acc.id)
              }}
              defaultAccountId={defaultAccountId}
            />
          </div>
        </div>
        {paymentToast && (
          <div style={{
            marginBottom: '24px',
            background: 'var(--green-bg)', border: '0.5px solid var(--green-bg-2)',
            borderRadius: '10px', padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'var(--brand)', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
              ✓ Payment confirmed — your plan is now active!
            </span>
            <button onClick={() => setPaymentToast(false)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
          <MetricCard
            label="Profit Factor"
            value={stats.tradeCount === 0 ? '0.00' : isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
            color={stats.tradeCount === 0 ? undefined : (stats.profitFactor >= 1 || !isFinite(stats.profitFactor)) ? 'var(--brand)' : 'var(--red)'}
          />
          <MetricCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            color={stats.tradeCount === 0 ? undefined : stats.winRate >= 50 ? 'var(--brand)' : 'var(--red)'}
          />
          <MetricCard
            label="Net P&L (Today)"
            value={fmt(stats.todayPnl)}
            color={stats.todayPnl >= 0 ? 'var(--brand)' : 'var(--red)'}
          />
          <MetricCard label="Total Trades" value={String(stats.tradeCount)} />
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
          <div style={{ flex: '0 0 65%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <PnLChart trades={trades} account={activeAccount} noMargin footer={challengeFooter} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ScoreCard trades={trades} />
            <WinLossDonut trades={trades} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
          <div style={{ flex: '0 0 65%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <DailyBarChart trades={trades} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <StreakCard trades={trades} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
          <div style={{ flex: '0 0 65%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <CalendarPnL trades={trades} account={activeAccount} onDayClick={date => setDayModal(date)} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <RecentTrades trades={trades} loading={loading} onTradeClick={t => setDetailTrade(t)} />
          </div>
        </div>
      </main>

      {dayModal && (
        <DayTradesModal
          date={dayModal}
          trades={trades}
          onClose={() => setDayModal(null)}
          onSelectTrade={t => { setDayModal(null); setDetailTrade(t) }}
        />
      )}
      {detailTrade && (
        <TradeDetailModal
          trade={detailTrade}
          onClose={() => setDetailTrade(null)}
          onResolve={handleResolveTrade}
        />
      )}
    </div>
  )
}