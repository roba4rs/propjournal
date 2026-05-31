import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { useMemo, useState } from 'react'

function toLocalDateStr(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getLast7Data(trades) {
  const map = {}
  trades.filter(t => t.pnl != null).forEach(t => {
    if (!map[t.date]) map[t.date] = 0
    map[t.date] = parseFloat((map[t.date] + parseFloat(t.pnl)).toFixed(2))
  })
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateStr(d)
    if (dateStr in map) {
      days.push({ label: dateStr.slice(5), date: dateStr, pnl: map[dateStr] })
    }
  }
  return days
}

function getLast30Data(trades) {
  const map = {}
  trades.filter(t => t.pnl != null).forEach(t => {
    if (!map[t.date]) map[t.date] = 0
    map[t.date] = parseFloat((map[t.date] + parseFloat(t.pnl)).toFixed(2))
  })
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = toLocalDateStr(d)
    if (dateStr in map) {
      days.push({ label: String(new Date(d).getDate()), date: dateStr, pnl: map[dateStr] })
    }
  }
  return days
}

const toggleStyle = (active) => ({
  background: active ? '#1a1a1a' : 'transparent',
  border: `0.5px solid ${active ? '#2a2a2a' : '#1e1e1e'}`,
  borderRadius: '6px',
  color: active ? '#fff' : '#777',
  padding: '3px 10px',
  cursor: 'pointer',
  fontFamily: 'DM Mono, monospace',
  fontSize: '10px',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
})

export default function DailyBarChart({ trades = [], mobile = false }) {
  const [view, setView] = useState('30d')
  const data = useMemo(() => view === '7d' ? getLast7Data(trades) : getLast30Data(trades), [trades, view])
  const hasData = data.some(d => d.pnl !== 0)

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '10px 14px 10px' }}>
        {/* Header row: label + toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: '#777', fontFamily: 'DM Sans, sans-serif' }}>Daily PnL</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button style={toggleStyle(view === '7d')} onClick={() => setView('7d')}>7d</button>
            <button style={toggleStyle(view === '30d')} onClick={() => setView('30d')}>30d</button>
          </div>
        </div>

        {!hasData ? (
          <div style={{ height: '52px', display: 'flex', alignItems: 'center', color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>
            No trades in the last {view === '7d' ? '7' : '30'} days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={52} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
            <BarChart data={data} barSize={view === '30d' ? 6 : 16} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <ReferenceLine y={0} stroke="#222" />
              <Bar dataKey="pnl" radius={[0, 0, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl > 0 ? '#1db97b' : entry.pnl < 0 ? '#c03535' : '#222'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: '#111', border: '0.5px solid #1e1e1e',
      borderRadius: '12px', padding: '24px',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: 0 }}>
          Daily P&L — {view === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={toggleStyle(view === '7d')} onClick={() => setView('7d')}>Last 7 days</button>
          <button style={toggleStyle(view === '30d')} onClick={() => setView('30d')}>Last 30 days</button>
        </div>
      </div>
      {!hasData ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
          No trades in the last {view === '7d' ? '7' : '30'} days
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180} style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}>
          <BarChart data={data} barSize={view === '30d' ? 14 : 36}>
            <XAxis dataKey="label" stroke="#555" tick={{ fill: '#777', fontSize: 11, fontFamily: 'DM Mono, monospace' }} />
            <YAxis stroke="#555" tick={{ fill: '#777', fontSize: 11, fontFamily: 'DM Mono, monospace' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              cursor={false}
              contentStyle={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '8px', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#aaa' }}
              formatter={(v, _name, props) => [`$${v}`, props.payload.date]}
              labelFormatter={() => ''}
            />
            <ReferenceLine y={0} stroke="#222" />
            <Bar dataKey="pnl" radius={[0, 0, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl > 0 ? '#1db97b' : entry.pnl < 0 ? '#c03535' : '#222'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
