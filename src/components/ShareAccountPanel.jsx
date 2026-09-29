import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import SharePicker from './SharePicker'

const ff = 'Inter, sans-serif'

// Owner-only panel: list, add and remove read-only recipients for one account.
// Only render this for accounts the current user owns.
export default function ShareAccountPanel({ account, onClose, onChanged }) {
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('list_account_shares', { p_account_id: account.id })
    if (rpcError) setError('Could not load shares.')
    else { setRecipients(data || []); if (onChanged) onChanged(data || []) }
    setLoading(false)
  }, [account.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const add = async user => {
    setError(null); setNotice(null); setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { error: insertError } = await supabase.from('account_shares').insert({
        account_id: account.id,
        owner_id: session.user.id,
        shared_with_user_id: user.id,
      })
      if (insertError) {
        if (insertError.code === '23505') setError('Already shared with this user.')
        else setError('Could not share. Try again.')
      } else {
        setNotice(`Shared with ${user.name || 'user'}.`)
        await load()
      }
    } finally { setBusy(false) }
  }

  const remove = async r => {
    setError(null); setNotice(null); setBusy(true)
    const { error: delError } = await supabase.from('account_shares').delete().eq('id', r.share_id)
    setBusy(false)
    if (delError) setError('Could not remove. Try again.')
    else await load()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '12px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: '700', margin: 0 }}>Share (read-only)</h2>
            <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '12px', margin: '3px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shared with</p>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '13px', margin: '0 0 14px 0' }}>Loading…</p>
        ) : recipients.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontFamily: ff, fontSize: '13px', margin: '0 0 14px 0' }}>Not shared with anyone yet.</p>
        ) : (
          <div style={{ border: '0.5px solid var(--border-color)', borderRadius: '8px', marginBottom: '14px' }}>
            {recipients.map((r, i) => (
              <div key={r.share_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderTop: i === 0 ? 'none' : '0.5px solid var(--border-color)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', color: 'var(--text-primary)', fontFamily: ff, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || 'Unnamed user'}</span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                  <span style={{ display: 'block', color: 'var(--text-faint)', fontFamily: ff, fontSize: '11px', marginTop: '2px' }}>Shared {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => remove(r)}
                  disabled={busy}
                  style={{ background: 'transparent', border: '0.5px solid var(--border-color)', borderRadius: '6px', color: 'var(--red)', fontFamily: ff, fontSize: '12px', padding: '6px 10px', cursor: busy ? 'default' : 'pointer', flexShrink: 0 }}
                >Remove</button>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '12px', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add someone</p>
        <SharePicker onPick={add} excludeIds={recipients.map(r => r.user_id)} disabled={busy} />

        {error && <p style={{ color: 'var(--red)', fontFamily: ff, fontSize: '12px', margin: '12px 0 0 0' }}>{error}</p>}
        {notice && <p style={{ color: 'var(--brand)', fontFamily: ff, fontSize: '12px', margin: '12px 0 0 0' }}>{notice}</p>}

        <p style={{ color: 'var(--text-faint)', fontFamily: ff, fontSize: '11px', margin: '14px 0 0 0' }}>
          People you share with can view this account and its trades, but cannot edit anything. It will not appear in their personal stats.
        </p>
      </div>
    </div>
  )
}