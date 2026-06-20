import { PieChart, Pie, Cell } from 'recharts'
import { useTheme } from '../ThemeContext'

const font = {
  heading: "'Syne', sans-serif",
  mono:    "'DM Mono', monospace",
  body:    "'DM Sans', sans-serif",
}

export default function WinLossDonut({ trades = [], mobile = false }) {
  const { isLight } = useTheme()

  // T.green/red/amber feed Recharts Cell `fill` props directly (not CSS), so they
  // need resolved literal hex per theme rather than var() strings.
  const T = {
    card:       'var(--bg-surface)',
    cardBorder: 'var(--border-color-2)',
    green:      isLight ? '#169c69' : '#1db97b',
    red:        '#c03535',
    amber:      '#c97a00',
    muted:      'var(--text-faint)',
    sub:        'var(--text-soft)',
    text:       'var(--text-secondary)',
  }
  const ringTrack = isLight ? '#d8d8da' : '#1e1e1e'

  const tradesWithPnl = trades.filter(t => t.pnl != null)
  const wins   = tradesWithPnl.filter(t => t.pnl > 0).length
  const losses = tradesWithPnl.filter(t => t.pnl < 0).length
  const be     = tradesWithPnl.filter(t => t.pnl === 0).length
  const total  = tradesWithPnl.length

  const winRate  = total ? ((wins   / total) * 100).toFixed(1) : null
  const lossRate = total ? ((losses / total) * 100).toFixed(1) : null
  const beRate   = total ? ((be     / total) * 100).toFixed(1) : null

  const donutData = [
    { name: 'Win',  value: wins,   color: T.green },
    { name: 'Loss', value: losses, color: T.red },
    ...(be > 0 ? [{ name: 'BE', value: be, color: T.amber }] : []),
  ].filter(d => d.value > 0)

  const isEmpty = total === 0

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '10px 14px 12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Donut */}
        <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
          {isEmpty ? (
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="24" fill="none" stroke={ringTrack} strokeWidth="10" />
            </svg>
          ) : (
            <PieChart width={64} height={64}>
              <Pie data={donutData} dataKey="value"
                cx={29} cy={29} innerRadius={18} outerRadius={28}
                strokeWidth={0} paddingAngle={2}>
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          )}
        </div>

        {/* Legend labels — centered */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {[
            { label: 'Win',        color: T.green },
            { label: 'Loss',       color: T.red },
            ...(be > 0 ? [{ label: 'Break even', color: T.amber }] : []),
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '76px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontFamily: font.body, fontSize: '11px', color: T.sub }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Percentages — right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', justifyContent: 'center' }}>
          {[
            { pct: winRate,  color: T.green },
            { pct: lossRate, color: T.red },
            ...(be > 0 ? [{ pct: beRate, color: T.amber }] : []),
          ].map((item, i) => (
            <span key={i} style={{ fontFamily: font.mono, fontSize: '11px', fontWeight: '500', color: item.color }}>
              {item.pct != null ? `${item.pct}%` : '—'}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: T.card, border: `0.5px solid ${T.cardBorder}`,
      borderRadius: '12px', padding: '24px',
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: font.heading, fontSize: '15px', fontWeight: '600',
        color: 'var(--text-primary)', marginBottom: '16px',
      }}>
        Win / Loss
      </div>

      {isEmpty ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.muted, fontFamily: font.mono, fontSize: '13px', minHeight: '100px',
        }}>
          No trades yet
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
            <PieChart width={130} height={130}>
              <Pie data={donutData} dataKey="value"
                cx={61} cy={61} innerRadius={40} outerRadius={60}
                strokeWidth={0} paddingAngle={2}>
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontFamily: font.heading, fontSize: '17px', fontWeight: 700,
                color: parseFloat(winRate) >= 50 ? T.green : T.amber,
              }}>
                {winRate}%
              </div>
              <div style={{
                fontFamily: font.mono, fontSize: '8px', color: T.muted,
                textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2,
              }}>
                Win Rate
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Wins',   value: wins,   color: T.green },
              { label: 'Losses', value: losses, color: T.red },
              ...(be > 0 ? [{ label: 'BE', value: be, color: T.amber }] : []),
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                <div style={{ fontFamily: font.mono, fontSize: '11px', color: T.muted, width: 40 }}>{item.label}</div>
                <div style={{ fontFamily: font.heading, fontSize: '16px', fontWeight: 600, color: T.text }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}