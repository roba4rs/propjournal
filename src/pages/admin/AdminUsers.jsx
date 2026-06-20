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
      background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <Icon size={15} strokeWidth={1.8} color={accent || '#777'} />
      </div>
      <span style={{ fontSize: '26px', fontWeight: '500', lineHeight: 1, color: accent || '#fff', fontFamily: 'Inter, sans-serif' }}>{value}</span>
    </div>
  )
}

function PlanBadge({ plan }) {
  const isPaid = PAID_PLANS.includes(plan)
  return (
    <span style={{
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
      background: isPaid ? '#0f2219' : '#141414',
      color: isPaid ? '#1bba7c' : '#999',
      border: `0.5px solid ${isPaid ? '#1a3826' : '#2a2a2a'}`,
    }}>{plan || '—'}</span>
  )
}

// Mobile field row: label on left, value on right
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '0.5px solid #1a1a1a' }}>
      <span style={{ fontSize: '11px', color: '#555', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#ccc', fontFamily: 'Inter, sans-serif', textAlign: 'right' }}>{children}</span>
    </div>
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
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '64px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          <div style={{ padding: '16px 14px 0' }}>
            <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '600', margin: 0 }}>Admin · Users</h1>
          </div>

          {/* Stat cards — 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '14px 14px 0' }}>
            <StatCard icon={Users}      label="Total Users" value={totalUsers} />
            <StatCard icon={CreditCard} label="Paid"        value={paidUsers}  accent="#1bba7c" />
            <StatCard icon={Clock}      label="Trial"       value={trialUsers} accent="#c97a00" />
            <StatCard icon={UserPlus}   label="New Today"   value={newToday}   accent="#4d9fff" />
          </div>

          {/* Users list */}
          <div style={{ margin: '14px 14px 0', background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '8px 14px', borderBottom: '0.5px solid #1e1e1e', background: '#0d0d0d' }}>
              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</span>
              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan</span>
              <span style={{ fontSize: '10px', color: '#555', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joined</span>
            </div>

            {loading ? (
              <div style={{ padding: '18px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
            ) : users.length === 0 ? (
              <div style={{ padding: '18px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users yet.</div>
            ) : users.map((u, i) => (
              <div
                key={u.id}
                onClick={() => navigate(`/admin/users/${u.id}`)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '8px', alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < users.length - 1 ? '0.5px solid #1a1a1a' : 'none',
                  cursor: 'pointer',
                }}
                onTouchStart={(e) => (e.currentTarget.style.background = '#161616')}
                onTouchEnd={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name || u.email}
                  </div>
                  {u.name && (
                    <div style={{ fontSize: '11px', color: '#555', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {u.email}
                    </div>
                  )}
                </div>
                <PlanBadge plan={u.plan} />
                <span style={{ fontSize: '11px', color: '#555', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
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
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>
        <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 20px' }}>Admin · Users</h1>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon={Users}      label="Total Users" value={totalUsers} />
          <StatCard icon={CreditCard} label="Paid"        value={paidUsers}  accent="#1bba7c" />
          <StatCard icon={Clock}      label="Trial"       value={trialUsers} accent="#c97a00" />
          <StatCard icon={UserPlus}   label="New Today"   value={newToday}   accent="#4d9fff" />
        </div>

        <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '20px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '20px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  {['Name', 'Email', 'Plan', 'Signed Up'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    style={{ borderBottom: '0.5px solid #1a1a1a', cursor: 'pointer', transition: 'background 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#161616')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px', fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>{u.name || '—'}</td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{u.email}</td>
                    <td style={{ padding: '12px 18px' }}><PlanBadge plan={u.plan} /></td>
                    <td style={{ padding: '12px 18px', fontSize: '13px', color: '#999', fontFamily: 'JetBrains Mono, monospace' }}>
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