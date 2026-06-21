import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, Clock, UserPlus } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../supabaseClient'
import { useSidebar } from '../../SidebarContext'

const PAID_PLANS = ['monthly', 'sixmonth', 'yearly', 'pro']

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <Icon size={15} strokeWidth={1.8} color={accent || 'var(--text-faint)'} />
      </div>
      <span style={{ fontSize: '26px', fontWeight: '500', lineHeight: 1, color: accent || 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{value}</span>
    </div>
  )
}

function PlanBadge({ plan }) {
  const isPaid = PAID_PLANS.includes(plan)
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
      background: isPaid ? 'var(--green-bg)' : 'var(--bg-surface)',
      color: isPaid ? 'var(--brand)' : 'var(--text-muted)',
      border: `0.5px solid ${isPaid ? 'var(--green-bg-2)' : 'var(--border-color-2)'}`,
    }}>{plan || '—'}</span>
  )
}


export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
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
        .select('id, name, email, plan, created_at')
        .order('created_at', { ascending: false })
      if (!error) setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const totalUsers = users.length
  const paidUsers = users.filter(u => PAID_PLANS.includes(u.plan)).length
  const trialUsers = totalUsers - paidUsers
  const newToday = users.filter(u => u.created_at?.slice(0, 10) === today).length

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '64px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          <div style={{ padding: '16px 14px 0' }}>
            <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '600', margin: 0 }}>Admin · Users</h1>
          </div>

          {/* Stat cards — 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 14px 0' }}>
            <StatCard icon={Users}      label="Total Users" value={totalUsers} />
            <StatCard icon={CreditCard} label="Paid"        value={paidUsers}  accent="var(--brand)" />
            <StatCard icon={Clock}      label="Trial"       value={trialUsers} accent="var(--amber)" />
            <StatCard icon={UserPlus}   label="New Today"   value={newToday}   accent="var(--blue)" />
          </div>

          {/* Users list */}
          <div style={{ margin: '14px 14px 0', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '8px 14px', borderBottom: '0.5px solid var(--border-color)', background: 'var(--bg-page)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan</span>
              <span style={{ fontSize: '10px', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joined</span>
            </div>

            {loading ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users yet.</div>
            ) : users.map((u, i) => (
              <div
                key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '8px', alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < users.length - 1 ? '0.5px solid var(--border-color)' : 'none',
                  cursor: 'pointer',
                }}
                onTouchStart={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onTouchEnd={(e) => (e.currentTarget.style.background = 'transparent')}
              >
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
        <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 20px' }}>Admin · Users</h1>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon={Users}      label="Total Users" value={totalUsers} />
          <StatCard icon={CreditCard} label="Paid"        value={paidUsers}  accent="var(--brand)" />
          <StatCard icon={Clock}      label="Trial"       value={trialUsers} accent="var(--amber)" />
          <StatCard icon={UserPlus}   label="New Today"   value={newToday}   accent="var(--blue)" />
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '20px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border-color)' }}>
                  {['Name', 'Email', 'Plan', 'Signed Up'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    style={{ borderBottom: '0.5px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px', fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>{u.name || '—'}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{u.email}</td>
                    <td style={{ padding: '12px 18px' }}><PlanBadge plan={u.plan} /></td>
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