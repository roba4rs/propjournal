import { useNavigate } from 'react-router-dom'

function fmt$(n) {
  if (n == null) return '—'
  const abs = Math.abs(parseFloat(n))
  return `${parseFloat(n) >= 0 ? '+' : '-'}$${abs.toFixed(2)}`
}

function pnlColor(n) {
  if (n == null) return 'var(--text-faint)'
  if (parseFloat(n) > 0) return 'var(--brand)'
  if (parseFloat(n) < 0) return 'var(--red)'
  return 'var(--text-muted)'
}

function dirBadge(dir, small = false) {
  const isLong = dir === 'long'
  return (
    <span style={{
      fontSize: small ? '9px' : '10px',
      fontFamily: 'DM Mono, monospace',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: small ? '1px 5px' : '2px 7px',
      borderRadius: '4px',
      background: isLong ? 'var(--green-bg)' : 'var(--red-bg-2)',
      color: isLong ? 'var(--brand)' : 'var(--red)',
      border: `0.5px solid ${isLong ? 'var(--green-bg-2)' : 'var(--red-bg)'}`,
    }}>{isLong ? 'Buy' : 'Sell'}</span>
  )
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return dateStr.slice(5).replace('-', ' ')
}

export default function RecentTrades({ trades = [], loading = false, mobile = false, onTradeClick }) {
  const navigate = useNavigate()
  const recent = [...trades]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  const rows = (
    loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--bg-surface)' }}>
              <div style={{ height: '12px', width: '80px', background: 'var(--bg-surface-2)', borderRadius: '3px' }} />
              <div style={{ height: '12px', width: '50px', background: 'var(--bg-surface-2)', borderRadius: '3px' }} />
            </div>
          ))
        ) : recent.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-faint-2)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
            No trades yet
          </div>
        ) : (
          recent.map((t, idx) => (
            <div key={t.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: idx < recent.length - 1 ? '0.5px solid var(--bg-surface)' : 'none',
              cursor: onTradeClick ? 'pointer' : 'default',
            }}
              onClick={() => onTradeClick && onTradeClick(t)}
            >
              {/* Left: pair + direction badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '500', color: 'var(--text-soft)' }}>{t.pair}</span>
                {dirBadge(t.direction, true)}
              </div>
              {/* Right: pnl + date · session */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '500', color: pnlColor(t.pnl) }}>
                  {fmt$(t.pnl)}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {fmtDate(t.date)}{t.session ? ` · ${t.session}` : ''}
                </div>
              </div>
            </div>
          ))
        )
  )

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '10px 14px 8px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif' }}>Recent trades</span>
          <span
            onClick={() => navigate('/trades')}
            style={{ fontSize: '11px', color: 'var(--blue)', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            See all →
          </span>
        </div>

        {rows}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  // ── DESKTOP — same row layout as mobile, inside the dashboard card ────────
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
      borderRadius: '12px', padding: '24px', marginBottom: '0',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 16px 0' }}>Recent Trades</h2>
      {rows}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}