import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

const ff = 'Inter, sans-serif'

// Search users by exact email or by name and let the caller pick one.
// Calls onPick({ id, name, email }). Never trusts typed ids: only ids returned by the RPC.
export default function SharePicker({ onPick, excludeIds = [], disabled = false }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)
  const reqId = useRef(0)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 3) {
      reqId.current++
      setResults([]); setSearched(false); setSearching(false); setError(null)
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const mine = ++reqId.current
      const { data, error: rpcError } = await supabase.rpc('search_users_for_share', { q: term })
      if (mine !== reqId.current) return // stale response
      setSearching(false)
      if (rpcError) { setError('Search failed. Try again.'); setResults([]); setSearched(false); return }
      setError(null)
      setResults(data || [])
      setSearched(true)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const visible = results.filter(u => !excludeIds.includes(u.id))
  const pick = u => { onPick(u); setQ(''); setResults([]); setSearched(false) }

  return (
    <div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        disabled={disabled}
        placeholder="Search by email or name"
        autoComplete="off"
        style={{
          width: '100%', boxSizing: 'border-box', background: 'var(--bg-page)',
          border: '0.5px solid var(--border-color)', borderRadius: '8px',
          padding: '10px 12px', color: 'var(--text-primary)', fontFamily: ff, fontSize: '14px', outline: 'none',
        }}
      />
      <p style={{ color: 'var(--text-faint)', fontFamily: ff, fontSize: '11px', margin: '6px 0 0 0' }}>
        Type at least 3 characters. Use their full email for an exact match.
      </p>

      {searching && <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '12px', margin: '10px 0 0 0' }}>Searching…</p>}
      {error && <p style={{ color: 'var(--red)', fontFamily: ff, fontSize: '12px', margin: '10px 0 0 0' }}>{error}</p>}

      {!searching && searched && visible.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '12px', margin: '10px 0 0 0' }}>No user found.</p>
      )}

      {!searching && visible.length > 0 && (
        <div style={{ marginTop: '8px', border: '0.5px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          {visible.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pick(u)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-surface)',
                border: 'none', borderTop: i === 0 ? 'none' : '0.5px solid var(--border-color)',
                padding: '10px 12px', cursor: 'pointer',
              }}
            >
              <span style={{ display: 'block', color: 'var(--text-primary)', fontFamily: ff, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Unnamed user'}</span>
              <span style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}