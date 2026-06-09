const T = {
  card:       '#111',
  cardBorder: '#1e1e1e',
  green:      '#1db97b',
  red:        '#c03535',
  amber:      '#c97a00',
  muted:      '#777',
  sub:        '#aaa',
  text:       '#e8e8e8',
  bg:         '#0a0a0a',
}

const font = {
  heading: "'Syne', sans-serif",
  mono:    "'DM Mono', monospace",
  body:    "'DM Sans', sans-serif",
}

function computeStreaks(trades) {
  const sorted = [...trades]
    .filter(t => t.pnl != null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (sorted.length === 0) {
    return { currentWin: 0, currentLoss: 0, bestWin: 0, worstLoss: 0, lastTen: [] }
  }

  const lastTen = sorted.slice(-10).map(t =>
    t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : 'be'
  )

  let currentWin = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].pnl > 0) currentWin++
    else break
  }

  let currentLoss = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].pnl < 0) currentLoss++
    else break
  }

  let bestWin = 0, run = 0
  for (const t of sorted) {
    if (t.pnl > 0) { run++; bestWin = Math.max(bestWin, run) }
    else run = 0
  }

  let worstLoss = 0; run = 0
  for (const t of sorted) {
    if (t.pnl < 0) { run++; worstLoss = Math.max(worstLoss, run) }
    else run = 0
  }

  return { currentWin, currentLoss, bestWin, worstLoss, lastTen }
}

function Dot({ type, fill }) {
  const color = type === 'win' ? T.green : type === 'loss' ? T.red : T.amber
  return (
    <div style={{
      width: fill ? undefined : '14px',
      flex: fill ? 1 : undefined,
      aspectRatio: '1 / 1',
      borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#0f0f0f',
      border: `0.5px solid #1a1a1a`, borderRadius: '10px',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{
        fontFamily: font.mono, fontSize: '10px', color: T.muted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: font.heading, fontSize: '22px',
        fontWeight: 700, color: color || T.text, lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

export default function StreakCard({ trades = [], mobile = false }) {
  const isEmpty = trades.filter(t => t.pnl != null).length === 0
  const { currentWin, currentLoss, bestWin, worstLoss, lastTen } = computeStreaks(trades)

  const winDisplay  = currentWin  > 0 ? `${currentWin}W`  : '—'
  const lossDisplay = currentLoss > 0 ? `${currentLoss}L` : '—'
  const winColor    = currentWin  > 0 ? T.green : T.muted
  const lossColor   = currentLoss > 0 ? T.red   : T.muted

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (mobile) {
    return (
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontFamily: font.heading, fontSize: '13px', fontWeight: '600',
          color: '#fff', marginBottom: '12px',
        }}>
          Streaks
        </div>

        {isEmpty ? (
          <div style={{ color: T.muted, fontFamily: font.mono, fontSize: '12px' }}>
            No trades yet
          </div>
        ) : (
          <>
            {/* Row 1: label + dots on the same line, full width */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{
                fontFamily: font.mono, fontSize: '9px', color: T.muted,
                textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Last {lastTen.length}
              </div>
              <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
                {lastTen.map((type, i) => <Dot key={i} type={type} fill />)}
              </div>
            </div>

            {/* Row 2: 4 stats in a single row */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { label: 'Cur. Win',  value: winDisplay,                                  color: winColor },
                { label: 'Cur. Loss', value: lossDisplay,                                 color: lossColor },
                { label: 'Best Win',  value: bestWin   > 0 ? `${bestWin}W`   : '—',       color: bestWin   > 0 ? T.green : T.muted },
                { label: 'Best Loss', value: worstLoss > 0 ? `${worstLoss}L` : '—',       color: worstLoss > 0 ? T.red   : T.muted },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: '#0f0f0f',
                  border: '0.5px solid #1a1a1a', borderRadius: '8px',
                  padding: '8px 6px', textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: font.mono, fontSize: '9px', color: T.muted,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontFamily: font.heading, fontSize: '15px',
                    fontWeight: 700, color: s.color, lineHeight: 1,
                  }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: T.card, border: `0.5px solid ${T.cardBorder}`,
      borderRadius: '12px', padding: '24px',
      flex: 1, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        fontFamily: font.heading, fontSize: '15px', fontWeight: '600',
        color: '#fff', marginBottom: '14px',
      }}>
        Streaks
      </div>

      {isEmpty ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.muted, fontFamily: font.mono, fontSize: '13px', minHeight: '80px',
        }}>
          No trades yet
        </div>
      ) : (
        <>
          {/* Row 1: label + dots inline, filling full width */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              fontFamily: font.mono, fontSize: '10px', color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Last {lastTen.length}
            </div>
            <div style={{ display: 'flex', gap: '5px', flex: 1 }}>
              {lastTen.map((type, i) => <Dot key={i} type={type} fill />)}
            </div>
          </div>

          {/* Row 2 & 3: 2x2 grid of stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <StatBox label="Current Win"  value={winDisplay}  color={winColor} />
              <StatBox label="Current Loss" value={lossDisplay} color={lossColor} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <StatBox label="Best Win Ever"   value={bestWin   > 0 ? `${bestWin}W`   : '—'} color={bestWin   > 0 ? T.green : T.muted} />
              <StatBox label="Worst Loss Ever" value={worstLoss > 0 ? `${worstLoss}L` : '—'} color={worstLoss > 0 ? T.red   : T.muted} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
