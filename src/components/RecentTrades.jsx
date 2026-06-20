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

        {loading ? (
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
        )}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)',
      borderRadius: '12px', padding: '24px', marginBottom: '0',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 16px 0' }}>Recent Trades</h2>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '0 12px 10px', borderBottom: '0.5px solid var(--border-color)' }}>
        {['Pair', 'Outcome', 'Date'].map((h, i) => (
          <span key={h} style={{
            color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            textAlign: i === 1 ? 'center' : i === 2 ? 'right' : 'left',
          }}>{h}</span>
        ))}
      </div>

      {/* Rows — space-evenly so they fill the card height */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '0 12px', alignItems: 'center' }}>
              <div style={{ height: '14px', width: '70px', background: 'var(--bg-surface-2)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '14px', width: '50px', background: 'var(--bg-surface-2)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '14px', width: '55px', background: 'var(--bg-surface-2)', borderRadius: '4px', marginLeft: 'auto', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))
        ) : recent.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-faint-2)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
            No trades yet — log your first trade to get started
          </div>
        ) : (
          recent.map(t => {
            const pnlVal = parseFloat(t.pnl)
            const isWin  = t.outcome === 'win'  || pnlVal > 0
            const isLoss = t.outcome === 'loss' || pnlVal < 0
            const outcomeLabel  = isWin ? 'Win'  : isLoss ? 'Loss' : 'BE'
            const outcomeBg     = isWin ? 'var(--green-bg)' : isLoss ? 'var(--red-bg-2)' : 'var(--amber-bg-2)'
            const outcomeColor  = isWin ? 'var(--brand)' : isLoss ? 'var(--red)' : 'var(--amber)'
            const outcomeBorder = isWin ? 'var(--green-bg-2)' : isLoss ? 'var(--red-bg)' : 'var(--amber-bg)'
            return (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                padding: '10px 12px', alignItems: 'center',
                borderRadius: '6px',
                cursor: onTradeClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
                onClick={() => onTradeClick && onTradeClick(t)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>{t.pair}</span>
                <span style={{
                  fontSize: '10px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
                  background: outcomeBg, color: outcomeColor, border: `0.5px solid ${outcomeBorder}`,
                }}>{outcomeLabel}</span>
                <span style={{ color: 'var(--text-faint)', fontFamily: 'DM Mono, monospace', fontSize: '12px', textAlign: 'right' }}>{fmtDate(t.date)}</span>
              </div>
            )
          })
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}