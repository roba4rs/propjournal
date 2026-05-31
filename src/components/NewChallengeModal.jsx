import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const PHASE_LABELS = {
  phase_1: 'Phase 1',
  phase_2: 'Phase 2',
  phase_3: 'Phase 3',
  funded:  'Funded',
}

const TYPE_META = {
  instant:  { label: 'Instant',  desc: 'No evaluation' },
  '1-step': { label: '1-Step',   desc: 'One phase'     },
  '2-step': { label: '2-Step',   desc: 'Two phases'    },
  '3-step': { label: '3-Step',   desc: 'Three phases'  },
}

const TYPE_ORDER = ['instant', '1-step', '2-step', '3-step']

export default function NewChallengeModal({ onClose, onCreated }) {
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const [firms, setFirms]                   = useState([])
  const [presets, setPresets]               = useState([])
  const [availableTypes, setAvailableTypes] = useState([])
  const [availablePhases, setAvailablePhases] = useState([])
  const [autoFilled, setAutoFilled]         = useState(false)
  const [isMobile, setIsMobile]             = useState(window.innerWidth <= 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [selectedFirm,  setSelectedFirm]  = useState('')
  const [selectedType,  setSelectedType]  = useState(null)
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [firmOpen, setFirmOpen]           = useState(false)
  const [phaseOpen, setPhaseOpen]         = useState(false)
  const [keySearch, setKeySearch]         = useState('')

  // ── Keyboard navigation for firm dropdown ─────────────────
  useEffect(() => {
    if (!firmOpen) { setKeySearch(''); return }
    const handleKey = (e) => {
      const char = e.key.toLowerCase()
      if (char.length !== 1 || !/[a-z0-9]/.test(char)) return
      const newSearch = keySearch + char
      setKeySearch(newSearch)
      // Find first firm starting with typed chars
      const match = firms.find(f => f.toLowerCase().startsWith(newSearch))
      if (match) {
        // Scroll to it in the dropdown
        const el = document.getElementById('firm-item-' + match.replace(/\s+/g, '-'))
        if (el) el.scrollIntoView({ block: 'nearest' })
      } else {
        // No match for combo, reset to single char
        setKeySearch(char)
        const fallback = firms.find(f => f.toLowerCase().startsWith(char))
        if (fallback) {
          const el = document.getElementById('firm-item-' + fallback.replace(/\s+/g, '-'))
          if (el) el.scrollIntoView({ block: 'nearest' })
        }
      }
      // Reset search after 800ms of no typing
      clearTimeout(window._firmSearchTimer)
      window._firmSearchTimer = setTimeout(() => setKeySearch(''), 800)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [firmOpen, keySearch, firms])

  const [form, setForm] = useState({
    custom_firm:            '',
    account_size:           '',
    profit_target_pct:      '',
    max_drawdown_pct:       '',
    daily_drawdown_pct:     '',
    min_trading_days:       '',
    min_days_type:          null,
    min_profit_per_day_pct: '',
    start_date:             new Date().toISOString().split('T')[0],
  })

  // ── Load firm names on mount ───────────────────────────────
  useEffect(() => {
    const fetchFirms = async () => {
      const { data } = await supabase
        .from('firm_presets')
        .select('firm_name')
        .order('firm_name')
      if (data && data.length > 0) {
        const unique = [...new Set(data.map(r => r.firm_name))]
        setFirms(unique)
      }
    }
    fetchFirms()
  }, [])

  // ── Fetch all rows for selected firm ──────────────────────
  useEffect(() => {
    if (!selectedFirm || selectedFirm === 'Other') {
      setPresets([]); setAvailableTypes([]); setAvailablePhases([])
      setSelectedType(null); setSelectedPhase(null)
      return
    }
    const fetchPresets = async () => {
      const { data } = await supabase
        .from('firm_presets').select('*').eq('firm_name', selectedFirm)
      if (data) {
        setPresets(data)
        const types = TYPE_ORDER.filter(t => data.some(r => r.challenge_type === t))
        setAvailableTypes(types)
        setSelectedType(null); setSelectedPhase(null)
        setAvailablePhases([]); setAutoFilled(false)
        clearRuleFields()
      }
    }
    fetchPresets()
  }, [selectedFirm])

  // ── Derive phases when type selected ──────────────────────
  useEffect(() => {
    if (!selectedType || !presets.length) return
    const phaseOrder = ['phase_1', 'phase_2', 'phase_3', 'funded']
    const phases = phaseOrder.filter(p =>
      presets.some(r => r.challenge_type === selectedType && r.phase === p)
    )
    setAvailablePhases(phases)
    setSelectedPhase(phases[0] || null)
  }, [selectedType, presets])

  // ── Auto-fill rules ────────────────────────────────────────
  useEffect(() => {
    if (!selectedFirm || selectedFirm === 'Other' || !selectedType || !selectedPhase) return
    const row = presets.find(
      r => r.challenge_type === selectedType && r.phase === selectedPhase
    )
    if (!row) return
    setForm(prev => ({
      ...prev,
      profit_target_pct:  row.profit_target_pct  != null ? String(row.profit_target_pct)  : '',
      max_drawdown_pct:   row.max_drawdown_pct    != null ? String(row.max_drawdown_pct)   : '',
      daily_drawdown_pct: row.daily_drawdown_pct  != null ? String(row.daily_drawdown_pct) : '',
      min_trading_days:   row.min_trading_days    != null ? String(row.min_trading_days)   : '',
      min_days_type:      row.min_days_type || null,
    }))
    setAutoFilled(true)
  }, [selectedPhase, selectedType]) // eslint-disable-line react-hooks/exhaustive-deps

  const clearRuleFields = () => {
    setForm(prev => ({
      ...prev,
      profit_target_pct: '', max_drawdown_pct: '',
      daily_drawdown_pct: '', min_trading_days: '',
      min_days_type: null, min_profit_per_day_pct: '',
    }))
    setAutoFilled(false)
  }

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const accountSize        = parseFloat(form.account_size)       || 0
  const profitTargetDollar = (parseFloat(form.profit_target_pct) || 0) / 100 * accountSize
  const maxDDDollar        = (parseFloat(form.max_drawdown_pct)  || 0) / 100 * accountSize
  const dailyDDDollar      = (parseFloat(form.daily_drawdown_pct)|| 0) / 100 * accountSize
  const fmt = n => n > 0 ? `$${Math.round(n).toLocaleString()}` : null

  const handleSubmit = async () => {
    const firmName = selectedFirm === 'Other' ? form.custom_firm : selectedFirm
    const missingBase = !firmName || !form.account_size || !form.daily_drawdown_pct
    const missingChallenge = !isFunded && (!form.profit_target_pct || !form.max_drawdown_pct)
    if (missingBase || missingChallenge) {
      setError('Please fill in all required fields'); return
    }
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const phaseLabel = selectedPhase ? (PHASE_LABELS[selectedPhase] || selectedPhase) : 'Phase 1'
      const { error: insertError } = await supabase.from('accounts').insert({
        user_id:          session.user.id,
        type:             'challenge',
        name:             `${firmName} — ${phaseLabel}`,
        firm_name:        firmName,
        phase:            selectedPhase || 'phase_1',
        account_size:     accountSize,
        profit_target:    profitTargetDollar,
        max_drawdown:     maxDDDollar,
        daily_drawdown:   dailyDDDollar,
        min_trading_days: parseInt(form.min_trading_days) || null,
        start_date:       form.start_date,
        status:           'active',
      })
      if (insertError) throw insertError
      onCreated(); onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isOther   = selectedFirm === 'Other'
  const isFunded  = selectedPhase === 'funded'
  const canCreate = (isOther ? form.custom_firm : selectedFirm) &&
    form.account_size && form.daily_drawdown_pct &&
    (isFunded || (form.profit_target_pct && form.max_drawdown_pct))

  // ── Shared style primitives ────────────────────────────────
  const label = {
    display: 'block', color: '#777',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '11px', marginBottom: '6px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }
  const input = {
    width: '100%', background: '#0d0d0d',
    border: '0.5px solid #1e1e1e', borderRadius: '8px',
    padding: '9px 12px', color: '#fff',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box',
  }
  const selectTrigger = (active) => ({
    width: '100%', background: '#0d0d0d',
    border: `0.5px solid ${active ? '#1db97b' : '#1e1e1e'}`,
    borderRadius: '8px', padding: '9px 12px',
    color: active ? '#fff' : '#666',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
    cursor: 'pointer', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    boxSizing: 'border-box',
  })
  const dropdown = {
    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
    background: '#161616', border: '0.5px solid #2a2a2a',
    borderRadius: '8px', zIndex: 20, overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  }
  const dropItem = (sel) => ({
    padding: '9px 12px', cursor: 'pointer',
    color: sel ? '#1db97b' : '#bbb',
    background: sel ? '#0f2219' : 'transparent',
    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
  })
  const pill = (active) => ({
    flex: 1, background: active ? '#0c1f16' : '#0d0d0d',
    border: `0.5px solid ${active ? '#1db97b' : '#1e1e1e'}`,
    borderRadius: '8px', padding: '8px 6px',
    color: active ? '#1db97b' : '#666',
    fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
    textAlign: 'center', cursor: 'pointer',
  })
  const hintGreen = { color: '#1db97b', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '4px' }
  const hintRed   = { color: '#c03535', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '4px' }
  const hintBlue  = { color: '#4d9fff', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '4px' }

  const divider = {
    width: '0.5px', background: '#1a1a1a',
    alignSelf: 'stretch', margin: '0 4px',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: isMobile ? '12px' : '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#111', border: '0.5px solid #1e1e1e',
        borderRadius: isMobile ? '10px' : '14px', width: '100%', maxWidth: isMobile ? '100%' : '860px',
        overflow: 'hidden',
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '0.5px solid #1a1a1a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{
              color: '#fff', fontFamily: 'Syne, sans-serif',
              fontSize: '16px', fontWeight: '600', margin: 0,
            }}>New Challenge</h2>
            {autoFilled && (
              <span style={{
                background: '#0f2219', border: '0.5px solid #1a3826',
                borderRadius: '20px', padding: '3px 10px',
                color: '#1db97b', fontFamily: 'DM Sans, sans-serif', fontSize: '11px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span>✓</span> Auto-filled from {selectedFirm}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: isMobile ? 'auto' : '360px', maxHeight: isMobile ? '60vh' : 'none', overflowY: isMobile ? 'auto' : 'visible' }}>

          {/* LEFT — firm config */}
          <div style={{ flex: isMobile ? '1' : '0 0 300px', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Section label */}
            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Firm Setup
            </p>

            {/* Firm dropdown */}
            <div>
              <label style={label}>Prop Firm</label>
              <div style={{ position: 'relative' }}>
                <div
                  style={selectTrigger(!!selectedFirm)}
                  onClick={() => { setFirmOpen(o => !o); setPhaseOpen(false) }}
                >
                  <span>{selectedFirm || 'Select firm'}</span>
                  <span style={{ color: '#666', fontSize: '9px' }}>{firmOpen ? '▲' : '▼'}</span>
                </div>
                {firmOpen && (
                  <div style={{ ...dropdown, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
                      {firms.map(f => {
                        const isMatch = keySearch && f.toLowerCase().startsWith(keySearch)
                        return (
                          <div
                            key={f}
                            id={'firm-item-' + f.replace(/\s+/g, '-')}
                            style={{
                              ...dropItem(selectedFirm === f),
                              background: isMatch ? '#1a2e20' : selectedFirm === f ? '#0f2219' : 'transparent',
                              color: isMatch ? '#fff' : selectedFirm === f ? '#1db97b' : '#bbb',
                            }}
                            onClick={() => { setSelectedFirm(f); setFirmOpen(false) }}
                            onMouseEnter={e => { if (selectedFirm !== f) e.currentTarget.style.background = '#1e1e1e' }}
                            onMouseLeave={e => { e.currentTarget.style.background = isMatch ? '#1a2e20' : selectedFirm === f ? '#0f2219' : 'transparent' }}
                          >{f}</div>
                        )
                      })}
                    </div>
                    <div style={{ ...dropItem(selectedFirm === 'Other'), borderTop: '0.5px solid #2a2a2a', flexShrink: 0 }}
                      onClick={() => { setSelectedFirm('Other'); setFirmOpen(false) }}
                      onMouseEnter={e => { if (selectedFirm !== 'Other') e.currentTarget.style.background = '#1e1e1e' }}
                      onMouseLeave={e => { if (selectedFirm !== 'Other') e.currentTarget.style.background = 'transparent' }}
                    >+ Other (manual entry)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom firm */}
            {isOther && (
              <div>
                <label style={label}>Firm Name</label>
                <input name="custom_firm" type="text" placeholder="e.g. Alpha Capital"
                  value={form.custom_firm} onChange={handleChange} style={input} />
              </div>
            )}

            {/* Challenge type pills */}
            {!isOther && !isFunded && availableTypes.length > 0 && (
              <div>
                <label style={label}>Challenge Type</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {availableTypes.map(t => (
                    <button key={t} onClick={() => setSelectedType(t)} style={pill(selectedType === t)}>
                      <span style={{ display: 'block', fontWeight: '600', fontSize: '12px' }}>{TYPE_META[t]?.label || t}</span>
                      <span style={{ display: 'block', fontSize: '10px', color: selectedType === t ? '#1db97b88' : '#555', marginTop: '2px' }}>
                        {TYPE_META[t]?.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Phase */}
            <div>
              <label style={label}>Phase</label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    ...selectTrigger(!!selectedPhase),
                    opacity: (!isOther && !selectedType) ? 0.35 : 1,
                    cursor:  (!isOther && !selectedType) ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (!isOther && !selectedType) return
                    setPhaseOpen(o => !o); setFirmOpen(false)
                  }}
                >
                  <span>{selectedPhase ? PHASE_LABELS[selectedPhase] : (isOther ? 'Phase 1' : '—')}</span>
                  <span style={{ color: '#666', fontSize: '9px' }}>{phaseOpen ? '▲' : '▼'}</span>
                </div>
                {phaseOpen && (
                  <div style={dropdown}>
                    {(isOther ? ['phase_1','phase_2','phase_3','funded'] : availablePhases).map(p => (
                      <div key={p} style={dropItem(selectedPhase === p)}
                        onClick={() => { setSelectedPhase(p); setPhaseOpen(false) }}
                        onMouseEnter={e => { if (selectedPhase !== p) e.currentTarget.style.background = '#1e1e1e' }}
                        onMouseLeave={e => { if (selectedPhase !== p) e.currentTarget.style.background = 'transparent' }}
                      >{PHASE_LABELS[p]}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Start date */}
            <div>
              <label style={label}>Start Date</label>
              <input name="start_date" type="date"
                value={form.start_date} onChange={handleChange} style={input} />
            </div>

          </div>

          {/* Divider */}
          {!isMobile && <div style={divider} />}

          {/* RIGHT — account size + rules */}
          <div style={{ flex: 1, padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: isMobile ? '0.5px solid #1a1a1a' : 'none' }}>

            <p style={{ color: '#555', fontFamily: 'DM Sans, sans-serif', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Account & Rules
            </p>

            {/* Account size */}
            <div>
              <label style={label}>Account Size ($)</label>
              <input name="account_size" type="number" placeholder="100000"
                value={form.account_size} onChange={handleChange} style={{ ...input, fontSize: '15px', fontFamily: 'DM Mono, monospace' }} />
            </div>

            {/* Rules grid */}
            <div style={{
              background: '#0d0d0d', border: '0.5px solid #1a1a1a',
              borderRadius: '10px', padding: '14px',
              opacity: (autoFilled || isOther) ? 1 : 0.4,
              transition: 'opacity 0.25s', flex: 1,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '12px',
              }}>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: (autoFilled || isOther) ? '#1db97b' : '#2a2a2a',
                  transition: 'background 0.2s', flexShrink: 0,
                }} />
                <span style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Challenge Rules
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

                <div>
                  <label style={label}>Profit Target (%)</label>
                  <input name="profit_target_pct" type="number" placeholder="—"
                    value={form.profit_target_pct} onChange={handleChange} style={input} />
                  {fmt(profitTargetDollar) && <p style={hintGreen}>{fmt(profitTargetDollar)}</p>}
                </div>

                <div>
                  <label style={label}>Max Drawdown (%)</label>
                  <input name="max_drawdown_pct" type="number" placeholder="—"
                    value={form.max_drawdown_pct} onChange={handleChange} style={input} />
                  {fmt(maxDDDollar) && <p style={hintRed}>{fmt(maxDDDollar)}</p>}
                </div>

                <div>
                  <label style={label}>Daily Drawdown (%)</label>
                  <input name="daily_drawdown_pct" type="number" placeholder="—"
                    value={form.daily_drawdown_pct} onChange={handleChange} style={input} />
                  {fmt(dailyDDDollar) && <p style={hintRed}>{fmt(dailyDDDollar)}</p>}
                </div>

                <div>
                  <label style={label}>Min Trading Days</label>
                  <input name="min_trading_days" type="number" placeholder="—"
                    value={form.min_trading_days} onChange={handleChange} style={input} />
                  {form.min_days_type && (
                    <p style={hintBlue}>
                      {form.min_days_type === 'profitable' ? 'Profitable days' : 'Any trading days'}
                    </p>
                  )}
                </div>

              </div>

              {/* Profitable day min % */}
              {form.min_days_type === 'profitable' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={label}>Min profit per day (%) — if required</label>
                  <input name="min_profit_per_day_pct" type="number" placeholder="0.5"
                    value={form.min_profit_per_day_pct} onChange={handleChange} style={input} />
                  {form.min_profit_per_day_pct && accountSize > 0 && (
                    <p style={hintGreen}>
                      = ${((parseFloat(form.min_profit_per_day_pct) / 100) * accountSize).toLocaleString()} / day
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            margin: '0 22px', background: '#1e0d0d',
            border: '0.5px solid #2e1515', borderRadius: '8px',
            padding: '10px 12px', color: '#c03535',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
          }}>{error}</div>
        )}

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', gap: '10px', padding: '16px 22px',
          borderTop: '0.5px solid #1a1a1a',
        }}>
          <button onClick={onClose} style={{
            flex: 1, background: 'transparent',
            border: '0.5px solid #1e1e1e', borderRadius: '8px',
            padding: '10px', color: '#777',
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !canCreate} style={{
            flex: 3, background: canCreate ? '#1db97b' : '#0f2219',
            border: 'none', borderRadius: '8px', padding: '10px',
            color: canCreate ? '#000' : '#1db97b44',
            fontFamily: 'DM Sans, sans-serif', fontWeight: '600',
            fontSize: '13px', cursor: (loading || !canCreate) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}>{loading ? 'Creating...' : 'Create Challenge'}</button>
        </div>

      </div>
    </div>
  )
}
