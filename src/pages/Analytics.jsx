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

// ─── Helpers ───────────────────────────────────────────────────────
function pnlColor(v) { return v > 0 ? T.green : v < 0 ? T.red : T.muted }

function fmtPct(v) {
  if (v == null) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
}

// health status → badge styling
const HEALTH = {
  healthy: { emoji: '🟢', label: 'Healthy', color: T.green },
  neutral: { emoji: '🟡', label: 'Neutral', color: T.amber },
  risk:    { emoji: '🔴', label: 'Risk',    color: T.red   },
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

function SectionTitle({ children, mobile = false }) {
  return (
    <div style={{ fontFamily: font.heading, fontSize: mobile ? 12 : 13, fontWeight: 600,
                  color: T.sub, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: mobile ? 12 : 16 }}>
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

// ─── Highlight card (Best / Worst) ──────────────────────────────────
function HighlightCard({ label, metrics, accent, mobile }) {
  if (!metrics) {
    return (
      <Card mobile={mobile}>
        <SectionTitle mobile={mobile}>{label}</SectionTitle>
        <EmptyState message="No active accounts to compare yet." />
      </Card>
    )
  }
  const health = HEALTH[metrics.healthStatus]
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
      <div style={{ display: 'flex', gap: mobile ? 16 : 28 }}>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>P&L</div>
          <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 600, color: accent }}>{fmtPct(metrics.netPnlPct)}</div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Profit Factor</div>
          <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 600, color: T.text }}>
            {isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : '∞'}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Drawdown Used</div>
          <div style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 600, color: metrics.ddConsumedPct >= 60 ? T.red : T.text }}>
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

        // Challenge accounts only — drawdown/profit-target comparison
        // doesn't mean anything for a 'personal' account with no rules.
        const { data: accountsData, error: accErr } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .neq('type', 'personal')
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

  // ── Derived data ─────────────────────────────────────────────────
  const metrics = useMemo(() => {
    return accounts.map(acc =>
      computeAccountMetrics(acc, trades.filter(t => t.account_id === acc.id))
    )
  }, [accounts, trades])

  // Default view: accounts still in play. Passed/failed are resolved
  // outcomes, not ongoing risk — toggle this filter later if you want
  // resolved accounts visible too.
  const activeMetrics = useMemo(() => metrics.filter(m => m.status === 'active'), [metrics])

  const best = useMemo(() => {
    if (!activeMetrics.length) return null
    return [...activeMetrics].sort((a, b) => b.profitProgressPct - a.profitProgressPct)[0]
  }, [activeMetrics])

  const worst = useMemo(() => {
    if (!activeMetrics.length) return null
    return [...activeMetrics].sort((a, b) => b.ddConsumedPct - a.ddConsumedPct)[0]
  }, [activeMetrics])

  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: T.bg }}>
        <Sidebar />
        <main style={{
          flex: 1,
          marginLeft: isMobile ? 0 : (collapsed ? 60 : 220),
          padding: isMobile ? 16 : 40,
          // Mobile Sidebar renders a fixed 60px bottom tab bar instead of
          // a side rail — without this, table content sits underneath it.
          paddingBottom: isMobile ? 80 : 40,
          transition: 'margin-left 0.2s',
        }}>
          <div style={{ marginBottom: isMobile ? 20 : 32 }}>
            <h1 style={{ fontFamily: font.heading, fontSize: isMobile ? 20 : 26, fontWeight: 700, color: T.text, margin: '0 0 6px 0' }}>
              Analytics
            </h1>
            <p style={{ fontFamily: font.body, fontSize: 13, color: T.muted, margin: 0 }}>
              Which account is doing well, and which is in trouble.
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 12, padding: 24 }}>
                    <Skeleton h={12} w="100px" mb={16} />
                    <Skeleton h={40} w="60%" />
                  </div>
                ))}
              </div>
              <div style={{ background: T.card, border: `0.5px solid ${T.cardBorder}`, borderRadius: 12, padding: 24 }}>
                <Skeleton h={12} w="180px" mb={16} />
                <Skeleton h={160} />
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <Card mobile={isMobile}>
              <EmptyState message="No challenge accounts yet — add one from Challenge Tracker to see comparisons here." />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>

              {/* ── Best / Worst ── */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24 }}>
                <HighlightCard label="Best Performing Account" metrics={best} accent={T.green} mobile={isMobile} />
                <HighlightCard label="Needs Attention" metrics={worst} accent={T.red} mobile={isMobile} />
              </div>

              {/* ── Account Comparison Table ── */}
              <Card mobile={isMobile}>
                <SectionTitle mobile={isMobile}>Account Comparison</SectionTitle>
                {activeMetrics.length === 0 ? (
                  <EmptyState message="No active accounts right now." />
                ) : (
                  <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: isMobile ? 560 : '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Account', 'P&L', 'Win Rate', 'Profit Factor', 'Drawdown', 'Status'].map(h => (
                            <th key={h} style={{
                              fontFamily: font.mono, fontSize: 10, color: T.sub,
                              textAlign: 'left', padding: '0 12px 12px 0',
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                              borderBottom: `0.5px solid ${T.cardBorder}`,
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeMetrics.map((m, i) => {
                          const health = HEALTH[m.healthStatus]
                          return (
                            <tr key={m.accountId} style={{
                              borderBottom: i < activeMetrics.length - 1 ? `0.5px solid ${T.cardBorder}` : 'none',
                            }}>
                              <td style={{ padding: '14px 12px 14px 0' }}>
                                <div style={{ fontFamily: font.body, fontSize: 13, color: T.text, fontWeight: 500 }}>{m.name}</div>
                                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>{m.firmName || '—'}</div>
                              </td>
                              <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 13, color: pnlColor(m.netPnl), fontWeight: 500 }}>
                                {fmtPct(m.netPnlPct)}
                              </td>
                              <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 12, color: m.winRate >= 50 ? T.green : T.amber }}>
                                {m.winRate.toFixed(0)}%
                              </td>
                              <td style={{ padding: '14px 12px 14px 0', fontFamily: font.mono, fontSize: 12, color: m.profitFactor >= 1 ? T.green : T.red }}>
                                {isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : '∞'}
                              </td>
                              <td style={{ padding: '14px 12px 14px 0' }}>
                                <div style={{ fontFamily: font.mono, fontSize: 12, color: m.ddConsumedPct >= 60 ? T.red : T.sub, fontWeight: 500 }}>
                                  {m.ddConsumedPct.toFixed(0)}% of limit
                                </div>
                                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.muted, marginTop: 2 }}>
                                  {m.maxDDUsedPct.toFixed(1)}% / {m.maxDDLimitPct.toFixed(1)}%
                                </div>
                              </td>
                              <td style={{ padding: '14px 0' }}>
                                <span style={{
                                  fontFamily: font.mono, fontSize: 11, color: health.color,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {health.emoji} {health.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
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