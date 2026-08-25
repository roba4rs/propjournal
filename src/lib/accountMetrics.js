// src/lib/accountMetrics.js
//
// Shared account/drawdown/status calculations.
// Single source of truth for "how far is this account from blowing,
// and has it passed/failed" — used by both ChallengeCard.jsx and
// Analytics.jsx. If this logic ever needs to change, change it here once.

// ─── Drawdown calculation ───────────────────────────────────────────
//
// drawdown_type meanings:
//   'static'           — floor = accountSize - maxDD (fixed forever).
//                         If currentBalance > accountSize, DD used = 0.
//   'trailing_balance' — floor trails the highest *closed* balance ever
//                         reached; peak rises as balance grows, never falls.
//   'trailing_equity'  — treated identically to trailing_balance, since we
//                         only have closed-trade data, not live equity.
//   'trailing_instant' — like trailing_balance, but the floor can also move
//                         off *intra-trade* floating extremes, not just
//                         closed balance (how instant-funding firms like
//                         Maven actually compute it: the floor trails live
//                         equity, and a mid-trade breach counts even if the
//                         trade recovers before closing). Since we don't
//                         have live price data, this relies on an optional
//                         per-trade `extreme_balance` column — the furthest
//                         account balance the trade touched before closing.
//                         Left null on a trade, it just falls back to
//                         closed balance for that trade (safe default —
//                         see note below on why it's a lower bound).
//
// accountSize / maxDD are expected as DOLLAR amounts (e.g. an 8% limit on
// a $10,000 account is stored as maxDD = 800), matching how ChallengeCard
// already reads these columns in production.
//
// Returns: { ddUsed, ddFloor, ddRoom, peakBalance, breached, breachDate }
//   ddUsed     — dollars of drawdown consumed (always >= 0)
//   ddFloor    — current hard floor in dollars
//   ddRoom     — dollars remaining before the account blows
//   breached   — trailing_instant only: true if an intra-trade extreme
//                touched or crossed the floor at any point, even if the
//                account's closed balance never did
//   breachDate — date of the first such breach, or null
export function calcDrawdown(trades, accountSize, maxDD, drawdownType) {
  const withPnl = trades.filter(t => t.pnl != null)

  if (drawdownType === 'trailing_instant') {
    let balance = accountSize
    let peakBalance = accountSize
    let floor = accountSize - maxDD
    let breached = false
    let breachDate = null

    for (const t of withPnl) {
      const pnl = parseFloat(t.pnl)
      const closeBalance = balance + pnl

      // extreme_balance is the furthest the account balance touched while
      // this trade was open. Only applied to the peak/floor if it's a new
      // high — if not, it can't have changed anything, so we don't need
      // it. Left null on a trade, it just falls back to closed balance.
      const extreme = t.extreme_balance != null ? parseFloat(t.extreme_balance) : null

      const candidatePeak = extreme != null ? Math.max(extreme, closeBalance) : closeBalance
      if (candidatePeak > peakBalance) {
        peakBalance = candidatePeak
        floor = peakBalance - maxDD
      }

      const candidateTrough = extreme != null ? Math.min(extreme, closeBalance) : closeBalance
      if (!breached && candidateTrough <= floor) {
        breached = true
        breachDate = t.date
      }

      balance = closeBalance
    }

    const ddUsed = Math.max(0, peakBalance - balance)
    const ddRoom = Math.max(0, balance - floor)
    return { ddUsed, ddFloor: floor, ddRoom, peakBalance, breached, breachDate }
  }

  if (drawdownType === 'trailing_balance' || drawdownType === 'trailing_equity') {
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
  const floor = accountSize - maxDD
  const currentBalance = accountSize + withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const ddUsed = Math.max(0, accountSize - currentBalance)
  const ddRoom = Math.max(0, currentBalance - floor)
  return { ddUsed, ddFloor: floor, ddRoom, peakBalance: null }
}

// ─── Pass/fail status (mirrors ChallengeCard / ChallengeTracker) ──────
//
// Returns one of: 'active' | 'passed' | 'failed' | 'funded'
// This is a discrete OUTCOME — has the account technically breached or
// hit its target — not a trajectory signal. See computeHealthStatus
// below for the "is this account trending toward trouble" question.
export function computeAccountStatus(account, trades) {
  if (account.failure_reason) return 'failed'

  const withPnl = trades.filter(t => t.pnl != null)
  const accountSize = parseFloat(account.account_size) || 0
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0
  const minDays = account.min_trading_days || 0
  const drawdownType = account.drawdown_type || 'static'

  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const { ddUsed, breached } = calcDrawdown(trades, accountSize, maxDD, drawdownType)

  // Instant-account mid-trade breach: floor was touched intra-trade even
  // if the trade closed fine and the closed-balance ddUsed check below
  // wouldn't have caught it.
  if (drawdownType === 'trailing_instant' && breached) return 'failed'

  // Daily DD breach: worst single day ever
  const byDay = {}
  withPnl.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl) })
  const worstDayLoss = Object.values(byDay).length > 0
    ? Math.max(0, ...Object.values(byDay).map(v => -v)) : 0
  if (dailyDD > 0 && worstDayLoss >= dailyDD) return 'failed'

  // Max DD breach
  if (maxDD > 0 && ddUsed >= maxDD) return 'failed'

  // Pass / fund check
  const tradingDayCount = new Set(trades.map(t => t.date)).size
  const minDaysMet = minDays === 0 || tradingDayCount >= minDays
  if (profitTarget > 0 && netPnl >= profitTarget && minDaysMet) {
    return account.phase === 'funded' ? 'funded' : 'passed'
  }
  return 'active'
}

// ─── Health status — NEW, Analytics-only concept ──────────────────────
//
// Different question from status above. Status is a discrete outcome.
// Health is a trajectory signal for accounts still 'active' — how close
// is it to dying right now, even before it technically breaches.
//
// % of the account's OWN drawdown limit already consumed is the primary
// signal, since a $300 drawdown means something completely different on
// an 8%-limit account vs a 4%-limit account — this is what makes accounts
// from different firms comparable on equal footing. Profit factor < 1
// nudges a borderline account from healthy to neutral even when drawdown
// looks fine, since a string of small losses can kill an account slowly
// without ever spiking DD.
//
// Thresholds (30% / 60% of limit consumed) are a reasonable v1 starting
// point, not derived from anything firm — tune freely once you see real
// accounts running through this.
export function computeHealthStatus({ ddConsumedPct, profitFactor, netPnl }) {
  if (ddConsumedPct >= 60) return 'risk'
  if (ddConsumedPct >= 30) return 'neutral'
  if (netPnl < 0 && profitFactor < 1) return 'neutral'
  return 'healthy'
}

// ─── Full per-account metrics bundle ───────────────────────────────────
//
// One call, everything the Analytics comparison table / best-worst cards
// need for a single account.
export function computeAccountMetrics(account, trades) {
  const withPnl = trades.filter(t => t.pnl != null)
  const wins = withPnl.filter(t => parseFloat(t.pnl) > 0)
  const losses = withPnl.filter(t => parseFloat(t.pnl) < 0)

  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const winRate = withPnl.length ? (wins.length / withPnl.length) * 100 : 0
  const grossWin = wins.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0

  const accountSize = parseFloat(account.account_size) || 0
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const drawdownType = account.drawdown_type || 'static'

  const { ddUsed, ddFloor } = calcDrawdown(trades, accountSize, maxDD, drawdownType)
  const maxDDUsedPct = accountSize > 0 ? (ddUsed / accountSize) * 100 : 0
  const maxDDLimitPct = accountSize > 0 ? (maxDD / accountSize) * 100 : 0
  // % of the account's OWN limit consumed — the cross-firm-comparable number
  const ddConsumedPct = maxDDLimitPct > 0
    ? Math.min((maxDDUsedPct / maxDDLimitPct) * 100, 100)
    : 0

  const netPnlPct = accountSize > 0 ? (netPnl / accountSize) * 100 : 0
  const profitProgressPct = profitTarget > 0
    ? Math.min((netPnl / profitTarget) * 100, 100)
    : 0

  const status = computeAccountStatus(account, trades)
  const healthStatus = computeHealthStatus({ ddConsumedPct, profitFactor, netPnl })

  return {
    accountId: account.id,
    name: account.name,
    firmName: account.firm_name,
    phase: account.phase,
    accountSize,
    netPnl, netPnlPct,
    winRate, profitFactor,
    ddUsed, ddFloor, maxDDUsedPct, maxDDLimitPct, ddConsumedPct,
    profitProgressPct,
    status, healthStatus,
    tradeCount: withPnl.length,
  }
}