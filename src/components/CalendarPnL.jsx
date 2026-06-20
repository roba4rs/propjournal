import { useState, useMemo, useEffect } from 'react'

const DAYS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}
function pad(n) {
  return String(n).padStart(2, '0')
}

const TODAY = new Date()
const TODAY_YEAR = TODAY.getFullYear()
const TODAY_MONTH = TODAY.getMonth()

export default function CalendarPnL({ trades = [], mobile = false, onDayClick, account }) {
  const today = TODAY

  const defaultMonth = useMemo(() => {
    const dates = trades.filter(t => t.date).map(t => t.date.slice(0, 10)).sort()
    const last = dates[dates.length - 1]
    if (last) {
      const d = new Date(last)
      return { year: d.getFullYear(), month: d.getMonth() }
    }
    return { year: TODAY_YEAR, month: TODAY_MONTH }
  }, [trades])

  const [current, setCurrent] = useState(defaultMonth)
  const [manualNav, setManualNav] = useState(false)

  useEffect(() => {
    if (!manualNav) setCurrent(defaultMonth)
  }, [defaultMonth, manualNav])

  const daysInMonth = getDaysInMonth(current.year, current.month)
  const firstDay = getFirstDayOfMonth(current.year, current.month)
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  )
  while (cells.length % 7 !== 0) cells.push(null)

  const dayData = useMemo(() => {
    const map = {}
    trades.filter(t => t.pnl != null).forEach(t => {
      // normalise: trade dates may come as "2026-05-06T..." or "2026-05-06"
      const dateKey = t.date ? t.date.slice(0, 10) : null
      if (!dateKey) return
      if (!map[dateKey]) map[dateKey] = { pnl: 0, count: 0 }
      map[dateKey].pnl += parseFloat(t.pnl)
      map[dateKey].count += 1
    })
    return map
  }, [trades])

  const prevMonth = () => { setManualNav(true); setCurrent(c => {
    const d = new Date(c.year, c.month - 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })}
  const nextMonth = () => { setManualNav(true); setCurrent(c => {
    const d = new Date(c.year, c.month + 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })}

  // shared cell logic
  function getCellStyle(day) {
    if (!day) return { bg: 'transparent', border: 'none', color: 'transparent' }
    const dateStr = `${current.year}-${pad(current.month + 1)}-${pad(day)}`
    const data = dayData[dateStr]
    const hasTrade = data !== undefined
    const pnl = hasTrade ? data.pnl : undefined
    const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear()
    const isWin  = hasTrade && pnl > 0
    const isLoss = hasTrade && pnl < 0
    const isBE   = hasTrade && pnl === 0

    let bg = 'var(--bg-surface-2)'
    let border = '0.5px solid var(--border-color-2)'
    let color = 'var(--text-muted)'

    if (isWin)  { bg = 'var(--green-bg)'; border = '0.5px solid var(--green-bg-2)'; color = 'var(--brand)' }
    if (isLoss) { bg = 'var(--red-bg-2)'; border = '0.5px solid var(--red-bg)'; color = 'var(--red)' }
    if (isBE)   { bg = 'var(--amber-bg-2)'; border = '0.5px solid var(--amber-bg)'; color = 'var(--amber)' }
    if (isToday && !hasTrade) { border = '0.5px solid color-mix(in srgb, var(--brand), transparent 67%)'; color = 'var(--brand)' }

    return { bg, border, color, isToday, hasTrade, isWin, isLoss, isBE, dateStr, data }
  }

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '10px 14px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1 }}>←</button>
          <span style={{ color: 'var(--text-soft)', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {MONTHS_SHORT[current.month].toUpperCase()} {current.year}
          </span>
          <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1 }}>→</button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '3px' }}>
          {DAYS_SHORT.map((d, i) => (
            <div key={i} style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px', textAlign: 'center' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {cells.map((day, i) => {
            const cell = getCellStyle(day)
            const { bg, border, hasTrade, data } = cell
            const pnl = hasTrade ? data.pnl : null
            const count = hasTrade ? data.count : null
            const pnlColor = hasTrade && pnl > 0 ? 'var(--brand)' : hasTrade && pnl < 0 ? 'var(--red)' : 'var(--amber)'
            const dayColor = cell.isToday ? 'var(--brand)' : hasTrade ? pnlColor : 'var(--text-faint)'
            return (
              <div key={i} style={{
                background: day ? bg : 'transparent',
                border: day ? border : 'none',
                borderRadius: '3px',
                minHeight: '38px',
                position: 'relative',
                padding: '3px',
                cursor: hasTrade && onDayClick ? 'pointer' : 'default',
              }}
                onClick={() => hasTrade && onDayClick && onDayClick(cell.dateStr)}
              >
                {day && (
                  <>
                    {/* Date — top left */}
                    <span style={{
                      position: 'absolute',
                      top: '3px',
                      left: '4px',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '8px',
                      fontWeight: '600',
                      color: dayColor,
                      lineHeight: 1,
                      WebkitFontSmoothing: 'antialiased',
                    }}>{day}</span>

                    {/* P&L — truly centered */}
                    {hasTrade && (
                      <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '9px',
                        fontWeight: '700',
                        color: pnlColor,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility',
                        letterSpacing: '-0.2px',
                      }}>
                        {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
                      </span>
                    )}

                    {/* Trade count — bottom left */}
                    {hasTrade && (
                      <span style={{
                        position: 'absolute',
                        bottom: '3px',
                        left: '4px',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: '7px',
                        color: 'var(--text-faint)',
                        lineHeight: 1,
                        WebkitFontSmoothing: 'antialiased',
                      }}>
                        {count}t
                      </span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {[{ color: 'var(--brand)', label: 'Profit' }, { color: 'var(--red)', label: 'Loss' }, { color: 'var(--amber)', label: 'BE' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '1px', background: l.color }} />
              <span style={{ color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif', fontSize: '9px' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)',
      borderRadius: '12px', padding: '24px', marginBottom: '0',
      flex: 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: 0 }}>Calendar P&L</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={prevMonth} style={{ background: 'transparent', border: '0.5px solid var(--border-color-2)', borderRadius: '6px', color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>←</button>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>{MONTHS[current.month]} {current.year}</span>
          <button onClick={nextMonth} style={{ background: 'transparent', border: '0.5px solid var(--border-color-2)', borderRadius: '6px', color: 'var(--text-muted)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>→</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAYS_FULL.map(d => (
          <div key={d} style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, i) => {
          const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear()
          const dateStr = day ? `${current.year}-${pad(current.month + 1)}-${pad(day)}` : null
          const data = dateStr ? dayData[dateStr] : undefined
          const hasTrade = data !== undefined
          const pnl = hasTrade ? data.pnl : undefined
          const count = hasTrade ? data.count : 0
          const isWin  = hasTrade && pnl > 0
          const isLoss = hasTrade && pnl < 0
          const isBE   = hasTrade && pnl === 0

          let bg = day ? (isToday ? 'var(--green-bg)' : 'var(--bg-page)') : 'transparent'
          let borderColor = day ? (isToday ? 'var(--green-bg-2)' : 'var(--border-color)') : 'none'
          if (isWin)  { bg = 'var(--green-bg)'; borderColor = 'var(--green-bg-2)' }
          if (isLoss) { bg = 'var(--red-bg-2)'; borderColor = 'var(--red-bg)' }
          if (isBE)   { bg = 'var(--amber-bg-2)'; borderColor = 'var(--amber-bg)' }
          const pnlColor = isWin ? 'var(--brand)' : isLoss ? 'var(--red)' : 'var(--amber)'

          return (
            <div key={i} style={{
              background: bg,
              border: day ? `0.5px solid ${borderColor}` : 'none',
              borderRadius: '6px', padding: '8px 6px', minHeight: '56px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              position: 'relative',
              cursor: hasTrade && onDayClick ? 'pointer' : 'default',
              transition: 'opacity 0.1s',
            }}
              onClick={() => hasTrade && onDayClick && onDayClick(dateStr)}
              onMouseEnter={e => { if (hasTrade && onDayClick) e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { if (hasTrade && onDayClick) e.currentTarget.style.opacity = '1' }}
            >
              {day && (
                <>
                  <span style={{ position: 'absolute', top: '6px', left: '7px', color: isToday ? 'var(--brand)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '11px', fontWeight: '600' }}>{day}</span>
                  {hasTrade && (
                    <>
                      <span style={{ color: pnlColor, fontFamily: 'DM Mono, monospace', fontSize: '15px', fontWeight: '400', textAlign: 'center', lineHeight: 1.2 }}>
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)}
                      </span>
                      <span style={{ position: 'absolute', bottom: '6px', left: '7px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: '9px' }}>
                        {count} trade{count !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        {[{ color: 'var(--brand)', label: 'Profit' }, { color: 'var(--red)', label: 'Loss' }, { color: 'var(--amber)', label: 'Breakeven' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
            <span style={{ color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}