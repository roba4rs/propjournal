import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import NewChallengeModal from '../components/NewChallengeModal'
import { useSidebar } from '../SidebarContext'

const FILTERS = ['All', 'In Progress', 'Funded', 'Passed', 'Failed']
const FIRMS = ['FTMO', 'MyForexFunds', 'The5ers', 'Funded Next', 'True Forex Funds', 'E8 Funding', 'Other']
const PHASES = ['Phase 1', 'Phase 2', 'Funded']

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditChallengeModal({ challenge, onClose, onSaved, onDeleted }) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const initAccountSize = parseFloat(challenge.account_size) || 0
  const isKnownFirm = FIRMS.includes(challenge.firm_name)

  const [form, setForm] = useState({
    firm_name:          isKnownFirm ? challenge.firm_name : 'Other',
    custom_firm:        isKnownFirm ? '' : (challenge.firm_name || ''),
    phase:              challenge.phase
                          ? challenge.phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                          : 'Phase 1',
    account_size:       initAccountSize.toString(),
    profit_target_pct:  initAccountSize > 0
                          ? ((parseFloat(challenge.profit_target) || 0) / initAccountSize * 100).toFixed(2)
                          : '',
    max_drawdown_pct:   initAccountSize > 0
                          ? ((parseFloat(challenge.max_drawdown) || 0) / initAccountSize * 100).toFixed(2)
                          : '',
    daily_drawdown_pct: initAccountSize > 0
                          ? ((parseFloat(challenge.daily_drawdown) || 0) / initAccountSize * 100).toFixed(2)
                          : '',
    min_trading_days:   challenge.min_trading_days?.toString() || '',
    start_date:         challenge.start_date || new Date().toISOString().split('T')[0],
  })

  // Re-fetch firm preset when phase changes and firm is known
  useEffect(() => {
    const firmName = form.firm_name === 'Other' ? form.custom_firm : form.firm_name
    if (!firmName || firmName === 'Other') return
    const phaseKey = form.phase.toLowerCase().replace(' ', '_')
    supabase
      .from('firm_presets')
      .select('*')
      .eq('firm_name', firmName)
      .eq('phase', phaseKey)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setForm(prev => ({
          ...prev,
          profit_target_pct:  data.profit_target_pct != null ? String(data.profit_target_pct) : prev.profit_target_pct,
          max_drawdown_pct:   data.max_drawdown_pct  != null ? String(data.max_drawdown_pct)  : prev.max_drawdown_pct,
          daily_drawdown_pct: data.daily_drawdown_pct != null ? String(data.daily_drawdown_pct) : prev.daily_drawdown_pct,
          min_trading_days:   data.min_trading_days  != null ? String(data.min_trading_days)  : prev.min_trading_days,
        }))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phase])

  const [manualFail, setManualFail] = useState(false)
  const [failReason, setFailReason] = useState(challenge.failure_reason || '')
  const [failNotes, setFailNotes] = useState(challenge.failure_notes || '')
  const [savingFail, setSavingFail] = useState(false)

  const FAIL_REASONS = [
    'News Trading',
    'Copy Trading',
    'EA / Bot',
    'Hedging',
    'Weekend Hold',
    'Other',
  ]

  const handleManualFail = async () => {
    if (!failReason) { setError('Select a reason for failure'); return }
    setSavingFail(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('accounts')
        .update({ failure_reason: failReason, failure_notes: failNotes || null })
        .eq('id', challenge.id)
      if (err) throw err
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingFail(false)
    }
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const size          = parseFloat(form.account_size) || 0
  const profitDollar  = ((parseFloat(form.profit_target_pct)  || 0) / 100) * size
  const maxDDDollar   = ((parseFloat(form.max_drawdown_pct)   || 0) / 100) * size
  const dailyDDDollar = ((parseFloat(form.daily_drawdown_pct) || 0) / 100) * size

  const handleSave = async () => {
    const firmName = form.firm_name === 'Other' ? form.custom_firm : form.firm_name
    if (!firmName || !form.account_size || !form.profit_target_pct || !form.max_drawdown_pct || !form.daily_drawdown_pct) {
      setError('Please fill in all required fields')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('accounts')
        .update({
          firm_name:        firmName,
          name:             `${firmName} — ${form.phase}`,
          phase:            form.phase.toLowerCase().replace(' ', '_'),
          account_size:     size,
          profit_target:    profitDollar,
          max_drawdown:     maxDDDollar,
          daily_drawdown:   dailyDDDollar,
          min_trading_days: parseInt(form.min_trading_days) || null,
          start_date:       form.start_date,
        })
        .eq('id', challenge.id)
      if (err) throw err
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await supabase.from('accounts').delete().eq('id', challenge.id)
      onDeleted()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: '#0d0d0d',
    border: '0.5px solid #222',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fff',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block',
    color: '#777',
    fontFamily: 'DM Mono, monospace',
    fontSize: '10px',
    fontWeight: '500',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '6px',
  }
  const hintStyle = { color: '#1db97b', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '4px' }
  const sectionLabel = {
    color: '#1db97b',
    fontFamily: 'DM Mono, monospace',
    fontSize: '10px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    margin: '0 0 14px 0',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '12px', padding: '28px 32px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', margin: 0, letterSpacing: '0.03em' }}>
            Edit Challenge
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#777', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* ── Section: Firm & Account ── */}
        <p style={sectionLabel}>Firm &amp; Account</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>

          <div style={{ gridColumn: form.firm_name === 'Other' ? '1 / -1' : '1 / 2' }}>
            <label style={labelStyle}>Firm Name *</label>
            <input
              name="custom_firm"
              type="text"
              placeholder="e.g. Maven Trading"
              value={form.firm_name === 'Other' ? form.custom_firm : (isKnownFirm ? form.firm_name : form.custom_firm)}
              onChange={e => {
                const val = e.target.value
                const matched = FIRMS.find(f => f.toLowerCase() === val.toLowerCase())
                setForm({ ...form, firm_name: matched || 'Other', custom_firm: val })
              }}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Account Size ($) *</label>
            <input name="account_size" type="number" placeholder="100000" value={form.account_size} onChange={handleChange} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Phase *</label>
            <select name="phase" value={form.phase} onChange={handleChange} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
              {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Start Date</label>
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} style={inputStyle} />
          </div>

        </div>

        {/* ── Section: Rules ── */}
        <p style={sectionLabel}>Rules</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>

          <div>
            <label style={labelStyle}>Profit Target (%) *</label>
            <input name="profit_target_pct" type="number" placeholder="10" value={form.profit_target_pct} onChange={handleChange} style={inputStyle} />
            {profitDollar > 0 && <p style={hintStyle}>= ${profitDollar.toLocaleString()}</p>}
          </div>

          <div>
            <label style={labelStyle}>Max Overall Drawdown (%) *</label>
            <input name="max_drawdown_pct" type="number" placeholder="10" value={form.max_drawdown_pct} onChange={handleChange} style={inputStyle} />
            {maxDDDollar > 0 && <p style={hintStyle}>= ${maxDDDollar.toLocaleString()}</p>}
          </div>

          <div>
            <label style={labelStyle}>Max Daily Drawdown (%) *</label>
            <input name="daily_drawdown_pct" type="number" placeholder="5" value={form.daily_drawdown_pct} onChange={handleChange} style={inputStyle} />
            {dailyDDDollar > 0 && <p style={hintStyle}>= ${dailyDDDollar.toLocaleString()}</p>}
          </div>

          <div>
            <label style={labelStyle}>Min Trading Days</label>
            <input name="min_trading_days" type="number" placeholder="4" value={form.min_trading_days} onChange={handleChange} style={inputStyle} />
          </div>

        </div>

        {error && (
          <div style={{ background: '#1e0d0d', border: '0.5px solid #2e1515', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#c03535', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '11px', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, background: '#1db97b', border: 'none', borderRadius: '8px', padding: '11px', color: '#000', fontFamily: 'DM Sans, sans-serif', fontWeight: '600', fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* ── Manual Fail Override ── */}
        {challenge.failure_reason ? (
          <div style={{ background: '#1e0d0d', border: '0.5px solid #2e1515', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#c03535', fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Marked as Failed</p>
            <p style={{ color: '#aaa', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', margin: '0 0 4px 0' }}>Reason: <span style={{ color: '#ccc' }}>{challenge.failure_reason}</span></p>
            {challenge.failure_notes && <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: 0 }}>{challenge.failure_notes}</p>}
          </div>
        ) : (
          <div style={{ border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Rule Violation / Manual Fail</p>
            <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: '0 0 12px 0' }}>
              Use this if the prop firm failed your account due to a rule violation not captured by drawdown numbers.
            </p>
            {!manualFail ? (
              <button onClick={() => setManualFail(true)} style={{ background: 'transparent', border: '0.5px solid #2e1515', borderRadius: '6px', padding: '8px 16px', color: '#c03535', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}>
                Mark as Failed
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Reason *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {FAIL_REASONS.map(r => (
                      <button key={r} onClick={() => setFailReason(r)} style={{
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                        fontFamily: 'DM Mono, monospace', fontSize: '11px',
                        background: failReason === r ? '#1e0d0d' : 'transparent',
                        border: `0.5px solid ${failReason === r ? '#c03535' : '#2a2a2a'}`,
                        color: failReason === r ? '#c03535' : '#777',
                        transition: 'all 0.15s',
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Notes (optional)</label>
                  <textarea
                    value={failNotes}
                    onChange={e => setFailNotes(e.target.value)}
                    placeholder="e.g. Traded XAUUSD 5 min before NFP..."
                    rows={3}
                    style={{ width: '100%', background: '#0d0d0d', border: '0.5px solid #222', borderRadius: '8px', padding: '10px 14px', color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setManualFail(false)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '8px 14px', color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleManualFail} disabled={savingFail} style={{ background: '#c03535', border: 'none', borderRadius: '6px', padding: '8px 16px', color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: '600', fontSize: '12px', cursor: savingFail ? 'not-allowed' : 'pointer', opacity: savingFail ? 0.7 : 1 }}>
                    {savingFail ? 'Saving...' : 'Confirm Failure'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone */}
        <div style={{ background: '#0e0a0a', border: '0.5px solid #2e1515', borderRadius: '8px', padding: '16px' }}>
          <p style={{ color: '#c03535', fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px 0' }}>Danger Zone</p>
          <p style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: '0 0 12px 0' }}>
            Deleting this challenge will permanently remove all associated trades.
          </p>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: 'transparent', border: '0.5px solid #2e1515', borderRadius: '6px', padding: '8px 16px', color: '#c03535', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}>
              Delete Challenge
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>Are you sure?</span>
              <button onClick={handleDelete} disabled={deleting} style={{ background: '#c03535', border: 'none', borderRadius: '6px', padding: '8px 16px', color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: '600', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '8px 16px', color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const statusBadge = {
  active: { bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050', label: 'In Progress' },
  funded: { bg: '#141f0d', color: '#7dc93f', border: '#1e2e10', label: 'Funded' },
  passed: { bg: '#0f2219', color: '#1db97b', border: '#1a3826', label: 'Passed' },
  failed: { bg: '#1e0d0d', color: '#c03535', border: '#2e1515', label: 'Failed' },
}

function computeStats(trades) {
  const withPnl = trades.filter(t => t.pnl != null)
  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const closed = trades.filter(t => t.outcome && t.outcome !== 'in_progress')
  const wins = closed.filter(t => t.outcome === 'win')
  const losses = closed.filter(t => t.outcome === 'loss')
  const be = closed.filter(t => t.outcome === 'be')
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0
  return { netPnl, winRate, total: trades.length, wins: wins.length, losses: losses.length, be: be.length }
}

function computeProgress(trades, account) {
  const withPnl = trades.filter(t => t.pnl != null)
  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)
  const accountSize = parseFloat(account.account_size) || 0
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0

  const inProfit = netPnl >= 0

  // Profit bar: only shows when account is in profit
  const netPnlPct = accountSize > 0 ? (netPnl / accountSize) * 100 : 0
  const profitPct = (inProfit && profitTarget > 0) ? Math.min((netPnl / profitTarget) * 100, 100) : 0

  // Max drawdown: only shows when account is in loss (netPnl < 0)
  const maxDrawdownUsed = inProfit ? 0 : Math.abs(netPnl)
  const maxDDUsedPct = inProfit ? 0 : (accountSize > 0 ? (maxDrawdownUsed / accountSize) * 100 : 0)
  const maxDDLimitPct = accountSize > 0 ? (maxDD / accountSize) * 100 : 0
  const maxDDBarPct = inProfit ? 0 : (maxDD > 0 ? Math.min((maxDrawdownUsed / maxDD) * 100, 100) : 0)

  // Daily drawdown: today's loss only (zero if today is profitable)
  const today = new Date().toISOString().split('T')[0]
  const todayPnl = withPnl.filter(t => t.date === today).reduce((s, t) => s + parseFloat(t.pnl), 0)
  const todayLoss = Math.max(0, -todayPnl)
  const dailyDDUsedPct = accountSize > 0 ? (todayLoss / accountSize) * 100 : 0
  const dailyDDLimitPct = accountSize > 0 ? (dailyDD / accountSize) * 100 : 0
  const dailyDDBarPct = dailyDD > 0 ? Math.min((todayLoss / dailyDD) * 100, 100) : 0

  const tradingDays = new Set(trades.map(t => t.date)).size
  const minDays = account.min_trading_days || 0
  const minDaysBarPct = minDays > 0 ? Math.min((tradingDays / minDays) * 100, 100) : 0

  return {
    netPnl, netPnlPct, profitPct,
    maxDDUsedPct, maxDDLimitPct, maxDDBarPct,
    dailyDDUsedPct, dailyDDLimitPct, dailyDDBarPct,
    tradingDays, minDays, minDaysBarPct,
    profitTarget, maxDD, dailyDD, accountSize,
  }
}

function computeStatus(trades, account) {
  if (account.failure_reason) return 'failed'

  // Funded phase accounts always show as 'funded' regardless of P&L
  if (account.phase === 'funded') return 'funded'

  const withPnl = trades.filter(t => t.pnl != null)
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0
  const minDays = account.min_trading_days || 0
  const accountSize = parseFloat(account.account_size) || 0

  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl), 0)

  let balance = accountSize
  let lowestBalance = accountSize
  for (const t of withPnl) {
    balance += parseFloat(t.pnl)
    if (balance < lowestBalance) lowestBalance = balance
  }
  const maxDrawdownUsed = Math.max(0, accountSize - lowestBalance)

  const byDay = {}
  withPnl.forEach(t => {
    byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl)
  })
  const worstDayLoss = Object.values(byDay).length > 0
    ? Math.max(0, ...Object.values(byDay).map(v => -v))
    : 0

  const maxDDBreach   = maxDD > 0 && maxDrawdownUsed >= maxDD
  const dailyDDBreach = dailyDD > 0 && worstDayLoss >= dailyDD

  if (maxDDBreach || dailyDDBreach) return 'failed'

  const tradingDays = new Set(trades.map(t => t.date)).size
  const minDaysMet  = minDays === 0 || tradingDays >= minDays
  const profitMet   = profitTarget > 0 && netPnl >= profitTarget

  // Phase 1 and Phase 2 both say 'passed' when targets are met
  if (profitMet && minDaysMet) return 'passed'

  return 'active'
}

function ProgressBlock({ label, barPct, barColor, leftLabel, rightLabel }) {
  return (
    <div style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '8px', padding: '14px' }}>
      <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>
        {label}
      </p>
      <div style={{ height: '3px', background: '#181818', borderRadius: '2px', marginBottom: '6px' }}>
        <div style={{ height: '3px', width: `${Math.max(0, Math.min(barPct, 100))}%`, background: barColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: barColor, fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>{leftLabel}</span>
        <span style={{ color: '#666', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>{rightLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChallengeTracker() {
  const { collapsed } = useSidebar()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [tradesByAccount, setTradesByAccount] = useState({})
  const [filter, setFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'compact'
  const [mobileView, setMobileView] = useState('grid') // 'list' | 'grid'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchChallenges = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const { data: accounts, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'challenge')
        .order('created_at', { ascending: false })
      if (accErr) throw accErr

      setChallenges(accounts || [])

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map(a => a.id)
        const { data: trades, error: tradeErr } = await supabase
          .from('trades')
          .select('*')
          .in('account_id', accountIds)
          .order('date', { ascending: true })
        if (tradeErr) throw tradeErr

        const grouped = {}
        accountIds.forEach(id => { grouped[id] = [] })
        ;(trades || []).forEach(t => {
          if (grouped[t.account_id]) grouped[t.account_id].push(t)
        })
        setTradesByAccount(grouped)
      } else {
        setTradesByAccount({})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChallenges() }, [])


  const sortedChallenges = [...challenges].sort((a, b) => {
    const aTrades = tradesByAccount[a.id] || []
    const bTrades = tradesByAccount[b.id] || []
    const aLatest = aTrades.length > 0
      ? Math.max(...aTrades.map(t => new Date(t.date).getTime()))
      : new Date(a.created_at).getTime()
    const bLatest = bTrades.length > 0
      ? Math.max(...bTrades.map(t => new Date(t.date).getTime()))
      : new Date(b.created_at).getTime()
    return bLatest - aLatest
  })

  const filtered = filter === 'All'
    ? sortedChallenges
    : sortedChallenges.filter(c => {
        const status = computeStatus(tradesByAccount[c.id] || [], c)
        if (filter === 'In Progress') return status === 'active'
        return status === filter.toLowerCase()
      })

  // ── MOBILE LAYOUT ────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileFilterTabs = ['All', 'Active', 'Funded', 'Passed', 'Failed']

    const tabStyle = (active) => ({
      background: active ? '#0f2219' : 'transparent',
      border: `0.5px solid ${active ? '#1a3826' : '#1e1e1e'}`,
      borderRadius: '4px',
      padding: '4px 10px',
      fontSize: '11px',
      color: active ? '#1db97b' : '#777',
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
      flexShrink: 0,
      cursor: 'pointer',
    })

    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Sidebar handles hamburger + drawer + bottom tabs */}
        <Sidebar />

        {/* Top bar overlay: "Challenges" title center + "+ New" right */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: '52px', paddingRight: '14px',
          zIndex: 201, pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: "'Syne', sans-serif", fontSize: '15px',
            fontWeight: '600', color: '#fff', pointerEvents: 'none',
          }}>Challenges</span>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#fff', border: 'none', borderRadius: '5px',
              padding: '5px 11px', fontSize: '12px', fontWeight: '600',
              color: '#000', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
              pointerEvents: 'auto',
            }}
          >+ New</button>
        </div>

        {/* Filter tabs */}
        <div style={{
          position: 'fixed', top: '52px', left: 0, right: 0,
          background: '#0a0a0a', borderBottom: '0.5px solid #111',
          padding: '6px 10px', zIndex: 199,
          display: 'flex', alignItems: 'center', gap: '5px', overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {mobileFilterTabs.map(f => (
            <button key={f} onClick={() => setFilter(f === 'Active' ? 'In Progress' : f)} style={tabStyle(
              f === 'Active' ? filter === 'In Progress' : filter === f
            )}>{f}</button>
          ))}
          {/* View toggle — flush right */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', flexShrink: 0 }}>
            <button onClick={() => setMobileView('grid')} style={{ background: 'transparent', border: 'none', padding: '4px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="0.5" y="0.5" width="5" height="5" rx="1" fill={mobileView === 'grid' ? '#fff' : '#444'} />
                <rect x="7.5" y="0.5" width="5" height="5" rx="1" fill={mobileView === 'grid' ? '#fff' : '#444'} />
                <rect x="0.5" y="7.5" width="5" height="5" rx="1" fill={mobileView === 'grid' ? '#fff' : '#444'} />
                <rect x="7.5" y="7.5" width="5" height="5" rx="1" fill={mobileView === 'grid' ? '#fff' : '#444'} />
              </svg>
            </button>
            <button onClick={() => setMobileView('list')} style={{ background: 'transparent', border: 'none', padding: '4px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="0.5" y="1.5" width="12" height="2" rx="1" fill={mobileView === 'list' ? '#fff' : '#444'} />
                <rect x="0.5" y="5.5" width="12" height="2" rx="1" fill={mobileView === 'list' ? '#fff' : '#444'} />
                <rect x="0.5" y="9.5" width="12" height="2" rx="1" fill={mobileView === 'list' ? '#fff' : '#444'} />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable card list */}
        <main style={{ paddingTop: '94px', paddingBottom: '68px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#666', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#555', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
              No challenges yet — tap "+ New" to get started
            </div>
          ) : mobileView === 'grid' ? (

            /* ── MOBILE GRID VIEW ── */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px 10px 0' }}>
              {filtered.map(challenge => {
                const trades = tradesByAccount[challenge.id] || []
                const s = computeStats(trades)
                const p = computeProgress(trades, challenge)
                const computedStatus = computeStatus(trades, challenge)
                const badge = statusBadge[computedStatus] || statusBadge.active
                const pnlColor = s.netPnl > 0 ? '#1db97b' : s.netPnl < 0 ? '#c03535' : '#e0e0e0'
                const pnlLabel = `${s.netPnl >= 0 ? '+' : ''}$${Math.abs(s.netPnl).toFixed(0)}`
                const isActive = computedStatus === 'active'
                const isFailed = computedStatus === 'failed'
                const phaseLabel = challenge.phase
                  ? challenge.phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : '—'

                return (
                  <div key={challenge.id} style={{
                    background: '#111',
                    border: `0.5px solid ${isFailed ? '#2e1515' : '#1e1e1e'}`,
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {challenge.firm_name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#666', fontFamily: "'DM Sans', sans-serif", marginTop: '2px' }}>
                          {phaseLabel} · ${Number(challenge.account_size).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ background: badge.bg, border: `0.5px solid ${badge.border}`, borderRadius: '4px', padding: '2px 6px', fontSize: '8px', color: badge.color, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '4px' }}>
                        {badge.label}
                      </span>
                    </div>

                    {/* P&L */}
                    <div>
                      <div style={{ fontSize: '8px', color: '#777', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Mono', monospace" }}>P&L</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: pnlColor, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{pnlLabel}</div>
                    </div>

                    {/* Win Rate */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Mono', monospace" }}>Win Rate</span>
                      <span style={{ fontSize: '13px', color: '#e0e0e0', fontFamily: "'DM Mono', monospace" }}>{s.total === 0 ? '0%' : `${s.winRate.toFixed(0)}%`}</span>
                    </div>

                    {/* Progress bars — all statuses */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '7px', color: '#555', fontFamily: "'DM Mono', monospace" }}>Profit</span>
                          <span style={{ fontSize: '7px', color: '#1db97b', fontFamily: "'DM Mono', monospace" }}>
                            {isActive ? `${p.netPnlPct >= 0 ? p.netPnlPct.toFixed(1) : '0.0'}% / ${p.accountSize > 0 ? (p.profitTarget / p.accountSize * 100).toFixed(0) : '—'}%` : (isFailed ? '—' : '100%')}
                          </span>
                        </div>
                        <div style={{ height: '2px', background: '#181818', borderRadius: '2px' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: '#1db97b', width: isActive ? `${p.netPnlPct >= 0 ? Math.min(p.profitPct, 100) : 0}%` : isFailed ? '0%' : '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontSize: '7px', color: '#555', fontFamily: "'DM Mono', monospace" }}>Max DD</span>
                          <span style={{ fontSize: '7px', color: '#c03535', fontFamily: "'DM Mono', monospace" }}>
                            {isActive ? `${p.maxDDUsedPct.toFixed(1)}% / ${p.maxDDLimitPct.toFixed(0)}%` : isFailed ? '100%' : '—'}
                          </span>
                        </div>
                        <div style={{ height: '2px', background: '#181818', borderRadius: '2px' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: '#c03535', width: isActive ? `${Math.min(p.maxDDBarPct, 100)}%` : isFailed ? '100%' : '0%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                      <button onClick={() => setEditingChallenge(challenge)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '4px', padding: '5px 7px', fontSize: '11px', color: '#666', cursor: 'pointer', flexShrink: 0 }}>✏️</button>
                      <button onClick={() => navigate(`/dashboard?account=${challenge.id}`)} style={{ flex: 1, background: 'transparent', border: `0.5px solid ${isFailed ? '#2e1515' : '#1e1e1e'}`, borderRadius: '4px', padding: '5px', fontSize: '10px', color: '#666', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Dashboard →</button>
                    </div>
                  </div>
                )
              })}
            </div>

          ) : (

            /* ── MOBILE LIST VIEW (existing) ── */
            filtered.map(challenge => {
              const trades = tradesByAccount[challenge.id] || []
              const s = computeStats(trades)
              const p = computeProgress(trades, challenge)
              const computedStatus = computeStatus(trades, challenge)
              const badge = statusBadge[computedStatus] || statusBadge.active

              const pnlColor = s.netPnl > 0 ? '#1db97b' : s.netPnl < 0 ? '#c03535' : '#e0e0e0'
              const pnlLabel = `${s.netPnl >= 0 ? '+' : ''}$${Math.abs(s.netPnl).toFixed(0)}`

              const isActive = computedStatus === 'active'
              const isFailed = computedStatus === 'failed'

              const phaseLabel = challenge.phase
                ? challenge.phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                : '—'
              const startFormatted = challenge.start_date
                ? new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'

              return (
                <div key={challenge.id} style={{
                  margin: '8px 10px 0',
                  background: '#111',
                  border: `0.5px solid ${isFailed ? '#2e1515' : '#1e1e1e'}`,
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  {/* Card header: firm name + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{
                        fontSize: '14px', fontWeight: '700', color: '#fff',
                        fontFamily: "'Syne', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{challenge.firm_name}</span>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '3px', fontFamily: "'DM Sans', sans-serif" }}>
                        {phaseLabel} · ${Number(challenge.account_size).toLocaleString()} · Started {startFormatted}
                      </div>
                    </div>
                    <span style={{
                      background: badge.bg, border: `0.5px solid ${badge.border}`,
                      borderRadius: '4px', padding: '2px 7px',
                      fontSize: '9px', color: badge.color,
                      fontFamily: "'DM Mono', monospace", flexShrink: 0,
                    }}>{badge.label}</span>
                  </div>

                  {/* 2 stat cards: P&L + Win Rate */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', margin: '8px 0 10px' }}>
                    <div style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '5px', padding: '7px 8px' }}>
                      <div style={{ fontSize: '8px', color: '#777', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Mono', monospace" }}>P&L</div>
                      <div style={{ fontSize: '13px', color: pnlColor, fontFamily: "'DM Mono', monospace" }}>{pnlLabel}</div>
                    </div>
                    <div style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '5px', padding: '7px 8px' }}>
                      <div style={{ fontSize: '8px', color: '#777', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'DM Mono', monospace" }}>Win Rate</div>
                      <div style={{ fontSize: '13px', color: '#e0e0e0', fontFamily: "'DM Mono', monospace" }}>
                        {s.total === 0 ? '0%' : `${s.winRate.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>

                  {/* Progress bars — active only */}
                  {isActive && (
                    <>
                      {/* Profit Target bar */}
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '8px', color: '#777', fontFamily: "'DM Sans', sans-serif" }}>Profit Target</span>
                          <span style={{ fontSize: '8px', color: p.netPnlPct >= 0 ? '#1db97b' : '#777', fontFamily: "'DM Mono', monospace" }}>
                            {p.netPnlPct >= 0 ? p.netPnlPct.toFixed(1) : '0.0'}% / {p.accountSize > 0 ? (p.profitTarget / p.accountSize * 100).toFixed(0) : '—'}%
                          </span>
                        </div>
                        <div style={{ height: '3px', background: '#181818', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${p.netPnlPct >= 0 ? Math.min(p.profitPct, 100) : 0}%`, background: p.netPnlPct >= 0 ? '#1db97b' : '#c03535', borderRadius: '2px' }} />
                        </div>
                      </div>

                      {/* Max Drawdown bar */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '8px', color: '#777', fontFamily: "'DM Sans', sans-serif" }}>Max Drawdown</span>
                          <span style={{ fontSize: '8px', color: '#c03535', fontFamily: "'DM Mono', monospace" }}>
                            {p.maxDDUsedPct.toFixed(1)}% / {p.maxDDLimitPct.toFixed(0)}%
                          </span>
                        </div>
                        <div style={{ height: '3px', background: '#181818', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${Math.min(p.maxDDBarPct, 100)}%`, background: '#c03535', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bottom row: Edit + Go to Dashboard */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingChallenge(challenge)}
                      style={{
                        background: 'transparent',
                        border: '0.5px solid #1e1e1e',
                        borderRadius: '5px', padding: '6px 10px',
                        fontSize: '13px', color: '#666', cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >✏️</button>
                    <button
                      onClick={() => navigate(`/dashboard?account=${challenge.id}`)}
                      style={{
                        flex: 1, background: 'transparent',
                        border: `0.5px solid ${isFailed ? '#2e1515' : '#1e1e1e'}`,
                        borderRadius: '5px', padding: '6px',
                        fontSize: '11px', color: '#666', cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >Go to Dashboard →</button>
                  </div>
                </div>
              )
            })
          )}
          {/* bottom padding for last card */}
          <div style={{ height: '8px' }} />
        </main>

        {showModal && (
          <NewChallengeModal onClose={() => setShowModal(false)} onCreated={fetchChallenges} />
        )}
        {editingChallenge && (
          <EditChallengeModal
            challenge={editingChallenge}
            onClose={() => setEditingChallenge(null)}
            onSaved={fetchChallenges}
            onDeleted={fetchChallenges}
          />
        )}
      </div>
    )
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: '600', margin: 0 }}>Challenge Tracker</h1>
          <button onClick={() => setShowModal(true)} style={{
            background: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 18px', color: '#000',
            fontFamily: 'Syne, sans-serif', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
          }}>+ New Challenge</button>
        </div>

        {/* Filter Tabs + View Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? '#0f2219' : 'transparent',
                border: '0.5px solid', borderColor: filter === f ? '#1a3826' : '#1e1e1e',
                borderRadius: '6px', padding: '6px 14px',
                color: filter === f ? '#1db97b' : '#777',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#0d0d0d', border: '0.5px solid #1e1e1e', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {/* Cards view — lines icon (wide detailed rows) */}
            <button
              onClick={() => setViewMode('cards')}
              title="Detailed"
              style={{
                background: viewMode === 'cards' ? '#1a1a1a' : 'transparent',
                border: viewMode === 'cards' ? '0.5px solid #2a2a2a' : '0.5px solid transparent',
                borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="2" width="13" height="2" rx="1" fill={viewMode === 'cards' ? '#fff' : '#666'} />
                <rect x="1" y="6.5" width="13" height="2" rx="1" fill={viewMode === 'cards' ? '#fff' : '#666'} />
                <rect x="1" y="11" width="13" height="2" rx="1" fill={viewMode === 'cards' ? '#fff' : '#666'} />
              </svg>
            </button>
            {/* Compact view — grid/tiles icon */}
            <button
              onClick={() => setViewMode('compact')}
              title="Grid"
              style={{
                background: viewMode === 'compact' ? '#1a1a1a' : 'transparent',
                border: viewMode === 'compact' ? '0.5px solid #2a2a2a' : '0.5px solid transparent',
                borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill={viewMode === 'compact' ? '#fff' : '#666'} />
                <rect x="8" y="1" width="6" height="6" rx="1.5" fill={viewMode === 'compact' ? '#fff' : '#666'} />
                <rect x="1" y="8" width="6" height="6" rx="1.5" fill={viewMode === 'compact' ? '#fff' : '#666'} />
                <rect x="8" y="8" width="6" height="6" rx="1.5" fill={viewMode === 'compact' ? '#fff' : '#666'} />
              </svg>
            </button>
            {/* Compact list view */}

          </div>
        </div>

        {/* Challenge List */}
        {loading ? (
          <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', margin: 0 }}>
              No challenges yet — click "+ New Challenge" to get started
            </p>
          </div>
        ) : viewMode === 'compact' ? (

          /* ── GRID TILES VIEW ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {filtered.map(challenge => {
              const trades = tradesByAccount[challenge.id] || []
              const s = computeStats(trades)
              const p = computeProgress(trades, challenge)
              const computedStatus = computeStatus(trades, challenge)
              const badge = statusBadge[computedStatus] || statusBadge.active
              const pnlColor = s.netPnl > 0 ? '#1db97b' : s.netPnl < 0 ? '#c03535' : '#fff'
              const pnlLabel = trades.length === 0 ? '$0.00' : `${s.netPnl >= 0 ? '+' : ''}$${Math.abs(s.netPnl).toFixed(2)}`

              return (
                <div key={challenge.id} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '10px', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Header: firm name + edit left, badge right — same row; meta below */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <p style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challenge.firm_name}</p>
                        <button onClick={() => setEditingChallenge(challenge)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '10px', padding: '1px 2px', lineHeight: 1, flexShrink: 0, marginBottom: '2px' }}>✏️</button>
                      </div>
                      <span style={{ color: '#666', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>{challenge.phase?.replace('_', ' ').toUpperCase()} · ${Number(challenge.account_size).toLocaleString()}</span>
                    </div>
                    <span style={{ background: badge.bg, border: `0.5px solid ${badge.border}`, borderRadius: '5px', padding: '3px 8px', color: badge.color, fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>{badge.label}</span>
                  </div>

                  {/* 4-column stat strip with dividers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '0.5px solid #1a1a1a', borderBottom: '0.5px solid #1a1a1a', padding: '8px 0' }}>
                    {[
                      { value: pnlLabel, label: 'P&L', color: trades.length === 0 ? '#fff' : pnlColor },
                      { value: s.total === 0 ? '0%' : `${s.winRate.toFixed(1)}%`, label: 'Win Rate', color: '#fff' },
                      { value: String(s.total), label: 'Trades', color: '#fff' },
                      { value: `${s.wins}W·${s.losses}L·${s.be}BE`, label: 'W/L/BE', color: '#fff' },
                    ].map((stat, i) => (
                      <div key={stat.label} style={{ textAlign: 'center', borderRight: i < 3 ? '0.5px solid #1a1a1a' : 'none', padding: '0 4px' }}>
                        <p style={{ color: stat.color, fontFamily: 'DM Mono, monospace', fontSize: '15px', margin: '0 0 1px 0' }}>{stat.value}</p>
                        <p style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px', margin: 0 }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '9px', width: '70px', flexShrink: 0 }}>Profit</span>
                      <div style={{ flex: 1, height: '2px', background: '#1a1a1a', borderRadius: '2px' }}>
                        <div style={{ height: '2px', width: `${Math.max(0, Math.min(p.profitPct, 100))}%`, background: '#1db97b', borderRadius: '2px' }} />
                      </div>
                      <span style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '9px', width: '54px', textAlign: 'right', flexShrink: 0 }}>{`${p.netPnlPct >= 0 ? '+' : ''}${p.netPnlPct.toFixed(1)}% / ${p.accountSize > 0 ? (p.profitTarget / p.accountSize * 100).toFixed(1) : '—'}%`}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '9px', width: '70px', flexShrink: 0 }}>Max DD</span>
                      <div style={{ flex: 1, height: '2px', background: '#1a1a1a', borderRadius: '2px' }}>
                        <div style={{ height: '2px', width: `${Math.max(0, Math.min(p.maxDDBarPct, 100))}%`, background: '#c03535', borderRadius: '2px' }} />
                      </div>
                      <span style={{ color: '#555', fontFamily: 'DM Mono, monospace', fontSize: '9px', width: '54px', textAlign: 'right', flexShrink: 0 }}>{`${p.maxDDUsedPct.toFixed(1)}% / ${p.maxDDLimitPct.toFixed(1)}%`}</span>
                    </div>
                  </div>

                  {/* Go to Dashboard */}
                  <button onClick={() => navigate(`/dashboard?account=${challenge.id}`)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '7px 14px', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', width: '100%' }}>
                    Go to Dashboard →
                  </button>

                </div>
              )
            })}
          </div>

        ) : (

          /* ── CARDS VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.map(challenge => {
              const trades = tradesByAccount[challenge.id] || []
              const s = computeStats(trades)
              const p = computeProgress(trades, challenge)
              const computedStatus = computeStatus(trades, challenge)
              const badge = statusBadge[computedStatus] || statusBadge.active

              const pnlColor = s.netPnl > 0 ? '#1db97b' : s.netPnl < 0 ? '#c03535' : '#fff'
              const pnlLabel = trades.length === 0 ? '$0.00'
                : `${s.netPnl >= 0 ? '+' : ''}$${Math.abs(s.netPnl).toFixed(2)}`

              return (
                <div key={challenge.id} style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <h2 style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {challenge.firm_name}
                        </h2>
                        <button onClick={() => setEditingChallenge(challenge)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '2px 4px', lineHeight: 1 }}>✏️</button>
                      </div>
                      <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: 0 }}>
                        {challenge.phase?.replace('_', ' ').toUpperCase()} · ${Number(challenge.account_size).toLocaleString()} · Started {challenge.start_date} · {s.total} trade{s.total !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span style={{ background: badge.bg, border: `0.5px solid ${badge.border}`, borderRadius: '6px', padding: '5px 12px', color: badge.color, fontFamily: 'DM Mono, monospace', fontSize: '12px', fontWeight: '600' }}>
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'P&L', value: pnlLabel, color: trades.length === 0 ? '#fff' : pnlColor },
                      { label: 'Win Rate', value: s.total === 0 ? '0%' : `${s.winRate.toFixed(1)}%`, color: '#fff' },
                      { label: 'Trades', value: String(s.total), color: '#fff' },
                      { label: 'W / L / BE', value: `${s.wins}W · ${s.losses}L · ${s.be}BE`, color: '#fff' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: '#0f0f0f', border: '0.5px solid #1a1a1a', borderRadius: '8px', padding: '14px' }}>
                        <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>{stat.label}</p>
                        <p style={{ color: stat.color, fontFamily: 'DM Mono, monospace', fontSize: '15px', margin: 0 }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <ProgressBlock
                      label={`Profit Target — ${p.maxDDLimitPct > 0 ? (parseFloat(challenge.profit_target) / parseFloat(challenge.account_size) * 100).toFixed(1) : '—'}%`}
                      barPct={p.profitPct}
                      barColor="#1db97b"
                      leftLabel={`${p.netPnlPct >= 0 ? '+' : ''}${p.netPnlPct.toFixed(2)}%`}
                      rightLabel={`target ${p.accountSize > 0 ? (p.profitTarget / p.accountSize * 100).toFixed(1) : '—'}%`}
                    />
                    <ProgressBlock
                      label={`Max Drawdown — ${p.maxDDLimitPct.toFixed(1)}%`}
                      barPct={p.maxDDBarPct}
                      barColor="#c03535"
                      leftLabel={`${p.maxDDUsedPct.toFixed(2)}%`}
                      rightLabel={`max ${p.maxDDLimitPct.toFixed(1)}%`}
                    />
                    <ProgressBlock
                      label={`Daily Drawdown — ${p.dailyDDLimitPct.toFixed(1)}%`}
                      barPct={p.dailyDDBarPct}
                      barColor="#c97a00"
                      leftLabel={`${p.dailyDDUsedPct.toFixed(2)}%`}
                      rightLabel={`max ${p.dailyDDLimitPct.toFixed(1)}%`}
                    />
                    <ProgressBlock
                      label={challenge.min_trading_days ? `Min Trading Days — Need ${challenge.min_trading_days}` : 'Min Trading Days'}
                      barPct={p.minDaysBarPct}
                      barColor="#4d9fff"
                      leftLabel={String(p.tradingDays)}
                      rightLabel={`need ${p.minDays || '—'}`}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => navigate(`/dashboard?account=${challenge.id}`)} style={{ background: 'transparent', border: '0.5px solid #1e1e1e', borderRadius: '6px', padding: '7px 14px', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer' }}>
                      Go to Dashboard →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <NewChallengeModal onClose={() => setShowModal(false)} onCreated={fetchChallenges} />
      )}

      {editingChallenge && (
        <EditChallengeModal
          challenge={editingChallenge}
          onClose={() => setEditingChallenge(null)}
          onSaved={fetchChallenges}
          onDeleted={fetchChallenges}
        />
      )}
    </div>
  )
}