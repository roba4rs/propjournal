import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../supabaseClient'
import { useSidebar } from '../../SidebarContext'

const PAID_PLANS = ['monthly', 'biannual', 'annual']
const TRIAL_DAYS = 7

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

function fmtMoney(n) {
  if (n == null || n === '') return '—'
  return `$${Number(n).toLocaleString('en-US')}`
}

function initials(name, email) {
  if (name) return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return email ? email.slice(0, 2).toUpperCase() : '?'
}

function trialDaysLeft(trialStart) {
  if (!trialStart) return null
  const start = new Date(trialStart)
  const now = new Date()
  const diff = TRIAL_DAYS - Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function StatusPill({ plan, trialStart }) {
  if (PAID_PLANS.includes(plan)) {
    return (
      <span style={{
        fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em',
        textTransform: 'uppercase', padding: '3px 9px', borderRadius: '5px',
        background: 'var(--green-bg)', color: 'var(--brand)', border: '0.5px solid var(--green-bg-2)',
        display: 'inline-flex', alignItems: 'center', gap: '5px',
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--brand)' }} />
        {plan}
      </span>
    )
  }
  const days = trialDaysLeft(trialStart)
  if (days === null) {
    return (
      <span style={{
        fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em',
        textTransform: 'uppercase', padding: '3px 9px', borderRadius: '5px',
        background: 'var(--bg-surface-2)', color: 'var(--text-muted)', border: '0.5px solid var(--border-color-2)',
      }}>Trial</span>
    )
  }
  const expired = days === 0
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.07em',
      textTransform: 'uppercase', padding: '3px 9px', borderRadius: '5px',
      background: expired ? 'var(--red-bg-2)' : 'var(--amber-bg-2)',
      color: expired ? 'var(--red)' : 'var(--amber)',
      border: `0.5px solid ${expired ? 'var(--red-bg)' : 'var(--amber-bg)'}`,
      display: 'inline-flex', alignItems: 'center', gap: '5px',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: expired ? 'var(--red)' : 'var(--amber)' }} />
      {expired ? 'Trial expired' : `Trial · ${days}d left`}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    active: { bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    passed: { bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    funded: { bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    failed: { bg: 'var(--red-bg-2)', color: 'var(--red)', border: 'var(--red-bg)' },
  }
  const s = map[status] || { bg: 'var(--bg-surface)', color: 'var(--text-muted)', border: 'var(--border-color-2)' }
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
    win:         { label: 'WIN',  bg: 'var(--green-bg)', color: 'var(--brand)', border: 'var(--green-bg-2)' },
    loss:        { label: 'LOSS', bg: 'var(--red-bg-2)', color: 'var(--red)', border: 'var(--red-bg)' },
    be:          { label: 'BE',   bg: 'var(--bg-surface)', color: 'var(--text-muted)',    border: 'var(--border-color-2)' },
    in_progress: { label: 'OPEN', bg: 'var(--blue-bg-2)', color: 'var(--blue)', border: 'var(--blue-bg)' },
  }
  const s = map[outcome]
  if (!s) return <span style={{ color: 'var(--text-faint-2)', fontSize: '9px' }}>—</span>
  return (
    <span style={{
      fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', padding: '2px 7px',
      borderRadius: '4px', background: s.bg, color: s.color,
      border: `0.5px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>{s.label}</span>
  )
}

function pnlColor(n) {
  if (n == null) return 'var(--text-faint)'
  if (parseFloat(n) > 0) return 'var(--brand)'
  if (parseFloat(n) < 0) return 'var(--red)'
  return 'var(--text-muted)'
}

// Each row in a mobile section: label left, value right
function Row({ label, children, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      borderBottom: last ? 'none' : '0.5px solid var(--border-color)',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, marginRight: '12px' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--text-soft)', fontFamily: 'Inter, sans-serif', textAlign: 'right' }}>
        {children}
      </span>
    </div>
  )
}

function TabBar({ tab, setTab, counts }) {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: `Accounts${counts.accounts != null ? ` (${counts.accounts})` : ''}` },
    { id: 'trades', label: `Trades${counts.trades != null ? ` (${counts.trades})` : ''}` },
    { id: 'billing', label: 'Billing' },
  ]
  return (
    <div style={{ display: 'flex', gap: '4px', borderBottom: '0.5px solid var(--border-color)', marginBottom: '24px', overflowX: 'auto' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            border: 'none', background: 'transparent',
            color: tab === t.id ? 'var(--text-primary)' : 'var(--text-faint)',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 500,
            padding: '10px 4px', marginRight: '22px', cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: `2px solid ${tab === t.id ? 'var(--brand)' : 'transparent'}`,
            position: 'relative', top: '1px',
          }}
        >{t.label}</button>
      ))}
    </div>
  )
}

function AccountsTable({ accounts }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
      {accounts.length === 0 ? (
        <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No accounts created yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border-color)' }}>
              {['Name', 'Firm', 'Size', 'Type', 'Phase', 'Status', 'Created'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '0.5px solid var(--border-color)' }}>
                <td style={{ padding: '12px 18px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{acc.name}</td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{acc.firm_name || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtMoney(acc.account_size)}</td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{acc.type || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{acc.phase ? acc.phase.replace('_', ' ') : '—'}</td>
                <td style={{ padding: '12px 18px' }}><StatusBadge status={acc.status} /></td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(acc.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function TradesTable({ trades }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
      {trades.length === 0 ? (
        <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No trades logged yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border-color)' }}>
              {['Pair', 'Direction', 'Outcome', 'P&L', 'Date'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} style={{ borderBottom: '0.5px solid var(--border-color)' }}>
                <td style={{ padding: '12px 18px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{t.pair || '—'}</td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{t.direction || '—'}</td>
                <td style={{ padding: '12px 18px' }}><OutcomeBadge outcome={t.outcome} /></td>
                <td style={{ padding: '12px 18px', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: pnlColor(t.pnl) }}>
                  {t.pnl != null ? `${parseFloat(t.pnl) >= 0 ? '+' : ''}$${Math.abs(parseFloat(t.pnl)).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{t.date || fmtDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function AdminUserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { collapsed } = useSidebar()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single()
      setUser(userData)
      const { data: accountsData } = await supabase.from('accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setAccounts(accountsData || [])
      // Full trade history for this tab — not capped, since it's now a dedicated view.
      const { data: tradesData } = await supabase.from('trades').select('id, pair, direction, outcome, pnl, date, created_at').eq('user_id', userId).order('created_at', { ascending: false })
      setTrades(tradesData || [])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading || !user) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ marginLeft: isMobile ? 0 : (collapsed ? '60px' : '220px'), padding: isMobile ? '64px 16px 80px' : '32px', flex: 1, color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
          {loading ? 'Loading...' : 'User not found.'}
        </main>
      </div>
    )
  }

  const activeAccounts = accounts.filter(a => a.status === 'active' || a.status === 'funded').length
  const closedTrades = trades.filter(t => t.outcome && t.outcome !== 'in_progress').length

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '64px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          {/* Back + title */}
          <div style={{ padding: '12px 14px 0' }}>
            <button
              onClick={() => navigate('/admin/users')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'none', border: 'none', padding: '0 0 10px',
                color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer',
              }}
            >
              <ArrowLeft size={13} strokeWidth={2} /> Back to users
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--green-bg)', color: 'var(--brand)', fontSize: '15px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
              }}>{initials(user.name, user.email)}</div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: '600', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name || user.email}
                </h1>
                <p style={{ color: 'var(--text-faint-2)', fontFamily: 'Inter, sans-serif', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
              </div>
            </div>
            <StatusPill plan={user.plan} trialStart={user.trial_start} />
          </div>

          <div style={{ margin: '16px 14px 0' }}>
            <TabBar tab={tab} setTab={setTab} counts={{ accounts: accounts.length, trades: trades.length }} />
          </div>

          <div style={{ margin: '0 14px' }}>
            {tab === 'overview' && (
              <>
                <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                  <Row label="Plan"><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{user.plan || '—'}</span></Row>
                  <Row label="Signed Up">{fmtDate(user.created_at)}</Row>
                  <Row label="Trial Start">{fmtDate(user.trial_start)}</Row>
                  <Row label="Plan Expires" last>{fmtDate(user.plan_expires_at)}</Row>
                </div>
                <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                  {activeAccounts} active account{activeAccounts !== 1 ? 's' : ''} · {trades.length} trade{trades.length !== 1 ? 's' : ''} logged · {closedTrades} closed
                </div>
              </>
            )}
            {tab === 'accounts' && <AccountsTable accounts={accounts} />}
            {tab === 'trades' && <TradesTable trades={trades} />}
            {tab === 'billing' && (
              <>
                <div style={{
                  background: 'var(--amber-bg-2)', border: '0.5px solid var(--amber-bg)', borderRadius: '8px',
                  padding: '12px 14px', fontSize: '12px', color: 'var(--amber)', display: 'flex', gap: '8px', marginBottom: '16px',
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>Transaction history isn't tracked yet — Paddle webhooks only update plan and expiry, not individual payments.</span>
                </div>
                <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <Row label="Current Plan"><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{user.plan || '—'}</span></Row>
                  <Row label="Trial Start">{fmtDate(user.trial_start)}</Row>
                  <Row label="Plan Expires" last>{fmtDate(user.plan_expires_at)}</Row>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>

        <button
          onClick={() => navigate('/admin/users')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: '0.5px solid var(--border-color)', borderRadius: '8px',
            padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '13px',
            cursor: 'pointer', marginBottom: '20px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color-2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Back to users
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--green-bg)', color: 'var(--brand)', fontSize: '19px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
          }}>{initials(user.name, user.email)}</div>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '600', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user.name || user.email}
              <StatusPill plan={user.plan} trialStart={user.trial_start} />
            </h1>
            <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        <TabBar tab={tab} setTab={setTab} counts={{ accounts: accounts.length, trades: trades.length }} />

        {tab === 'overview' && (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Plan',         value: user.plan || '—' },
                { label: 'Signed Up',    value: fmtDate(user.created_at) },
                { label: 'Trial Start',  value: fmtDate(user.trial_start) },
                { label: 'Plan Expires', value: fmtDate(user.plan_expires_at) },
              ].map((s) => (
                <div key={s.label} style={{ flex: '1 1 160px', minWidth: '160px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', marginBottom: '5px' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '16px 18px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
              {activeAccounts} active account{activeAccounts !== 1 ? 's' : ''} · {trades.length} trade{trades.length !== 1 ? 's' : ''} logged · {closedTrades} closed
            </div>
          </>
        )}

        {tab === 'accounts' && <AccountsTable accounts={accounts} />}
        {tab === 'trades' && <TradesTable trades={trades} />}

        {tab === 'billing' && (
          <>
            <div style={{
              background: 'var(--amber-bg-2)', border: '0.5px solid var(--amber-bg)', borderRadius: '8px',
              padding: '12px 16px', fontSize: '12.5px', color: 'var(--amber)', display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-start',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Transaction history isn't tracked yet — Paddle webhooks currently only update plan and expiry, not individual payments. Add a transactions table to show real payment history here.</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { label: 'Current Plan', value: user.plan || '—' },
                { label: 'Trial Start',  value: fmtDate(user.trial_start) },
                { label: 'Plan Expires', value: fmtDate(user.plan_expires_at) },
              ].map((s) => (
                <div key={s.label} style={{ flex: '1 1 160px', minWidth: '160px', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', marginBottom: '5px' }}>{s.label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}