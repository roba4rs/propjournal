// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeStats(trades) {
  const withPnl = trades.filter(t => t.pnl != null)
  const wins = withPnl.filter(t => parseFloat(t.pnl) > 0)
  const losses = withPnl.filter(t => parseFloat(t.pnl) < 0)

  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const winRate = withPnl.length > 0 ? (wins.length / withPnl.length) * 100 : 0

  const withRR = trades.filter(t => t.rr != null)
  const avgRR = withRR.length > 0
    ? withRR.reduce((s, t) => s + parseFloat(t.rr), 0) / withRR.length
    : 0

  const grossWin = wins.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0

  const bestTrade = wins.length > 0 ? Math.max(...wins.map(t => parseFloat(t.pnl))) : null
  const worstTrade = losses.length > 0 ? Math.min(...losses.map(t => parseFloat(t.pnl))) : null

  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0

  return { netPnl, winRate, total: trades.length, avgRR, profitFactor, bestTrade, worstTrade, avgWin, avgLoss, wins: wins.length, losses: losses.length }
}

function fmt$(n) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  return `${n >= 0 ? '+' : '-'}$${abs.toFixed(2)}`
}

function pnlColor(n) {
  if (n == null) return '#fff'
  if (n > 0) return '#1db97b'
  if (n < 0) return '#c03535'
  return '#fff'
}

function StatCell({ label, value, color }) {
  return (
    <div style={{
      background: '#0f0f0f',
      border: '0.5px solid #1a1a1a',
      borderRadius: '10px',
      padding: '16px',
    }}>
      <p style={{
        color: '#999',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '0 0 6px 0',
      }}>{label}</p>
      <p style={{
        color: color || '#fff',
        fontFamily: 'DM Mono, monospace',
        fontSize: '18px',
        margin: 0,
      }}>{value}</p>
    </div>
  )
}

function ProgressBar({ label, pct, color, rightLabel }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#999', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>{label}</span>
        <span style={{ color: '#999', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>{clamped.toFixed(1)}%</span>
      </div>
      <div style={{ height: '3px', background: '#181818', borderRadius: '2px' }}>
        <div style={{ height: '3px', width: `${clamped}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      {rightLabel && (
        <div style={{ marginTop: '3px', textAlign: 'right' }}>
          <span style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{rightLabel}</span>
        </div>
      )}
    </div>
  )
}

// ─── Drawdown calculation ─────────────────────────────────────────────────────
//
// drawdown_type meanings:
//   'static'           — floor = accountSize - maxDD (fixed forever)
//                        If currentBalance > accountSize → DD used = 0
//   'trailing_balance' — floor trails highest *closed* balance
//                        peak rises as balance grows, never falls
//   'trailing_equity'  — same as trailing_balance (we treat identically
//                        since we don't have intra-candle equity data)
//
// Returns: { ddUsed, ddFloor, ddRoom }
//   ddUsed  — dollar amount of drawdown consumed (always >= 0)
//   ddFloor — the current hard floor in dollars
//   ddRoom  — dollars remaining before account blows (currentBalance - floor)
//
function calcDrawdown(trades, accountSize, maxDD, drawdownType) {
  const withPnl = trades.filter(t => t.pnl != null)

  if (drawdownType === 'trailing_balance' || drawdownType === 'trailing_equity') {
    // Replay trades to find peak running balance
    let balance = accountSize
    let peakBalance = accountSize
    for (const t of withPnl) {
      balance += parseFloat(t.pnl)
      if (balance > peakBalance) peakBalance = balance
    }
    const floor = peakBalance - maxDD
    const ddUsed = Math.max(0, peakBalance - balance)
    const ddRoom = Math.max(0, balance - floor)
    return { ddUsed, ddFloor: floor, ddRoom, peakBalance }
  }

  // static (default)
  // floor = accountSize - maxDD, fixed forever
  const floor = accountSize - maxDD
  const currentBalance = accountSize + withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  // If in profit above starting balance, DD used = 0
  const ddUsed = Math.max(0, accountSize - currentBalance)
  const ddRoom = Math.max(0, currentBalance - floor)
  return { ddUsed, ddFloor: floor, ddRoom, peakBalance: null }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChallengeCard({ account, trades = [], loading = false, mobile = false }) {
  const accountType = account?.type || 'personal'

  const Skeleton = ({ w = '60px', h = '22px' }) => (
    <div style={{ width: w, height: h, background: '#1a1a1a', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
  )

  // ── Personal ──
  if (accountType === 'personal') {
    const s = computeStats(trades)

    return (
      <div style={{
        background: '#111', border: '0.5px solid #1e1e1e',
        borderRadius: '12px', padding: '24px',
        flex: 1, display: 'flex', flexDirection: 'column',
      }}>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0' }}>{account?.name || 'Personal Account'}</h2>
            {mobile ? (
              <p style={{ color: '#999', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: 0 }}>{s.total} trades · {new Set(trades.map(t => t.date)).size} days</p>
            ) : (
              <p style={{ color: '#999', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', margin: 0 }}>Your personal trading account — no prop firm rules apply</p>
            )}
          </div>
          {!mobile && <span style={{ background: '#0f2219', border: '0.5px solid #1a3826', borderRadius: '6px', padding: '4px 10px', color: '#1db97b', fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>Personal</span>}
        </div>

        {/* Row 1 */}
        {!mobile && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {loading ? (
            [1,2,3,4].map(i => <div key={i} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '16px' }}><Skeleton w="40px" h="10px" /><div style={{marginTop:'10px'}}><Skeleton w="80px" h="22px" /></div></div>)
          ) : (<>
            <StatCell label="Net P&L" value={s.total === 0 ? '$0.00' : fmt$(s.netPnl)} color={s.total === 0 ? '#fff' : pnlColor(s.netPnl)} />
            <StatCell label="Win Rate" value={s.total === 0 ? '0%' : `${s.winRate.toFixed(1)}%`} />
            <StatCell label="Total Trades" value={String(s.total)} />
            <StatCell label="Avg RR" value={s.total === 0 ? '0.00' : `${s.avgRR.toFixed(2)}R`} />
          </>)}
        </div>}

        {/* Row 2 */}
        {!mobile && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          {loading ? (
            [1,2,3,4].map(i => <div key={i} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '16px' }}><Skeleton w="40px" h="10px" /><div style={{marginTop:'10px'}}><Skeleton w="80px" h="22px" /></div></div>)
          ) : (<>
            <StatCell label="Profit Factor" value={s.total === 0 ? '0.00' : isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '∞'} />
            <StatCell label="Best Trade" value={s.bestTrade != null ? `+$${s.bestTrade.toFixed(2)}` : '—'} color={s.bestTrade != null ? '#1db97b' : '#777'} />
            <StatCell label="Worst Trade" value={s.worstTrade != null ? `-$${Math.abs(s.worstTrade).toFixed(2)}` : '—'} color={s.worstTrade != null ? '#c03535' : '#777'} />
            <StatCell label="Avg Win / Loss" value={s.total === 0 ? '— / —' : `$${s.avgWin.toFixed(0)} / $${s.avgLoss.toFixed(0)}`} />
          </>)}
        </div>}

        {/* Progress Bars */}
        {(() => {
          const withPnl = trades.filter(t => t.pnl != null)
          const profitableDays = Object.entries(
            withPnl.reduce((acc, t) => { acc[t.date] = (acc[t.date] || 0) + parseFloat(t.pnl); return acc }, {})
          ).filter(([, v]) => v > 0).length
          const totalDays = new Set(withPnl.map(t => t.date)).size
          const consistency = totalDays > 0 ? (profitableDays / totalDays) * 100 : 0
          const accountSize = parseFloat(account?.account_size) || 0
          const growth = accountSize > 0 ? Math.min(Math.max((s.netPnl / accountSize) * 100, 0), 100) : 0
          const growthRaw = accountSize > 0 ? (s.netPnl / accountSize) * 100 : 0
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ProgressBar
                label={`Consistency — ${profitableDays} of ${totalDays} days profitable`}
                pct={consistency}
                color="#1db97b"
                rightLabel={`${consistency.toFixed(1)}% profitable days`}
              />
              <ProgressBar
                label={`Account Growth`}
                pct={growth}
                color="#4d9fff"
                rightLabel={accountSize > 0 ? `${growthRaw >= 0 ? '+' : ''}${growthRaw.toFixed(2)}% on $${accountSize.toLocaleString()}` : 'Set account size to track'}
              />
            </div>
          )
        })()}
      </div>
    )
  }

  // ── Challenge ──
  if (!account) return null

  const s = computeStats(trades)
  const netPnl = s.netPnl
  const accountSize = parseFloat(account.account_size) || 0
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0
  const minDays = account.min_trading_days || 0
  const drawdownType = account.drawdown_type || 'static'

  // ── Profit progress ──
  const profitPct = profitTarget > 0 ? Math.min((netPnl / profitTarget) * 100, 100) : 0

  // ── Max drawdown (type-aware) ──
  const { ddUsed, ddFloor } = calcDrawdown(trades, accountSize, maxDD, drawdownType)

  // As % of account size for display
  const maxDDUsedPct    = accountSize > 0 ? (ddUsed / accountSize) * 100 : 0
  const maxDDLimitPct   = accountSize > 0 ? (maxDD  / accountSize) * 100 : 0
  // Progress bar: how much of the DD limit has been consumed
  const maxDDPct        = maxDDLimitPct > 0 ? Math.min((maxDDUsedPct / maxDDLimitPct) * 100, 100) : 0

  // ── Daily drawdown (always balance-based from today's open) ──
  const withPnl = trades.filter(t => t.pnl != null)

  // ── Status (type-aware, mirrors ChallengeTracker logic) ──
  function computeStatus() {
    if (account.failure_reason) return 'failed'

    // Daily DD breach: check worst single day ever
    const byDay = {}
    withPnl.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl) })
    const worstDayLoss = Object.values(byDay).length > 0
      ? Math.max(0, ...Object.values(byDay).map(v => -v)) : 0
    if (dailyDD > 0 && worstDayLoss >= dailyDD) return 'failed'

    // Max DD breach: use type-aware ddUsed
    if (maxDD > 0 && ddUsed >= maxDD) return 'failed'

    // Pass / fund check
    const tradingDayCount = new Set(trades.map(t => t.date)).size
    const minDaysMet = minDays === 0 || tradingDayCount >= minDays
    if (profitTarget > 0 && netPnl >= profitTarget && minDaysMet) {
      return account.phase === 'phase_2' || account.phase === 'funded' ? 'funded' : 'passed'
    }
    return 'active'
  }
  const computedStatus = computeStatus()

  const statusStyles = {
    active:  { bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050', label: 'In Progress' },
    passed:  { bg: '#0f2219', color: '#1db97b', border: '#1a3826', label: 'Passed' },
    failed:  { bg: '#1e0d0d', color: '#c03535', border: '#2e1515', label: 'Failed' },
    funded:  { bg: '#141f0d', color: '#7dc93f', border: '#1e2e10', label: 'Funded' },
  }
  const badge = statusStyles[computedStatus] || statusStyles.active

  // ── DD label (show drawdown type for transparency) ──
  const ddTypeLabel = drawdownType === 'trailing_balance' ? 'Trailing (Balance)'
    : drawdownType === 'trailing_equity' ? 'Trailing (Equity)'
    : 'Static'

  // Floor dollar label for right-side hint
  const floorLabel = `Floor $${ddFloor.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  return (
    <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '12px', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0' }}>{account.name}</h2>
          <p style={{ color: '#999', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', margin: 0 }}>
            {account.firm_name} · {account.phase?.replace('_', ' ')} · ${accountSize.toLocaleString()}
          </p>
        </div>
        <span style={{ background: badge.bg, border: `0.5px solid ${badge.border}`, borderRadius: '6px', padding: '4px 10px', color: badge.color, fontFamily: 'DM Mono, monospace', fontSize: '11px' }}>{badge.label}</span>
      </div>

      {/* Stats row 1 */}
      {!mobile && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '16px' }}><div style={{background:'#1a1a1a',height:'10px',width:'40px',borderRadius:'4px'}}/><div style={{background:'#1a1a1a',height:'22px',width:'80px',borderRadius:'4px',marginTop:'10px'}}/></div>)
        ) : (<>
          <StatCell label="Net P&L" value={s.total === 0 ? '$0.00' : fmt$(netPnl)} color={s.total === 0 ? '#fff' : pnlColor(netPnl)} />
          <StatCell label="Win Rate" value={s.total === 0 ? '0%' : `${s.winRate.toFixed(1)}%`} />
          <StatCell label="Trades" value={String(s.total)} />
          <StatCell label="W / L" value={`${s.wins} / ${s.losses}`} />
        </>)}
      </div>}

      {/* Stats row 2 */}
      {!mobile && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '10px', padding: '16px' }}><div style={{background:'#1a1a1a',height:'10px',width:'40px',borderRadius:'4px'}}/><div style={{background:'#1a1a1a',height:'22px',width:'80px',borderRadius:'4px',marginTop:'10px'}}/></div>)
        ) : (<>
          <StatCell label="Profit Factor" value={s.total === 0 ? '0.00' : isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '∞'} />
          <StatCell label="Best Trade" value={s.bestTrade != null ? `+$${s.bestTrade.toFixed(2)}` : '—'} color={s.bestTrade != null ? '#1db97b' : '#777'} />
          <StatCell label="Worst Trade" value={s.worstTrade != null ? `-$${Math.abs(s.worstTrade).toFixed(2)}` : '—'} color={s.worstTrade != null ? '#c03535' : '#777'} />
          <StatCell label="Avg Win / Loss" value={s.total === 0 ? '— / —' : `$${s.avgWin.toFixed(0)} / $${s.avgLoss.toFixed(0)}`} />
        </>)}
      </div>}

      {/* Progress bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <ProgressBar
          label={`Profit Target — ${profitTarget > 0 ? (profitTarget / accountSize * 100).toFixed(1) : '—'}%`}
          pct={profitPct}
          color="#1db97b"
          rightLabel={`${(netPnl / accountSize * 100 >= 0 ? '+' : '')}${(netPnl / accountSize * 100).toFixed(2)}% of ${profitTarget > 0 ? (profitTarget / accountSize * 100).toFixed(1) : '—'}% target`}
        />
        <ProgressBar
          label={`Max Drawdown (${ddTypeLabel}) — ${maxDDUsedPct.toFixed(2)}% / ${maxDDLimitPct.toFixed(1)}%`}
          pct={maxDDPct}
          color="#c03535"
          rightLabel={`${maxDDUsedPct.toFixed(2)}% used · ${floorLabel}`}
        />
      </div>
    </div>
  )
}
