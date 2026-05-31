import { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import AccountSwitcher from '../components/AccountSwitcher'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from 'recharts'

// ─── Design tokens ────────────────────────────────────────────────
const T = {
  bg:        '#0a0a0a',
  card:      '#111',
  cardBorder:'#1e1e1e',
  stat:      '#0f0f0f',
  statBorder:'#1a1a1a',
  green:     '#1db97b',
  red:       '#c03535',
  amber:     '#c97a00',
  blue:      '#4d9fff',
  muted:     '#777',
  sub:       '#aaa',
  text:      '#e8e8e8',
  label:     '#aaa',
}

const font = {
  heading: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
}

// ─── Helpers ──────────────────────────────────────────────────────
function pnlColor(v) { return v >= 0 ? T.green : T.red }

function calcStats(trades) {
  if (!trades.length) return null
  const wins   = trades.filter(t => t.pnl > 0)
  const losses = trades.filter(t => t.pnl < 0)
  const gross_win  = wins.reduce((s,t) => s + t.pnl, 0)
  const gross_loss = Math.abs(losses.reduce((s,t) => s + t.pnl, 0))
  const net_pnl    = trades.reduce((s,t) => s + t.pnl, 0)
  const win_rate   = wins.length / trades.length
  const avg_rr     = trades.reduce((s,t) => s + (t.rr || 0), 0) / trades.length
  const avg_win    = wins.length   ? gross_win / wins.length       : 0
  const avg_loss   = losses.length ? gross_loss / losses.length    : 0
  const pf         = gross_loss > 0 ? gross_win / gross_loss : null
  return { wins: wins.length, losses: losses.length, total: trades.length,
           net_pnl, win_rate, avg_rr, avg_win, avg_loss, pf }
}

function fmtPnl(v) {
  if (v == null) return '—'
  const abs = Math.abs(v).toFixed(2)
  return (v >= 0 ? '+$' : '-$') + abs
}
function fmtPct(v) { return v == null ? '—' : (v * 100).toFixed(1) + '%' }
function fmtRR(v)  { return v == null ? '—' : v.toFixed(2) + 'R' }

// ─── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, valueColor, mobile = false }) {
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
      <div style={{ fontFamily: font.heading, fontSize: mobile ? 16 : 22, fontWeight: 600,
                    color: valueColor || T.text }}>
        {value}
      </div>
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

const CustomTooltipStyle = {
  background: '#161616', border: `0.5px solid ${T.cardBorder}`,
  borderRadius: 8, padding: '10px 14px',
  fontFamily: font.mono, fontSize: 11, color: T.text,
}

function PnLTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={CustomTooltipStyle}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ color: pnlColor(v), fontWeight: 600 }}>{fmtPnl(v)}</div>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={CustomTooltipStyle}>
      <div style={{ color: T.sub, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text }}>{p.name}: {p.value}</div>
      ))}
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
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Analytics() {
  const { collapsed } = useSidebar()
  const [selectedId, setSelectedId] = useState(null)
  const [activeAccount, setActiveAccount] = useState(null)
  const savedAccountId = localStorage.getItem('activeAccountId')
  const [trades, setTrades]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [isMobile, setIsMobile]   = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Fetch trades when account switches
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

  // ── Derived data ──────────────────────────────────────────────
  const stats = useMemo(() => calcStats(trades), [trades])

  // 1. Cumulative P&L
  const cumulativeData = useMemo(() => {
    let running = 0
    return trades.map(t => {
      running += (t.pnl || 0)
      return { date: t.date, value: parseFloat(running.toFixed(2)) }
    })
  }, [trades])

  // 2. Win rate by session
  const sessionData = useMemo(() => {
    const sessions = { london: [], new_york: [], asian: [] }
    trades.forEach(t => {
      const s = t.session?.toLowerCase()
      if (sessions[s]) sessions[s].push(t)
    })
    return Object.entries(sessions).map(([s, ts]) => ({
      session: s === 'new_york' ? 'New York' : s.charAt(0).toUpperCase() + s.slice(1),
      winRate: ts.length ? parseFloat(((ts.filter(t => t.pnl > 0).length / ts.length) * 100).toFixed(1)) : 0,
      trades: ts.length,
    }))
  }, [trades])

  // 3. P&L by day of week
  const dowData = useMemo(() => {
    const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
    trades.forEach(t => {
      const d = new Date(t.date)
      const name = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
      if (days[name] !== undefined) days[name] = parseFloat((days[name] + (t.pnl || 0)).toFixed(2))
    })
    return Object.entries(days).map(([day, pnl]) => ({ day, pnl }))
  }, [trades])

  // 4. Pair performance
  const pairData = useMemo(() => {
    const map = {}
    trades.forEach(t => {
      if (!t.pair) return
      if (!map[t.pair]) map[t.pair] = []
      map[t.pair].push(t)
    })
    return Object.entries(map).map(([pair, ts]) => {
      const wins = ts.filter(t => t.pnl > 0).length
      const net  = parseFloat(ts.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(2))
      const avgRR = parseFloat((ts.reduce((s, t) => s + (t.rr || 0), 0) / ts.length).toFixed(2))
      return { pair, trades: ts.length, winRate: ts.length ? ((wins / ts.length) * 100).toFixed(1) : 0, net, avgRR }
    }).sort((a, b) => b.net - a.net)
  }, [trades])

  // 5. Direction breakdown
  const dirData = useMemo(() => {
    const longs  = trades.filter(t => t.direction === 'long')
    const shorts = trades.filter(t => t.direction === 'short')
    const side = (ts) => ({
      count: ts.length,
      winRate: ts.length ? ((ts.filter(t => t.pnl > 0).length / ts.length) * 100).toFixed(1) : 0,
      net: parseFloat(ts.reduce((s, t) => s + (t.pnl || 0), 0).toFixed(2)),
    })
    return { long: side(longs), short: side(shorts) }
  }, [trades])

  // 6. RR distribution
  const rrData = useMemo(() => {
    const buckets = [
      { label: '0–1R', min: -Infinity, max: 1 },
      { label: '1–2R', min: 1, max: 2 },
      { label: '2–3R', min: 2, max: 3 },
      { label: '3R+',  min: 3, max: Infinity },
    ]
    return buckets.map(b => {
      const ts = trades.filter(t => (t.rr || 0) >= b.min && (t.rr || 0) < b.max)
      return {
        label: b.label,
        wins:   ts.filter(t => t.pnl > 0).length,
        losses: ts.filter(t => t.pnl <= 0).length,
      }
    })
  }, [trades])

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
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
          flex: 1,
          minHeight: '100vh',
          padding: isMobile ? '60px 10px 84px' : '32px 36px',
          maxWidth: '100%',
        }}>

          {isMobile && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '52px',
              paddingRight: '14px',
              zIndex: 201,
              pointerEvents: 'none',
            }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '15px',
                fontWeight: '500',
                color: '#e0e0e0',
              }}>
                Analytics
              </span>
            </div>
          )}
          {isMobile && (
            <div style={{
              position: 'fixed',
              top: 0,
              right: '14px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              zIndex: 202,
            }}>
              <AccountSwitcher
                onSwitch={(acc) => { setSelectedId(acc?.id || null); setActiveAccount(acc) }}
                defaultAccountId={savedAccountId}
                mobile
                showBalance={false}
                compact
                showSelectedNameOnMobile
              />
            </div>
          )}

          {/* Page header */}
          <div style={{ marginBottom: isMobile ? 10 : 28 }}>
            <h1 style={{ fontFamily: font.heading, fontSize: 22, fontWeight: 700,
                         color: T.text, margin: 0, marginBottom: 4, display: isMobile ? 'none' : 'block' }}>
              Analytics
            </h1>
            <div style={{ fontFamily: font.body, fontSize: 13, color: T.sub, display: isMobile ? 'none' : 'block' }}>
              Performance breakdown across trades, sessions, and pairs
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                {activeAccount && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontFamily: font.heading, fontSize: '18px', fontWeight: '700', color: T.text }}>
                      {activeAccount.name || activeAccount.firm_name || 'Account'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {activeAccount.account_size && (
                        <span style={{ fontFamily: font.mono, fontSize: '11px', color: T.sub }}>
                          ${Number(activeAccount.account_size).toLocaleString()}
                        </span>
                      )}
                      {activeAccount.created_at && (
                        <span style={{ fontFamily: font.mono, fontSize: '11px', color: T.muted }}>
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
          )}

          {!selectedId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '60px' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#666' }}>Select an account to view analytics</span>
            </div>
          ) : (loading && !isMobile) ? (
            <LoadingSkeleton />
          ) : trades.length === 0 ? (
            <Card mobile={isMobile}>
              <EmptyState message="No trades logged for this account yet." />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 24 }}>

              {/* ── 1. Overview row ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)',
                gap: isMobile ? 8 : 12,
              }}>
                <StatCard label="Total Trades"   value={stats.total} mobile={isMobile} />
                <StatCard label="Win Rate"        value={fmtPct(stats.win_rate)}
                          valueColor={stats.win_rate >= 0.5 ? T.green : T.amber} mobile={isMobile} />
                <StatCard label="Net P&L"         value={fmtPnl(stats.net_pnl)}
                          valueColor={pnlColor(stats.net_pnl)} mobile={isMobile} />
                <StatCard label="Profit Factor"   value={stats.pf ? stats.pf.toFixed(2) : '—'}
                          valueColor={stats.pf >= 1 ? T.green : T.red} mobile={isMobile} />
                <StatCard label="Avg RR"          value={fmtRR(stats.avg_rr)} mobile={isMobile} />
                <StatCard label="Avg Win / Loss"
                          value={stats.avg_loss > 0
                            ? (stats.avg_win / stats.avg_loss).toFixed(2) + 'x'
                            : '—'}
                          valueColor={T.blue} mobile={isMobile} />
              </div>

              {/* ── 2. Cumulative P&L ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Cumulative P&L</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={cumulativeData}
                    margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false}
                           tickFormatter={v => `$${v}`} width={52} />
                    <Tooltip content={<PnLTooltip />} />
                    <Line type="monotone" dataKey="value" stroke={T.green} strokeWidth={2}
                          dot={false} activeDot={{ r: 4, fill: T.green, stroke: T.bg }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* ── 3 + 4. Two bar charts side by side ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>

                {/* Win Rate by Session */}
                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>Win Rate by Session</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sessionData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="session"
                             tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                             tickLine={false} axisLine={false}
                             tickFormatter={v => `${v}%`} width={36} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {sessionData.map((entry, i) => (
                          <Cell key={i} fill={entry.winRate >= 50 ? T.green : T.amber} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Trade counts below */}
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
                    {sessionData.map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted }}>
                          {s.trades} trade{s.trades !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* P&L by Day of Week */}
                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>P&L by Day of Week</SectionTitle>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dowData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              </div>

              {/* ── 5. Pair Performance table ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Pair Performance</SectionTitle>
                {pairData.length === 0 ? (
                  <EmptyState message="No pair data available." />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
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
                                         fontSize: 12, color: row.winRate >= 50 ? T.green : T.amber }}>
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

              {/* ── 6. Direction breakdown — two donuts ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 24 }}>

                {/* Donut 1: Win / Loss / BE */}
                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>Win / Loss / BE</SectionTitle>
                  {(() => {
                    const wins   = trades.filter(t => t.pnl > 0).length
                    const losses = trades.filter(t => t.pnl < 0).length
                    const be     = trades.filter(t => t.pnl === 0).length
                    const total  = trades.length
                    const winRate = total ? ((wins / total) * 100).toFixed(1) : '0'
                    const donutData = [
                      { name: 'Win',  value: wins,   color: T.green },
                      { name: 'Loss', value: losses, color: T.red },
                      ...(be > 0 ? [{ name: 'BE', value: be, color: T.amber }] : []),
                    ].filter(d => d.value > 0)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                          <PieChart width={160} height={160}>
                            <Pie data={donutData} dataKey="value"
                              cx={75} cy={75} innerRadius={50} outerRadius={72}
                              strokeWidth={0} paddingAngle={2}>
                              {donutData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 700,
                                          color: parseFloat(winRate) >= 50 ? T.green : T.amber }}>
                              {winRate}%
                            </div>
                            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                          textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                              Win Rate
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: isMobile ? '100%' : 'auto' }}>
                          {[
                            { label: 'Wins',   value: wins,   color: T.green },
                            { label: 'Losses', value: losses, color: T.red },
                            ...(be > 0 ? [{ label: 'BE', value: be, color: T.amber }] : []),
                          ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                              <div style={{ fontFamily: font.mono, fontSize: 11, color: T.sub }}>{item.label}</div>
                              <div style={{ fontFamily: font.heading, fontSize: 14, fontWeight: 600,
                                            color: T.text, marginLeft: 4 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </Card>

                {/* Donut 2: Long vs Short */}
                <Card mobile={isMobile}>
                  <SectionTitle mobile={isMobile}>Long vs Short</SectionTitle>
                  {(() => {
                    const longCount  = dirData.long.count
                    const shortCount = dirData.short.count
                    const total = longCount + shortCount
                    const longPct = total ? ((longCount / total) * 100).toFixed(1) : '0'
                    const donutData = [
                      { name: 'Long',  value: longCount,  color: T.green },
                      { name: 'Short', value: shortCount, color: T.red },
                    ].filter(d => d.value > 0)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 24, flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                          <PieChart width={160} height={160}>
                            <Pie data={donutData} dataKey="value"
                              cx={75} cy={75} innerRadius={50} outerRadius={72}
                              strokeWidth={0} paddingAngle={2}>
                              {donutData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                          <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 700, color: T.blue }}>
                              {longPct}%
                            </div>
                            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                          textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                              Long
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: isMobile ? '100%' : 'auto' }}>
                          {[
                            { label: 'Long',  data: dirData.long,  icon: '↑', color: T.green },
                            { label: 'Short', data: dirData.short, icon: '↓', color: T.red },
                          ].map(({ label, data, icon, color }) => (
                            <div key={label}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                                <div style={{ fontFamily: font.mono, fontSize: 11, color: T.sub }}>{label}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 14 }}>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Trades</div>
                                  <div style={{ fontFamily: font.heading, fontSize: 15, fontWeight: 600, color: T.text }}>{data.count}</div>
                                </div>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Win %</div>
                                  <div style={{ fontFamily: font.heading, fontSize: 15, fontWeight: 600,
                                                color: data.winRate >= 50 ? T.green : T.amber }}>{data.winRate}%</div>
                                </div>
                                <div>
                                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted,
                                                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>P&L</div>
                                  <div style={{ fontFamily: font.heading, fontSize: 15, fontWeight: 600,
                                                color: pnlColor(data.net) }}>{fmtPnl(data.net)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </Card>

              </div>

              {/* ── 7. RR Distribution ── */}
              <Card mobile={isMobile} style={{ marginBottom: isMobile ? 8 : 40 }}>
                <SectionTitle mobile={isMobile}>RR Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rrData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#181818" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label"
                           tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontFamily: font.mono, fontSize: 10, fill: T.muted }}
                           tickLine={false} axisLine={false}
                           allowDecimals={false} width={28} />
                    <Tooltip content={<BarTooltip />} />
                    <Legend
                      wrapperStyle={{ fontFamily: font.mono, fontSize: 11, color: T.sub, paddingTop: 12 }}
                    />
                    <Bar dataKey="wins"   name="Wins"   fill={T.green} radius={[4,4,0,0]} maxBarSize={40} stackId="a" />
                    <Bar dataKey="losses" name="Losses" fill={T.red}   radius={[4,4,0,0]} maxBarSize={40} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

            </div>
          )}
        </main>
      </div>
    </>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            flex: 1, background: '#0f0f0f', border: '0.5px solid #1a1a1a',
            borderRadius: 10, padding: '18px 20px',
          }}>
            <Skeleton h={10} w="60%" mb={10} />
            <Skeleton h={22} w="80%" />
          </div>
        ))}
      </div>
      <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
        <Skeleton h={12} w="140px" mb={16} />
        <Skeleton h={220} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {[0,1].map(i => (
          <div key={i} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 12, padding: 24 }}>
            <Skeleton h={12} w="140px" mb={16} />
            <Skeleton h={200} />
          </div>
        ))}
      </div>
    </div>
  )
}
