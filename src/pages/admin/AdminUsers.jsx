import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, plan, trial_start, created_at, plan_expires_at')
        .order('created_at', { ascending: false })
      if (!error) setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>Loading users...</div>
  }

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ marginBottom: 16, fontSize: 20 }}>Users ({users.length})</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid #1e1e1e', textAlign: 'left' }}>
            <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Name</th>
            <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Email</th>
            <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Plan</th>
            <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Signed up</th>
            <th style={{ padding: 10, fontSize: 12, color: '#888', fontWeight: 500 }}>Expires</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              onClick={() => navigate(`/admin/users/${u.id}`)}
              style={{ borderBottom: '0.5px solid #111', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#111')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: 10, fontSize: 14 }}>{u.name || '—'}</td>
              <td style={{ padding: 10, fontSize: 14, color: '#ccc' }}>{u.email}</td>
              <td style={{ padding: 10, fontSize: 13 }}>
                <span style={{
                  padding: '2px 8px',
                  background: '#0f2219',
                  border: '0.5px solid #1a3826',
                  borderRadius: 4,
                  color: '#1bba7c',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                }}>{u.plan}</span>
              </td>
              <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
              </td>
              <td style={{ padding: 10, fontSize: 13, color: '#aaa' }}>
                {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}