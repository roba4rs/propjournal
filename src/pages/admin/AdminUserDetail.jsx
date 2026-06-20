import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function AdminUserDetail() {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

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

      const enriched = await Promise.all(
        (accountsData || []).map(async (acc) => {
          const { data: trades } = await supabase
            .from('trades')
            .select('id, created_at, pnl')
            .eq('account_id', acc.id)
          const tradeCount = trades?.length || 0
          const lastTrade = trades?.length
            ? trades.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at
            : null
          return { ...acc, tradeCount, lastTrade }
        })
      )
      setAccounts(enriched)
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>Loading...</div>
  }
  if (!user) {
    return <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>User not found.</div>
  }

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <Link to="/admin/users" style={{ color: '#1bba7c', fontSize: 13, textDecoration: 'none' }}>← Back to users</Link>
      <h1 style={{ margin: '16px 0 4px', fontSize: 22 }}>{user.name || user.email}</h1>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 13 }}>{user.email}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        <Stat label="Plan" value={user.plan} />
        <Stat label="Signed up" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
        <Stat label="Trial start" value={user.trial_start ? new Date(user.trial_start).toLocaleDateString() : '—'} />
        <Stat label="Plan expires" value={user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : '—'} />
      </div>

      <h2 style={{ marginBottom: 12, fontSize: 16 }}>Accounts ({accounts.length})</h2>
      {accounts.length === 0 ? (
        <p style={{ color: '#888', fontSize: 13 }}>No accounts created yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid #1e1e1e', textAlign: 'left' }}>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Name</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Firm</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Type</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Phase</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Status</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Trades</th>
              <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Last trade</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} style={{ borderBottom: '0.5px solid #111' }}>
                <td style={{ padding: 10, fontSize: 14 }}>{acc.name}</td>
                <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>{acc.firm_name || '—'}</td>
                <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>{acc.type}</td>
                <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>{acc.phase || '—'}</td>
                <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>{acc.status || '—'}</td>
                <td style={{ padding: 10, fontSize: 13 }}>{acc.tradeCount}</td>
                <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>
                  {acc.lastTrade ? new Date(acc.lastTrade).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
      <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
      <div style={{ fontSize: 15, marginTop: 4 }}>{value}</div>
    </div>
  )
}