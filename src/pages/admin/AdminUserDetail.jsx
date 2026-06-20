import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../supabaseClient'
import { useSidebar } from '../../SidebarContext'

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

function StatusBadge({ status }) {
  const map = {
    active: { bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
    passed: { bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
    funded: { bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
    failed: { bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
  }
  const s = map[status] || { bg: '#141414', color: '#999', border: '#2a2a2a' }
  return (
    <span style={{
      fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px',
      borderRadius: '4px', background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{status || '—'}</span>
  )
}

function OutcomeBadge({ outcome }) {
  const map = {
    win:         { label: 'WIN',  bg: '#0f2219', color: '#1bba7c', border: '#1a3826' },
    loss:        { label: 'LOSS', bg: '#1e0d0d', color: '#c03535', border: '#2e1515' },
    be:          { label: 'BE',   bg: '#141414', color: '#aaa',    border: '#2a2a2a' },
    in_progress: { label: 'OPEN', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' },
  }
  const s = map[outcome]
  if (!s) return <span style={{ color: '#555', fontSize: '9px' }}>—</span>
  return (
    <span style={{
      fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px',
      borderRadius: '4px', background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{s.label}</span>
  )
}

function pnlColor(n) {
  if (n == null) return '#777'
  if (parseFloat(n) > 0) return '#1bba7c'
  if (parseFloat(n) < 0) return '#c03535'
  return '#999'
}

export default function AdminUserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { collapsed } = useSidebar()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [recentTrades, setRecentTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      setUser(userData)

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setAccounts(accountsData || [])

      const { data: tradesData } = await supabase
        .from('trades')
        .select('id, pair, direction, outcome, pnl, date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentTrades(tradesData || [])

      setLoading(false)
    }
    load()
  }, [userId])

  const loadingScreen = (msg) => (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Sidebar />
      <main style={isMobile
        ? { paddingTop: '52px', flex: 1, padding: '52px 14px 60px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }
        : { marginLeft: collapsed ? '60px' : '220px', flex: 1, padding: '32px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }
      }>{msg}</main>
    </div>
  )

  if (loading) return loadingScreen('Loading...')
  if (!user) return loadingScreen('User not found.')

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '52px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          {/* Back + header */}
          <div style={{ padding: '12px 14px 0' }}>
            <button
              onClick={() => navigate('/admin/users')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none',
                padding: '0 0 10px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} strokeWidth={2} /> Back
            </button>
            <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: '600', margin: '0 0 2px' }}>
              {user.name || user.email}
            </h1>
            <p style={{ color: '#555', fontFamily: 'Inter, sans-serif', fontSize: '12px', margin: 0 }}>{user.email}</p>
          </div>

          {/* Stat cards — 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '12px 14px 0' }}>
            {[
              { label: 'Plan',         value: user.plan || '—' },
              { label: 'Signed Up',    value: fmtDate(user.created_at) },
              { label: 'Trial Start',  value: fmtDate(user.trial_start) },
              { label: 'Plan Expires', value: fmtDate(user.plan_expires_at) },
            ].map((s) => (
              <div key={s.label} style={{
                background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '12px 14px',
              }}>
                <div style={{ fontSize: '10px', color: '#777', fontFamily: 'Inter, sans-serif', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Accounts */}
          <div style={{ margin: '16px 14px 0' }}>
            <h2 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>
              Accounts ({accounts.length})
            </h2>
            <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
              {accounts.length === 0 ? (
                <div style={{ padding: '14px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No accounts created yet.</div>
              ) : accounts.map((acc, i) => (
                <div key={acc.id} style={{
                  padding: '12px 14px',
                  borderBottom: i < accounts.length - 1 ? '0.5px solid #1a1a1a' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{acc.name}</span>
                    <StatusBadge status={acc.status} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
                    {acc.firm_name || '—'} · {acc.type}{acc.phase ? ` · ${acc.phase}` : ''} · {fmtDate(acc.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div style={{ margin: '16px 14px 0' }}>
            <h2 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', margin: '0 0 8px' }}>
              Recent Trades
            </h2>
            <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
              {recentTrades.length === 0 ? (
                <div style={{ padding: '14px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No trades logged yet.</div>
              ) : recentTrades.map((t, i) => {
                const pnlVal = t.pnl != null ? parseFloat(t.pnl) : null
                return (
                  <div key={t.id} style={{
                    padding: '12px 14px',
                    borderBottom: i < recentTrades.length - 1 ? '0.5px solid #1a1a1a' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{t.pair || '—'}</span>
                        <OutcomeBadge outcome={t.outcome} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
                        {t.direction || '—'} · {t.date || fmtDate(t.created_at)}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: pnlColor(t.pnl), flexShrink: 0 }}>
                      {pnlVal != null ? `${pnlVal >= 0 ? '+' : ''}$${Math.abs(pnlVal).toFixed(2)}` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </main>
      </div>
    )
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '8px',
            padding: '7px 12px', color: '#999', fontFamily: 'Inter, sans-serif', fontSize: '13px',
            cursor: 'pointer', marginBottom: '20px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2a2a2a' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; e.currentTarget.style.borderColor = '#1e1e1e' }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Back to users
        </button>

        <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 4px' }}>
          {user.name || user.email}
        </h1>
        <p style={{ color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px', margin: '0 0 24px' }}>{user.email}</p>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {[
            { label: 'Plan',         value: user.plan || '—' },
            { label: 'Signed Up',    value: fmtDate(user.created_at) },
            { label: 'Trial Start',  value: fmtDate(user.trial_start) },
            { label: 'Plan Expires', value: fmtDate(user.plan_expires_at) },
          ].map((s) => (
            <div key={s.label} style={{
              flex: '1 1 140px', minWidth: '140px',
              background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '14px 16px',
            }}>
              <div style={{ fontSize: '11px', color: '#777', fontFamily: 'Inter, sans-serif', marginBottom: '5px' }}>{s.label}</div>
              <div style={{ fontSize: '15px', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Accounts */}
        <h2 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 12px' }}>
          Accounts ({accounts.length})
        </h2>
        <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden', marginBottom: '28px' }}>
          {accounts.length === 0 ? (
            <div style={{ padding: '18px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No accounts created yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  {['Name', 'Firm', 'Type', 'Phase', 'Status', 'Created'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 18px', fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>{acc.name}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{acc.firm_name || '—'}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{acc.type}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{acc.phase || '—'}</td>
                    <td style={{ padding: '12px 18px' }}><StatusBadge status={acc.status} /></td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(acc.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent trades */}
        <h2 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 12px' }}>
          Recent Trades
        </h2>
        <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
          {recentTrades.length === 0 ? (
            <div style={{ padding: '18px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No trades logged yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  {['Pair', 'Direction', 'Outcome', 'P&L', 'Date'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 18px', fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>{t.pair || '—'}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{t.direction || '—'}</td>
                    <td style={{ padding: '12px 18px' }}><OutcomeBadge outcome={t.outcome} /></td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: pnlColor(t.pnl) }}>
                      {t.pnl != null ? `${parseFloat(t.pnl) >= 0 ? '+' : ''}$${Math.abs(parseFloat(t.pnl)).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'JetBrains Mono, monospace' }}>{t.date || fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}