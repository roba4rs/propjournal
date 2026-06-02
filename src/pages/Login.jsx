import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import AccountSwitcher from '../components/AccountSwitcher'
import ChallengeCard from '../components/ChallengeCard'
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
  if (n == null) return '#777'
  if (parseFloat(n) > 0) return '#1db97b'
  if (parseFloat(n) < 0) return '#c03535'
  return '#666'
}
function dirBadgeModal(dir) {
  const isLong = dir === 'long'
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
      background: isLong ? '#0f2219' : '#1e0d0d',
      color: isLong ? '#1db97b' : '#c03535',
      border: `0.5px solid ${isLong ? '#1a3826' : '#2e1515'}`,
    }}>{isLong ? 'Buy' : 'Sell'}</span>
  )
}
function outcomeBadgeModal(outcome) {
  const map = {
    win:         { label: 'WIN',         bg: '#0f2219', color: '#1db97b', border: '#1a3826' },
    loss:        { label: 'LOSS',        bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
    be:          { label: 'BE',          bg: '#141414', color: '#aaa',    border: '#2a2a2a' },
    in_progress: { label: 'IN PROGRESS', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' },
  }
  const s = map[outcome]
  if (!s) return null
  return (
    <span style={{
      fontSize: '9px', fontFamily: 'DM Mono, monospace', padding: '2px 7px',
      borderRadius: '4px', background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{s.label}</span>
  )
}
function sessionLabel(s) {
  return { london: 'London', new_york: 'NY', asian: 'Asian' }[s] || s || '—'
}

// ─── Trade Detail Modal ───────────────────────────────────────────────────────
function TradeDetailModal({ trade, onClose, isMobile }) {
  if (!trade) return null

  const pnlVal = trade.pnl != null ? parseFloat(trade.pnl) : null

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0d0d0d', borderRadius: '16px 16px 0 0',
          zIndex: 1001, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          border: '0.5px solid #1e1e1e',
        }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: '32px', height: '3px', background: '#555', borderRadius: '2px' }} />
          </div>
          {/* Header */}
          <div style={{ padding: '0 16px 12px', borderBottom: '0.5px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: '700', color: '#fff' }}>{trade.pair}</span>
              {dirBadgeModal(trade.direction)}
              {outcomeBadgeModal(trade.outcome)}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
          </div>
          {/* Body */}
          <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'P&L',     value: pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—', color: pnlColorModal(pnlVal) },
                { label: 'R:R',     value: trade.rr ? `${trade.rr}R` : '—' },
                { label: 'Session', value: sessionLabel(trade.session) },
                { label: 'Date',    value: trade.date || '—' },
              ].map(s => (
                <div key={s.label} style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', color: '#777', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', fontFamily: 'DM Mono, monospace', fontWeight: '600', color: s.color || '#e0e0e0' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Price levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[{ label: 'Entry', value: fmtNum(trade.entry) }, { label: 'Stop Loss', value: fmtNum(trade.stop_loss) }, { label: 'Take Profit', value: fmtNum(trade.take_profit) }].map(item => (
                <div key={item.label} style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '9px', color: '#777', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', color: '#ccc' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* Screenshot */}
            {trade.screenshot_url && (
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '0.5px solid #1e1e1e' }}>
                <img src={trade.screenshot_url} alt="Chart" style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'contain', background: '#0a0a0a' }} />
              </div>
            )}
            {/* Notes */}
            {trade.notes && (
              <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '9px', color: '#777', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Notes</div>
                <div style={{ color: '#999', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
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
        background: '#0d0d0d', border: '0.5px solid #1e1e1e',
        borderRadius: '16px', zIndex: 1001, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '0.5px solid #1a1a1a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#0d0d0d', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: '700', color: '#fff' }}>{trade.pair}</span>
            {dirBadgeModal(trade.direction)}
            {outcomeBadgeModal(trade.outcome)}
            <span style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', color: '#777' }}>{trade.date}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '2px 4px' }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '1px', background: '#1a1a1a', borderRadius: '10px', overflow: 'hidden', border: '0.5px solid #1a1a1a' }}>
            {[
              { label: 'P&L',     value: pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—', color: pnlColorModal(pnlVal) },
              { label: 'R:R',     value: trade.rr ? `${trade.rr}R` : '—' },
              { label: 'Session', value: sessionLabel(trade.session) },
              { label: 'Entry',   value: fmtNum(trade.entry) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '16px 20px', background: '#0f0f0f' }}>
                <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{s.label}</div>
                <div style={{ fontSize: '20px', fontFamily: 'Syne, sans-serif', fontWeight: '600', color: s.color || '#e0e0e0' }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Price levels */}
          <div>
            <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Price Levels</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[{ label: 'Entry', value: fmtNum(trade.entry) }, { label: 'Stop Loss', value: fmtNum(trade.stop_loss) }, { label: 'Take Profit', value: fmtNum(trade.take_profit) }].map(item => (
                <div key={item.label} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '15px', fontFamily: 'DM Mono, monospace', color: '#ccc' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Screenshot */}
          {trade.screenshot_url && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Chart Screenshot</div>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '0.5px solid #1e1e1e', background: '#111' }}>
                <img src={trade.screenshot_url} alt="Trade chart" style={{ width: '100%', display: 'block', maxHeight: '460px', objectFit: 'contain', background: '#0a0a0a' }} />
              </div>
            </div>
          )}
          {/* Notes */}
          {trade.notes && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'DM Mono, monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Notes</div>
              <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '10px', padding: '16px 18px', color: '#999', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
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
    win:         { label: 'WIN',     bg: '#0f2219', color: '#1db97b', border: '#1a3826' },
    loss:        { label: 'LOSS',    bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
    be:          { label: 'BE',      bg: '#1a1400', color: '#c97a00', border: '#2a2000' },
    in_progress: { label: 'IN PROG', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' },
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
          borderBottom: '0.5px solid #161616',
          cursor: 'pointer', transition: 'background 0.1s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#111'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: isMobile ? '13px' : '14px', fontWeight: '500', color: '#e0e0e0' }}>{t.pair}</span>
            {ob && <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: ob.bg, color: ob.color, border: `0.5px solid ${ob.border}`, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>{ob.label}</span>}
            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', background: isLong ? '#0f2219' : '#1e0d0d', color: isLong ? '#1db97b' : '#c03535', border: `0.5px solid ${isLong ? '#1a3826' : '#2e1515'}`, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase' }}>{isLong ? 'BUY' : 'SELL'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#777', fontFamily: 'DM Mono, monospace' }}>{sessionLabel(t.session)}{t.rr ? ` · ${t.rr}R` : ''}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '14px', fontWeight: '500', color: pnlColorModal(pnlVal) }}>
            {pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—'}
          </div>
        </div>
        <span style={{ color: '#555', fontSize: '14px', flexShrink: 0 }}>›</span>
      </div>
    )
  })

  if (isMobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0d0d0d', borderRadius: '16px 16px 0 0',
          zIndex: 1001, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
          border: '0.5px solid #1e1e1e',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
            <div style={{ width: '32px', height: '3px', background: '#555', borderRadius: '2px' }} />
          </div>
          <div style={{ padding: '0 16px 12px', borderBottom: '0.5px solid #1a1a1a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: '600', color: '#e0e0e0' }}>{formattedDate}</div>
              <div style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', marginTop: '3px', color: '#777' }}>
                {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} ·{' '}
                <span style={{ color: pnlColorModal(dayPnl) }}>{dayPnl >= 0 ? '+' : ''}${Math.abs(dayPnl).toFixed(2)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
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
        background: '#0d0d0d', border: '0.5px solid #1e1e1e',
        borderRadius: '16px', zIndex: 1001, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{
          padding: '24px 28px 18px', borderBottom: '0.5px solid #1a1a1a',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#0d0d0d', zIndex: 1,
        }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{formattedDate}</div>
            <div style={{ fontSize: '12px', fontFamily: 'DM Mono, monospace', color: '#777' }}>
              {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''} ·{' '}
              <span style={{ color: pnlColorModal(dayPnl) }}>{dayPnl >= 0 ? '+' : ''}${Math.abs(dayPnl).toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</button>
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

  // Persist active account so Analytics can open the same one
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
      setTrades(data || [])
    } catch (err) {
      console.error('Failed to fetch trades:', err)
      setTrades([])
    } finally {
      setLoading(false)
    }
  }

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    const stats = computeStats(trades)

    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <div style={{
          position: 'fixed', top: 0, left: '14px', right: '14px', height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          zIndex: 201, pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <AccountSwitcher
              onSwitch={(acc) => {
                setActiveAccount(acc)
                if (acc?.id) localStorage.setItem('activeAccountId', acc.id)
              }}
              mobile
              showBalance={false}
              compact
              showSelectedNameOnMobile
              defaultAccountId={defaultAccountId}
            />
          </div>
        </div>

        <main style={{ paddingTop: '52px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>
          {paymentToast && (
            <div style={{
              margin: '12px 14px 0',
              background: '#0f2219', border: '0.5px solid #1a3826',
              borderRadius: '10px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#1db97b', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
                ✓ Payment confirmed — your plan is now active!
              </span>
              <button onClick={() => setPaymentToast(false)} style={{ background: 'none', border: 'none', color: '#1db97b', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
            </div>
          )}
          <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid #111' }}>
            <div style={{ fontSize: '11px', color: '#777', marginBottom: '3px', fontFamily: 'DM Sans, sans-serif' }}>Total PnL</div>
            <div style={{ fontSize: '36px', fontWeight: '500', color: stats.totalPnl >= 0 ? '#1db97b' : '#c03535', lineHeight: 1, marginBottom: '5px', fontFamily: 'DM Sans, sans-serif' }}>
              {fmt(stats.totalPnl)}
            </div>
            <div style={{ fontSize: '11px', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>
              {stats.tradeCount} trades · {stats.dayCount} days
            </div>
          </div>

          <div style={{ margin: '10px 14px 0' }}>
            <ChallengeCard account={activeAccount} trades={trades} loading={loading} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            <PnLChart trades={trades} account={activeAccount} noMargin mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            <DailyBarChart trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            <WinLossDonut trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
          <StreakCard trades={trades} mobile />
          </div>
          <div style={{ margin: '8px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            <CalendarPnL trades={trades} mobile onDayClick={date => setDayModal(date)} />
          </div>
          <div style={{ margin: '8px 14px 16px', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
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
          />
        )}
      </div>
    )
  }

  // ─── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 16px 0' }}>Dashboard</h1>
          <AccountSwitcher
            onSwitch={(acc) => {
              setActiveAccount(acc)
              if (acc?.id) localStorage.setItem('activeAccountId', acc.id)
            }}
            defaultAccountId={defaultAccountId}
          />
        </div>
        {paymentToast && (
          <div style={{
            marginBottom: '24px',
            background: '#0f2219', border: '0.5px solid #1a3826',
            borderRadius: '10px', padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#1db97b', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
              ✓ Payment confirmed — your plan is now active!
            </span>
            <button onClick={() => setPaymentToast(false)} style={{ background: 'none', border: 'none', color: '#1db97b', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
          <div style={{ flex: '0 0 30%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ScoreCard trades={trades} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ChallengeCard account={activeAccount} trades={trades} loading={loading} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', marginBottom: '24px' }}>
          <div style={{ flex: '0 0 65%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <PnLChart trades={trades} account={activeAccount} noMargin />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            <CalendarPnL trades={trades} onDayClick={date => setDayModal(date)} />
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
        />
      )}
    </div>
  )
}