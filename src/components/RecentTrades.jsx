import { useNavigate } from 'react-router-dom'

function fmt$(n) {
  if (n == null) return '—'
  const abs = Math.abs(parseFloat(n))
  return `${parseFloat(n) >= 0 ? '+' : '-'}$${abs.toFixed(2)}`
}

function pnlColor(n) {
  if (n == null) return '#777'
  if (parseFloat(n) > 0) return '#1db97b'
  if (parseFloat(n) < 0) return '#c03535'
  return '#666'
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
      background: isLong ? '#0f2219' : '#1e0d0d',
      color: isLong ? '#1db97b' : '#c03535',
      border: `0.5px solid ${isLong ? '#1a3826' : '#2e1515'}`,
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
          <span style={{ fontSize: '11px', color: '#777', fontFamily: 'DM Sans, sans-serif' }}>Recent trades</span>
          <span
            onClick={() => navigate('/trades')}
            style={{ fontSize: '11px', color: '#4d9fff', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            See all →
          </span>
        </div>

        {loading ? (
          [1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #111' }}>
              <div style={{ height: '12px', width: '80px', background: '#1a1a1a', borderRadius: '3px' }} />
              <div style={{ height: '12px', width: '50px', background: '#1a1a1a', borderRadius: '3px' }} />
            </div>
          ))
        ) : recent.length === 0 ? (
          <div style={{ padding: '16px 0', color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>
            No trades yet
          </div>
        ) : (
          recent.map((t, idx) => (
            <div key={t.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: idx < recent.length - 1 ? '0.5px solid #111' : 'none',
              cursor: onTradeClick ? 'pointer' : 'default',
            }}
              onClick={() => onTradeClick && onTradeClick(t)}
            >
              {/* Left: pair + direction badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '500', color: '#ccc' }}>{t.pair}</span>
                {dirBadge(t.direction, true)}
              </div>
              {/* Right: pnl + date · session */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '500', color: pnlColor(t.pnl) }}>
                  {fmt$(t.pnl)}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: '#666', marginTop: '1px' }}>
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
      background: '#111', border: '0.5px solid #1e1e1e',
      borderRadius: '12px', padding: '24px', marginBottom: '0',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 16px 0' }}>Recent Trades</h2>

      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '0 12px 10px', borderBottom: '0.5px solid #1a1a1a' }}>
        {['Pair', 'Outcome', 'Date'].map((h, i) => (
          <span key={h} style={{
            color: '#666', fontFamily: 'DM Mono, monospace', fontSize: '11px',
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
              <div style={{ height: '14px', width: '70px', background: '#1a1a1a', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '14px', width: '50px', background: '#1a1a1a', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ height: '14px', width: '55px', background: '#1a1a1a', borderRadius: '4px', marginLeft: 'auto', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))
        ) : recent.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
            No trades yet — log your first trade to get started
          </div>
        ) : (
          recent.map(t => {
            const pnlVal = parseFloat(t.pnl)
            const isWin  = t.outcome === 'win'  || pnlVal > 0
            const isLoss = t.outcome === 'loss' || pnlVal < 0
            const outcomeLabel  = isWin ? 'Win'  : isLoss ? 'Loss' : 'BE'
            const outcomeBg     = isWin ? '#0f2219' : isLoss ? '#1e0d0d' : '#1a1400'
            const outcomeColor  = isWin ? '#1db97b' : isLoss ? '#c03535' : '#c97a00'
            const outcomeBorder = isWin ? '#1a3826' : isLoss ? '#2e1515' : '#2a2000'
            return (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                padding: '10px 12px', alignItems: 'center',
                borderRadius: '6px',
                cursor: onTradeClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
                onClick={() => onTradeClick && onTradeClick(t)}
                onMouseEnter={e => e.currentTarget.style.background = '#0f0f0f'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ color: '#e0e0e0', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>{t.pair}</span>
                <span style={{
                  fontSize: '10px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px',
                  background: outcomeBg, color: outcomeColor, border: `0.5px solid ${outcomeBorder}`,
                }}>{outcomeLabel}</span>
                <span style={{ color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '12px', textAlign: 'right' }}>{fmtDate(t.date)}</span>
              </div>
            )
          })
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
