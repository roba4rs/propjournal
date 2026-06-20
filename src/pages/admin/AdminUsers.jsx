import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CreditCard, Clock, UserPlus } from 'lucide-react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../supabaseClient'
import { useSidebar } from '../../SidebarContext'

const PAID_PLANS = ['monthly', 'sixmonth', 'yearly', 'pro'] // adjust if your plan values differ

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#999', fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <Icon size={15} strokeWidth={1.8} color={accent || '#777'} />
      </div>
      <span style={{
        fontSize: '26px', fontWeight: '500', lineHeight: 1,
        color: accent || '#fff', fontFamily: 'Inter, sans-serif',
      }}>{value}</span>
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

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { collapsed } = useSidebar()

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

  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>
        <h1 style={{ color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: '600', margin: '0 0 20px' }}>Admin · Users</h1>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={CreditCard} label="Paid" value={paidUsers} accent="#1bba7c" />
          <StatCard icon={Clock} label="Trial" value={trialUsers} accent="#c97a00" />
          <StatCard icon={UserPlus} label="New Today" value={newToday} accent="#4d9fff" />
        </div>

        {/* Users table */}
        <div style={{ background: '#111', border: '0.5px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '20px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '20px', color: '#777', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>No users yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>Plan</th>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '11px', color: '#777', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>Signed Up</th>
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
                    <td style={{ padding: '12px 18px', fontSize: '14px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>{u.name || u.email}</td>
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