import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, Clock, UserPlus, TrendingUp, Percent, Search } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../supabaseClient'
import { useSidebar } from '../../SidebarContext'

// Canonical plan ids — must match src/pages/Pricing.jsx exactly.
const PAID_PLANS = ['monthly', 'biannual', 'annual']
const TRIAL_DAYS = 7

// Monthly-equivalent price per plan, for the MRR estimate below.
// Mirrors the perMonth values in Pricing.jsx — update both together if prices change.
const PLAN_MONTHLY_VALUE = {
  monthly: 12,
  biannual: 10,
  annual: 8,
}

function initials(name, email) {
  if (name) return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return email ? email.slice(0, 2).toUpperCase() : '?'
}

// Deterministic accent per user, cycling through the app's existing badge palettes.
const AVATAR_PALETTES = [
  { bg: 'var(--green-bg)', fg: 'var(--brand)' },
  { bg: 'var(--blue-bg)', fg: 'var(--blue)' },
  { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
  { bg: 'var(--red-bg)', fg: 'var(--red)' },
]
function avatarPalette(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

function trialDaysLeft(trialStart) {
  if (!trialStart) return null
  const start = new Date(trialStart)
  const now = new Date()
  const diff = TRIAL_DAYS - Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function Avatar({ name, email, size = 30 }) {
  const palette = avatarPalette(email || name || '?')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: palette.bg, color: palette.fg,
      fontSize: size * 0.4, fontWeight: 600, fontFamily: 'Inter, sans-serif',
    }}>{initials(name, email)}</div>
  )
}

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px',
      padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <Icon size={14} strokeWidth={1.8} color={accent || 'var(--text-faint)'} style={{ opacity: 0.85 }} />
      </div>
      <span style={{ fontSize: '24px', fontWeight: '600', lineHeight: 1, color: accent || 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{value}</span>
      {sub && <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>{sub}</span>}
    </div>
  )
}

function PlanBadge({ plan }) {
  const isPaid = PAID_PLANS.includes(plan)
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
      background: isPaid ? 'var(--green-bg)' : 'var(--bg-surface-2)',
      color: isPaid ? 'var(--brand)' : 'var(--text-muted)',
      border: `0.5px solid ${isPaid ? 'var(--green-bg-2)' : 'var(--border-color-2)'}`,
    }}>{plan || '—'}</span>
  )
}

function TrialMeter({ trialStart }) {
  const days = trialDaysLeft(trialStart)
  if (days === null) return <span style={{ color: 'var(--text-faint-2)', fontSize: '12px' }}>—</span>
  if (days === 0) {
    return (
      <span style={{
        fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
        textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px',
        background: 'var(--red-bg-2)', color: 'var(--red)', border: '0.5px solid var(--red-bg)',
      }}>Expired</span>
    )
  }
  const pct = Math.max(0, Math.min(100, (days / TRIAL_DAYS) * 100))
  const barColor = days <= 2 ? 'var(--red)' : days <= 4 ? 'var(--amber)' : 'var(--brand)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <div style={{ width: '46px', height: '4px', borderRadius: '3px', background: 'var(--bg-surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: barColor }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{days}d left</span>
    </div>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [accountCounts, setAccountCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | paid | trial | expiring
  const navigate = useNavigate()
  const { collapsed } = useSidebar()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, plan, created_at, trial_start')
        .order('created_at', { ascending: false })
      if (!error) setUsers(data || [])

      // Account counts per user — used for the "Accounts" column.
      const { data: accountsData } = await supabase.from('accounts').select('user_id')
      const counts = {}
      ;(accountsData || []).forEach(a => { counts[a.user_id] = (counts[a.user_id] || 0) + 1 })
      setAccountCounts(counts)

      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const totalUsers = users.length
  const paidUsers = users.filter(u => PAID_PLANS.includes(u.plan))
  const trialUsers = users.filter(u => !PAID_PLANS.includes(u.plan))
  const newToday = users.filter(u => u.created_at?.slice(0, 10) === today).length

  const estMrr = paidUsers.reduce((sum, u) => sum + (PLAN_MONTHLY_VALUE[u.plan] || 0), 0)
  const conversionRate = totalUsers > 0 ? Math.round((paidUsers.length / totalUsers) * 100) : 0

  const filtered = useMemo(() => {
    let list = users
    if (filter === 'paid') list = list.filter(u => PAID_PLANS.includes(u.plan))
    if (filter === 'trial') list = list.filter(u => !PAID_PLANS.includes(u.plan))
    if (filter === 'expiring') list = list.filter(u => !PAID_PLANS.includes(u.plan) && trialDaysLeft(u.trial_start) !== null && trialDaysLeft(u.trial_start) <= 2)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    }
    return list
  }, [users, filter, search])

  const statCards = [
    { icon: Users, label: 'Total Users', value: totalUsers },
    { icon: CreditCard, label: 'Paid', value: paidUsers.length, accent: 'var(--brand)', sub: totalUsers ? `${conversionRate}% of total` : null },
    { icon: Clock, label: 'Trial', value: trialUsers.length, accent: 'var(--amber)' },
    { icon: UserPlus, label: 'New Today', value: newToday, accent: 'var(--blue)' },
    { icon: TrendingUp, label: 'Est. MRR', value: `$${estMrr}`, accent: 'var(--brand)', sub: `${paidUsers.length} active sub${paidUsers.length !== 1 ? 's' : ''}` },
    { icon: Percent, label: 'Trial → Paid', value: `${conversionRate}%`, sub: 'all-time' },
  ]

  const filterPills = [
    { id: 'all', label: 'All' },
    { id: 'paid', label: 'Paid' },
    { id: 'trial', label: 'Trial' },
    { id: 'expiring', label: 'Expiring soon' },
  ]

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '64px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          <div style={{ padding: '16px 14px 0' }}>
            <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '600', margin: 0 }}>Admin · Users</h1>
          </div>

          {/* Stat cards — 2x3 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 14px 0' }}>
            {statCards.map(s => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Search */}
          <div style={{ margin: '14px 14px 0', position: 'relative' }}>
            <Search size={14} color="var(--text-faint-2)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
                borderRadius: '8px', padding: '9px 12px 9px 34px', color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '6px', margin: '10px 14px 0', overflowX: 'auto' }}>
            {filterPills.map(p => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                style={{
                  border: '0.5px solid', borderColor: filter === p.id ? 'var(--green-bg-2)' : 'var(--border-color)',
                  background: filter === p.id ? 'var(--green-bg)' : 'var(--bg-surface)',
                  color: filter === p.id ? 'var(--brand)' : 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', padding: '6px 12px',
                  borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >{p.label}</button>
            ))}
          </div>

          {/* Users list */}
          <div style={{ margin: '12px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '8px 14px', borderBottom: '0.5px solid var(--border-color)', background: 'var(--bg-page)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joined</span>
            </div>

            {loading ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users match.</div>
            ) : filtered.map((u, i) => (
              <div
                key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '8px', alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < filtered.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                  cursor: 'pointer',
                }}
                onTouchStart={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onTouchEnd={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name={u.name} email={u.email} size={26} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.name || u.email}
                    </div>
                    {u.name && (
                      <div style={{ fontSize: '11px', color: 'var(--text-faint-2)', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {u.email}
                      </div>
                    )}
                  </div>
                </div>
                <PlanBadge plan={u.plan} />
                <span style={{ fontSize: '11px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
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
        <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 4px' }}>Users</h1>
        <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px', margin: '0 0 24px' }}>
          {totalUsers} total · {paidUsers.length} paid · {newToday} new today
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
          {statCards.map(s => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} color="var(--text-faint-2)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
                borderRadius: '8px', padding: '9px 14px 9px 34px', color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {filterPills.map(p => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                style={{
                  border: '0.5px solid', borderColor: filter === p.id ? 'var(--green-bg-2)' : 'var(--border-color)',
                  background: filter === p.id ? 'var(--green-bg)' : 'var(--bg-surface)',
                  color: filter === p.id ? 'var(--brand)' : 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', padding: '6px 12px',
                  borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users match your search or filter.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border-color)' }}>
                  {['User', 'Plan', 'Trial', 'Accounts', 'Signed Up'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    style={{ borderBottom: '0.5px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar name={u.name} email={u.email} />
                        <div>
                          <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontWeight: '500' }}>{u.name || '—'}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', marginTop: '1px' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px' }}><PlanBadge plan={u.plan} /></td>
                    <td style={{ padding: '12px 18px' }}>
                      {PAID_PLANS.includes(u.plan)
                        ? <span style={{ color: 'var(--text-faint-2)', fontSize: '12px' }}>—</span>
                        : <TrialMeter trialStart={u.trial_start} />}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {accountCounts[u.id] || 0}
                    </td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
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