import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import AccountSwitcher from '../components/AccountSwitcher'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area, ReferenceLine,
} from 'recharts'

// ─── Design tokens ─────────────────────────────────────────────────
const T = {
  bg:         '#0a0a0a',
  card:       '#111',
  cardBorder: '#1e1e1e',
  stat:       '#0f0f0f',
  statBorder: '#1a1a1a',
  green:      '#1db97b',
  red:        '#c03535',
  amber:      '#c97a00',
  blue:       '#4d9fff',
  muted:      '#777',
  sub:        '#aaa',
  text:       '#e8e8e8',
}

const font = {
  heading: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
}

// ─── Helpers ───────────────────────────────────────────────────────
function pnlColor(v) { return v > 0 ? T.green : v < 0 ? T.red : T.muted }

function fmtPnl(v) {
  if (v == null) return '—'
  const abs = Math.abs(v).toFixed(2)
  return (v >= 0 ? '+$' : '-$') + abs
}
function fmtRR(v)  { return v == null ? '—' : v.toFixed(2) + 'R' }

function calcStats(trades) {
  if (!trades.length) return null
  const wins    = trades.filter(t => t.pnl > 0)
  const losses  = trades.filter(t => t.pnl < 0)
  const bes     = trades.filter(t => t.pnl === 0)
  const gw      = wins.reduce((s, t) => s + t.pnl, 0)
  const gl      = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const net     = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const wr      = wins.length / trades.length
  const avgWin  = wins.length   ? gw / wins.length   : 0
  const avgLoss = losses.length ? gl / losses.length : 0
  const expectancy = (wr * avgWin) - ((1 - wr) * avgLoss)
  const avgRR   = trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length

  // best / worst
  const best  = Math.max(...trades.map(t => t.pnl || 0))
  const worst = Math.min(...trades.map(t => t.pnl || 0))

  // consecutive wins/losses
  let maxConsecW = 0, maxConsecL = 0, curW = 0, curL = 0
  trades.forEach(t => {
    if (t.pnl > 0) { curW++; curL = 0; maxConsecW = Math.max(maxConsecW, curW) }
    else if (t.pnl < 0) { curL++; curW = 0; maxConsecL = Math.max(maxConsecL, curL) }
    else { curW = 0; curL = 0 }
  })

  // green days %
  const dayMap = {}
  trades.forEach(t => {
    if (!t.date) return
    const d = t.date.slice(0, 10)
    if (!dayMap[d]) dayMap[d] = 0
    dayMap[d] += (t.pnl || 0)
  })
  const days = Object.values(dayMap)
  const greenDaysPct = days.length ? (days.filter(d => d > 0).length / days.length) * 100 : 0

  // avg trades/day
  const avgTradesPerDay = days.length ? trades.length / days.length : 0

  return {
    total: trades.length, wins: wins.length, losses: losses.length, bes: bes.length,
    net, wr, avgWin, avgLoss, expectancy, avgRR, best, worst,
    maxConsecW, maxConsecL, greenDaysPct, avgTradesPerDay,
  }
}

// ─── Sub-components ────────────────────────────────────────────────
function StatCard({ label, value, valueColor, sub, mobile = false }) {
  return (
    <div style={{
      background: T.stat, border: `0.5px solid ${T.statBorder}`,
      borderRadius: mobile ? 8 : 10,
      padding: mobile ? '10px 10px' : '18px 20px',
      flex: 1, minWidth: 0,
    }}>
      <div style={{ fontFamily: font.mono, fontSize: mobile ? 9 : 10, color: T.sub,
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: mobile ? 5 : 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: font.heading, fontSize: mobile ? 15 : 21, fontWeight: 600,
                    color: valueColor || T.text, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function SectionTitle({ children, mobile = false }) {
  return (
    <div style={{ fontFamily: font.heading, fontSize: mobile ? 12 : 13, fontWeight: 600,
                  color: T.sub, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: mobile ? 12 : 16 }}>
      {children}
    </div>
  )
}

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

const tooltipStyle = {
  background: '#161616', border: `0.5px solid #1e1e1e`,
  borderRadius: 8, padding: '10px 14px',
  fontFamily: font.mono, fontSize: 11, color: T.text,
}

function PnLTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={tooltipStyle}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ color: pnlColor(v), fontWeight: 600 }}>{fmtPnl(v)}</div>
    </div>
  )
}

function MultiTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <div style={{ color: T.sub, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text, marginBottom: 2 }}>
          {p.name}: {typeof p.value === 'number' && p.name?.includes('P&L')
            ? fmtPnl(p.value)
            : typeof p.value === 'number' && p.name?.includes('%')
            ? p.value.toFixed(1) + '%'
            : p.value}
        </div>
      ))}
    </div>
  )
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={tooltipStyle}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{d.pair || ''}</div>
      <div>RR: <span style={{ color: T.blue }}>{d.rr != null ? d.rr.toFixed(2) + 'R' : '—'}</span></div>
      <div>P&L: <span style={{ color: pnlColor(d.pnl) }}>{fmtPnl(d.pnl)}</span></div>
    </div>
  )
}

function EmptyState({ message = 'No trades logged yet.' }) {
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
      background: 'linear-gradient(90deg, #161616 25%, #1c1c1c 50%, #161616 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ─── Hour × Day Heatmap ────────────────────────────────────────────
function HourDayHeatmap({ trades, mobile }) {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  const tradeHours = trades
    .filter(t => t.date && t.time)
    .map(t => new Date(t.date + 'T' + t.time).getHours())
  const minHour = tradeHours.length ? Math.max(0,  Math.min(...tradeHours) - 1) : 6
  const maxHour = tradeHours.length ? Math.min(23, Math.max(...tradeHours) + 1) : 16
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour)

  const grid = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!t.date || !t.time) return
      const d = new Date(t.date + 'T' + t.time)
      const dow = d.getDay()
      const hr  = d.getHours()
      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow]
      if (!DAYS.includes(dayName)) return
      const key = `${dayName}-${hr}`
      if (!map[key]) map[key] = { pnl: 0, count: 0 }
      map[key].pnl   += (t.pnl || 0)
      map[key].count += 1
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades])

  const allPnls = Object.values(grid).map(v => v.pnl).filter(Boolean)
  const maxAbs  = allPnls.length ? Math.max(...allPnls.map(Math.abs)) : 1
  const cellH   = mobile ? 18 : 24

  function cellColor(pnl, count) {
    if (!count) return '#161616'
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1)
    if (pnl > 0) return `rgba(29,185,123,${0.15 + intensity * 0.75})`
    return `rgba(192,53,53,${0.15 + intensity * 0.75})`
  }

  // best hour by total pnl
  const hourTotals = {}
  Object.entries(grid).forEach(([key, val]) => {
    const hr = key.split('-')[1]
    if (!hourTotals[hr]) hourTotals[hr] = 0
    hourTotals[hr] += val.pnl
  })
  const bestHr  = Object.entries(hourTotals).sort((a,b) => b[1]-a[1])[0]
  const worstHr = Object.entries(hourTotals).sort((a,b) => a[1]-b[1])[0]

  // best day by total pnl
  const dayTotals = {}
  DAYS.forEach(d => { dayTotals[d] = 0 })
  Object.entries(grid).forEach(([key, val]) => {
    const day = key.split('-')[0]
    dayTotals[day] = (dayTotals[day] || 0) + val.pnl
  })
  const bestDay  = Object.entries(dayTotals).sort((a,b) => b[1]-a[1])[0]
  const worstDay = Object.entries(dayTotals).sort((a,b) => a[1]-b[1])[0]

  const fmt = (hr) => {
    const h = parseInt(hr)
    return (h < 10 ? '0'+h : h) + ':00'
  }

  return (
    <div style={{ display: 'flex', gap: mobile ? 12 : 32, flexDirection: mobile ? 'column' : 'row' }}>
      {/* Heatmap grid */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', marginLeft: 32, marginBottom: 4 }}>
          {hours.map(h => (
            <div key={h} style={{ flex: 1, textAlign: 'center',
              fontFamily: font.mono, fontSize: 8, color: T.muted }}>
              {h < 10 ? '0'+h : h}
            </div>
          ))}
        </div>
        {DAYS.map(day => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <div style={{ width: 32, fontFamily: font.mono, fontSize: 9,
                          color: T.sub, flexShrink: 0 }}>{day}</div>
            {hours.map(hr => {
              const k = `${day}-${hr}`
              const cell = grid[k] || { pnl: 0, count: 0 }
              return (
                <div key={hr}
                  title={cell.count ? `${fmtPnl(cell.pnl)} (${cell.count} trades)` : ''}
                  style={{
                    flex: 1, height: cellH, marginRight: 2,
                    borderRadius: 3, background: cellColor(cell.pnl, cell.count),
                    border: cell.count ? 'none' : '0.5px solid #1c1c1c',
                  }} />
              )
            })}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted }}>Loss</div>
          {[0.8, 0.5, 0.2].map(a => (
            <div key={a} style={{ width: 10, height: 10, borderRadius: 2,
              background: `rgba(192,53,53,${a})` }} />
          ))}
          <div style={{ width: 10, height: 10, borderRadius: 2,
            background: '#161616', border: '0.5px solid #1c1c1c' }} />
          {[0.2, 0.5, 0.8].map(a => (
            <div key={a} style={{ width: 10, height: 10, borderRadius: 2,
              background: `rgba(29,185,123,${a})` }} />
          ))}
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted }}>Profit</div>
        </div>
      </div>

      {/* Right side stats */}
      {!mobile && (
        <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {[
            { label: 'Best Hour',  value: bestHr  ? fmt(bestHr[0])  : '—', sub: bestHr  ? fmtPnl(bestHr[1])  : '', color: T.green },
            { label: 'Worst Hour', value: worstHr ? fmt(worstHr[0]) : '—', sub: worstHr ? fmtPnl(worstHr[1]) : '', color: T.red   },
            { label: 'Best Day',   value: bestDay  ? bestDay[0]  : '—', sub: bestDay  ? fmtPnl(bestDay[1])  : '', color: T.green },
            { label: 'Worst Day',  value: worstDay ? worstDay[0] : '—', sub: worstDay ? fmtPnl(worstDay[1]) : '', color: T.red   },
          ].map(item => (
            <div key={item.label} style={{
              background: T.stat, border: `0.5px solid ${T.statBorder}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: font.heading, fontSize: 16, fontWeight: 600, color: item.color }}>
                {item.value}
              </div>
              {item.sub && (
                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                  {item.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function Analytics() {
  const { collapsed } = useSidebar()
  const [selectedId, setSelectedId]   = useState(null)
  const [activeAccount, setActiveAccount] = useState(null)
  const savedAccountId = localStorage.getItem('activeAccountId')
  const [trades, setTrades]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [isMobile, setIsMobile]       = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    async function loadTrades() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', selectedId)
          .order('date', { ascending: true })
        setTrades(data || [])
      } catch (e) {
        console.error('Analytics fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    loadTrades()
  }, [selectedId])

  // ── Derived data ─────────────────────────────────────────────────
  const stats = useMemo(() => calcStats(trades), [trades])

  // 1. Drawdown curve
  const drawdownData = useMemo(() => {
    let peak = 0, running = 0
    return trades.map(t => {
      running += (t.pnl || 0)
      if (running > peak) peak = running
      const dd = peak > 0 ? ((running - peak) / peak) * 100 : 0
      return { date: t.date, drawdown: parseFloat(dd.toFixed(2)) }
    })
  }, [trades])

  // 2. P&L by day of week
  const dowData = useMemo(() => {
    const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
    trades.forEach(t => {
      const d    = new Date(t.date)
      const name = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
      if (days[name] !== undefined)
        days[name] = parseFloat((days[name] + (t.pnl || 0)).toFixed(2))
    })
    return Object.entries(days).map(([day, pnl]) => ({ day, pnl }))
  }, [trades])

  // 3. P&L + win rate by session
  const sessionData = useMemo(() => {
    const sess = { london: [], new_york: [], asian: [] }
    trades.forEach(t => {
      const s = t.session?.toLowerCase()
      if (sess[s]) sess[s].push(t)
    })
    return Object.entries(sess).map(([s, ts]) => ({
      session: s === 'new_york' ? 'New York' : s.charAt(0).toUpperCase() + s.slice(1),
      pnl:     parseFloat(ts.reduce((a, t) => a + (t.pnl || 0), 0).toFixed(2)),
      winRate: ts.length ? parseFloat(((ts.filter(t => t.pnl > 0).length / ts.length) * 100).toFixed(1)) : 0,
      trades:  ts.length,
    }))
  }, [trades])

  // 4. RR vs P&L scatter
  const scatterData = useMemo(() =>
    trades
      .filter(t => t.rr != null && t.pnl != null)
      .map(t => ({ rr: parseFloat((t.rr || 0).toFixed(2)), pnl: parseFloat((t.pnl || 0).toFixed(2)), pair: t.pair || '' }))
  , [trades])

  // 5. Long vs Short grouped bar
  const dirData = useMemo(() => {
    const side = (ts) => ({
      count:   ts.length,
      winRate: ts.length ? parseFloat(((ts.filter(t => t.pnl > 0).length / ts.length) * 100).toFixed(1)) : 0,
      pnl:     parseFloat(ts.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(2)),
    })
    return [
      { dir: 'Long',  ...side(trades.filter(t => t.direction === 'long'))  },
      { dir: 'Short', ...side(trades.filter(t => t.direction === 'short')) },
    ]
  }, [trades])

  // 6. P&L distribution histogram
  const histData = useMemo(() => {
    if (!trades.length) return []
    const pnls = trades.map(t => t.pnl || 0)
    const mn = Math.floor(Math.min(...pnls))
    const mx = Math.ceil(Math.max(...pnls))
    const range = mx - mn || 1
    const bucketCount = Math.min(12, Math.max(6, Math.floor(trades.length / 3)))
    const step = range / bucketCount
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const lo = mn + i * step
      const hi = lo + step
      const label = `${lo >= 0 ? '+' : ''}${lo.toFixed(0)}`
      const count = pnls.filter(p => p >= lo && (i === bucketCount - 1 ? p <= hi : p < hi)).length
      const color = lo >= 0 ? T.green : T.red
      return { label, count, color }
    })
    return buckets
  }, [trades])

  // 7. Pair performance
  const pairData = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!t.pair) return
      if (!map[t.pair]) map[t.pair] = []
      map[t.pair].push(t)
    })
    return Object.entries(map).map(([pair, ts]) => {
      const wins   = ts.filter(t => t.pnl > 0).length
      const net    = parseFloat(ts.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(2))
      const avgRR  = parseFloat((ts.reduce((s, t) => s + (t.rr || 0), 0) / ts.length).toFixed(2))
      return { pair, trades: ts.length, winRate: ts.length ? ((wins / ts.length) * 100).toFixed(1) : 0, net, avgRR }
    }).sort((a, b) => b.net - a.net)
  }, [trades])

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
      `}</style>

      <div style={{ display: 'flex', background: T.bg, minHeight: '100vh' }}>
        <Sidebar />
        <main style={{
          marginLeft: isMobile ? 0 : (collapsed ? 60 : 220),
          transition: 'margin-left 0.2s ease',
          flex: 1, minHeight: '100vh',
          padding: isMobile ? '60px 10px 84px' : '32px 36px',
          maxWidth: '100%',
        }}>

          {/* Mobile header */}
          {isMobile && (
            <>
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: 52,
                display: 'flex', alignItems: 'center',
                paddingLeft: 52, paddingRight: 14,
                zIndex: 201, pointerEvents: 'none',
              }}>
                <span style={{ fontFamily: font.body, fontSize: 15, fontWeight: 500, color: '#e0e0e0' }}>
                  Analytics
                </span>
              </div>
              <div style={{
                position: 'fixed', top: 0, right: 14, height: 52,
                display: 'flex', alignItems: 'center', zIndex: 202,
              }}>
                <AccountSwitcher
                  onSwitch={(acc) => { setSelectedId(acc?.id || null); setActiveAccount(acc) }}
                  defaultAccountId={savedAccountId}
                  mobile showBalance={false} compact showSelectedNameOnMobile
                />
              </div>
            </>
          )}

          {/* Desktop header */}
          {!isMobile && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: font.heading, fontSize: 22, fontWeight: 700,
                             color: T.text, margin: 0, marginBottom: 4 }}>
                  Analytics
                </h1>
                <div style={{ fontFamily: font.body, fontSize: 13, color: T.sub }}>
                  Deep performance analysis — edge, risk, and consistency
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  {activeAccount && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontFamily: font.heading, fontSize: 18, fontWeight: 700, color: T.text }}>
                        {activeAccount.name || activeAccount.firm_name || 'Account'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {activeAccount.account_size && (
                          <span style={{ fontFamily: font.mono, fontSize: 11, color: T.sub }}>
                            ${Number(activeAccount.account_size).toLocaleString()}
                          </span>
                        )}
                        {activeAccount.created_at && (
                          <span style={{ fontFamily: font.mono, fontSize: 11, color: T.muted }}>
                            Since {new Date(activeAccount.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <AccountSwitcher
                  onSwitch={(acc) => { setSelectedId(acc?.id || null); setActiveAccount(acc) }}
                  defaultAccountId={savedAccountId}
                  showBalance={false}
                />
              </div>
            </>
          )}

          {!selectedId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <span style={{ fontFamily: font.mono, fontSize: 12, color: '#666' }}>
                Select an account to view analytics
              </span>
            </div>
          ) : loading ? (
            <LoadingSkeleton />
          ) : trades.length === 0 ? (
            <Card mobile={isMobile}>
              <EmptyState message="No trades logged for this account yet." />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 24 }}>

              {/* ── 1. Stat Cards (8) ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isMobile ? 8 : 12,
              }}>
                <StatCard
                  label="Expectancy"
                  value={stats ? (stats.expectancy >= 0 ? '+$' : '-$') + Math.abs(stats.expectancy).toFixed(2) : '—'}
                  valueColor={stats ? pnlColor(stats.expectancy) : T.text}
                  sub="per trade"
                  mobile={isMobile}
                />
                <StatCard
                  label="Avg RR"
                  value={stats ? fmtRR(stats.avgRR) : '—'}
                  valueColor={stats && stats.avgRR >= 1 ? T.green : T.amber}
                  mobile={isMobile}
                />
                <StatCard
                  label="Best Trade"
                  value={stats ? fmtPnl(stats.best) : '—'}
                  valueColor={T.green}
                  mobile={isMobile}
                />
                <StatCard
                  label="Worst Trade"
                  value={stats ? fmtPnl(stats.worst) : '—'}
                  valueColor={T.red}
                  mobile={isMobile}
                />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isMobile ? 8 : 12,
              }}>
                <StatCard
                  label="Avg Win"
                  value={stats ? '+$' + stats.avgWin.toFixed(2) : '—'}
                  valueColor={T.green}
                  mobile={isMobile}
                />
                <StatCard
                  label="Avg Loss"
                  value={stats ? '-$' + stats.avgLoss.toFixed(2) : '—'}
                  valueColor={T.red}
                  mobile={isMobile}
                />
                <StatCard
                  label="Max Consec. Wins"
                  value={stats ? stats.maxConsecW : '—'}
                  valueColor={T.green}
                  mobile={isMobile}
                />
                <StatCard
                  label="Max Consec. Losses"
                  value={stats ? stats.maxConsecL : '—'}
                  valueColor={T.red}
                  mobile={isMobile}
                />
              </div>

              {/* ── 2. Drawdown Curve ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Drawdown Curve</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={drawdownData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={T.red} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T.red} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date"
                           tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false}
                           tickFormatter={v => `${v}%`} width={40} />
                    <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={tooltipStyle}>
                            <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
                            <div style={{ color: T.red, fontWeight: 600 }}>
                              {payload[0].value.toFixed(2)}%
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Area type="monotone" dataKey="drawdown"
                          stroke={T.red} strokeWidth={1.5}
                          fill="url(#ddGrad)" dot={false}
                          activeDot={{ r: 4, fill: T.red, stroke: T.bg }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* ── 3. P&L by Day + P&L by Session ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>

                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>P&L by Day of Week</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dowData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             tickFormatter={v => `$${v}`} width={44} />
                      <Tooltip content={<PnLTooltip />} />
                      <Bar dataKey="pnl" name="Net P&L" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {dowData.map((entry, i) => (
                          <Cell key={i} fill={entry.pnl >= 0 ? T.green : T.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>P&L by Session</SectionTitle>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={sessionData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="session"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             tickFormatter={v => `$${v}`} width={44} />
                      <Tooltip content={<PnLTooltip />} />
                      <Bar dataKey="pnl" name="Net P&L" radius={[4, 4, 0, 0]} maxBarSize={52}>
                        {sessionData.map((entry, i) => (
                          <Cell key={i} fill={entry.pnl >= 0 ? T.green : T.red} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Win rate row */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10 }}>
                    {sessionData.map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                          Win Rate
                        </div>
                        <div style={{ fontFamily: font.heading, fontSize: 13, fontWeight: 600,
                                      color: s.winRate >= 50 ? T.green : T.amber }}>
                          {s.winRate}%
                        </div>
                        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, marginTop: 2 }}>
                          {s.trades} trade{s.trades !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* ── 4. RR vs P&L Scatter ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>RR vs P&L — Scatter</SectionTitle>
                {scatterData.length < 2 ? (
                  <EmptyState message="Need more trades with RR data." />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#181818" strokeDasharray="3 3" />
                      <XAxis dataKey="rr" name="RR" type="number"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             label={{ value: 'RR', position: 'insideBottomRight', offset: -4,
                                      style: { fontFamily: font.mono, fontSize: 9, fill: T.muted } }} />
                      <YAxis dataKey="pnl" name="P&L" type="number"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             tickFormatter={v => `$${v}`} width={50} />
                      <ZAxis range={[40, 40]} />
                      <ReferenceLine y={0} stroke="#333" strokeDasharray="3 3" />
                      <ReferenceLine x={0} stroke="#333" strokeDasharray="3 3" />
                      <Tooltip content={<ScatterTooltip />} />
                      <Scatter data={scatterData} shape={(props) => {
                        const { cx, cy, payload } = props
                        return <circle cx={cx} cy={cy} r={5}
                          fill={payload.pnl >= 0 ? T.green : T.red}
                          fillOpacity={0.7} stroke="none" />
                      }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* ── 5. Hour × Day Heatmap ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Best Trading Hours</SectionTitle>
                <HourDayHeatmap trades={trades} mobile={isMobile} />
              </Card>

              {/* ── 6. Long vs Short ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Long vs Short</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 32 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dirData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="dir"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             tickFormatter={v => `$${v}`} width={44} />
                      <Tooltip content={<MultiTooltip />} />
                      <Bar dataKey="pnl" name="Net P&L" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        <Cell fill={T.green} />
                        <Cell fill={T.red} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Stats table */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                    {dirData.map(d => (
                      <div key={d.dir}>
                        <div style={{ fontFamily: font.mono, fontSize: 10, color: T.sub,
                                      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                          {d.dir}
                        </div>
                        <div style={{ display: 'flex', gap: isMobile ? 16 : 24 }}>
                          {[
                            { label: 'Trades',  value: d.count,             color: T.text },
                            { label: 'Win %',   value: d.winRate + '%',     color: d.winRate >= 50 ? T.green : T.amber },
                            { label: 'P&L',     value: fmtPnl(d.pnl),      color: pnlColor(d.pnl) },
                          ].map(item => (
                            <div key={item.label}>
                              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                                {item.label}
                              </div>
                              <div style={{ fontFamily: font.heading, fontSize: 15, fontWeight: 600, color: item.color }}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* ── 7. P&L Distribution Histogram ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>P&L Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={histData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label"
                           tick={{ fontFamily: font.mono, fontSize: 9, fill: T.muted }}
                           tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false}
                           allowDecimals={false} width={28} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={tooltipStyle}>
                            <div style={{ color: T.sub, marginBottom: 4 }}>Range: {label}</div>
                            <div style={{ color: T.text }}>{payload[0].value} trade{payload[0].value !== 1 ? 's' : ''}</div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {histData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* ── 8. Pair Performance table ── */}
              <Card mobile={isMobile} style={{ marginBottom: isMobile ? 8 : 40 }}>
                <SectionTitle mobile={isMobile}>Pair Performance</SectionTitle>
                {pairData.length === 0 ? (
                  <EmptyState message="No pair data available." />
                ) : (
                  <div style={{ width: '100%' }}>
                    <table style={{ width: '100%', minWidth: isMobile ? 560 : '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Pair', 'Trades', 'Win Rate', 'Net P&L', 'Avg RR'].map(h => (
                            <th key={h} style={{
                              fontFamily: font.mono, fontSize: 10, color: T.sub,
                              textAlign: 'left', padding: '0 0 12px',
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                              borderBottom: `0.5px solid ${T.cardBorder}`,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pairData.map((row, i) => (
                          <tr key={row.pair} style={{
                            borderBottom: i < pairData.length - 1
                              ? `0.5px solid ${T.cardBorder}` : 'none',
                          }}>
                            <td style={{ padding: '12px 0', fontFamily: font.mono,
                                         fontSize: 13, color: T.text, fontWeight: 500 }}>
                              {row.pair}
                            </td>
                            <td style={{ padding: '12px 0', fontFamily: font.mono,
                                         fontSize: 12, color: T.sub }}>{row.trades}</td>
                            <td style={{ padding: '12px 0', fontFamily: font.mono,
                                         fontSize: 12, color: parseFloat(row.winRate) >= 50 ? T.green : T.amber }}>
                              {row.winRate}%
                            </td>
                            <td style={{ padding: '12px 0', fontFamily: font.mono,
                                         fontSize: 12, color: pnlColor(row.net), fontWeight: 500 }}>
                              {fmtPnl(row.net)}
                            </td>
                            <td style={{ padding: '12px 0', fontFamily: font.mono,
                                         fontSize: 12, color: T.sub }}>{row.avgRR}R</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            </div>
          )}
        </main>
      </div>
    </>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: 10, padding: '18px 20px' }}>
            <Skeleton h={10} w="60%" mb={10} />
            <Skeleton h={22} w="80%" />
          </div>
        ))}
      </div>
      <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
        <Skeleton h={12} w="140px" mb={16} />
        <Skeleton h={180} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <Skeleton h={12} w="140px" mb={16} />
            <Skeleton h={200} />
          </div>
        ))}
      </div>
    </div>
  )
}