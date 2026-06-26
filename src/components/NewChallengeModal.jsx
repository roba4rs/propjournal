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

  const [selectedFirm,    setSelectedFirm]    = useState('')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [selectedType,    setSelectedType]    = useState(null)
  const [selectedPhase,   setSelectedPhase]   = useState(null)
  const [firmOpen,  setFirmOpen]              = useState(false)
  const [programOpen, setProgramOpen]         = useState(false)
  const [phaseOpen, setPhaseOpen]             = useState(false)
  const [keySearch, setKeySearch]             = useState('')

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
        setSelectedProgram(null)
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
      presets.some(r =>
        r.challenge_type === selectedType &&
        r.phase === p &&
        (programs.length <= 1 || r.program === selectedProgram)
      )
    )
    setAvailablePhases(phases)
    setSelectedPhase(phases[0] || null)
  }, [selectedType, presets, selectedProgram]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-fill rules ────────────────────────────────────────
  useEffect(() => {
    if (!selectedFirm || selectedFirm === 'Other' || !selectedType || !selectedPhase) return
    const row = presets.find(
      r => r.challenge_type === selectedType && r.phase === selectedPhase &&
        (programs.length <= 1 || r.program === selectedProgram)
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

  // Distinct non-null programs for the selected firm
  const programs = [...new Set(presets.map(r => r.program).filter(Boolean))]

  // Re-derive available types when program is selected
  const filteredTypes = programs.length > 1 && selectedProgram
    ? TYPE_ORDER.filter(t => presets.some(r => r.challenge_type === t && r.program === selectedProgram))
    : availableTypes
  const canCreate = (isOther ? form.custom_firm : selectedFirm) &&
    form.account_size && form.daily_drawdown_pct &&
    (isFunded || (form.profit_target_pct && form.max_drawdown_pct))

  // ── Shared style primitives ────────────────────────────────
  const ff  = 'DM Sans, sans-serif'
  const ffm = 'DM Mono, monospace'
  const label = { display: 'block', color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '10.5px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em' }
  const input = { width: '100%', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)', fontFamily: ff, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const dropdown = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface-2)', border: '0.5px solid var(--border-color-2)', borderRadius: '8px', zIndex: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }
  const dropItem = (sel) => ({ padding: '9px 12px', cursor: 'pointer', color: sel ? 'var(--brand)' : 'var(--text-soft)', background: sel ? 'var(--green-bg)' : 'transparent', fontFamily: ff, fontSize: '13px' })
  const pill = (active) => ({ flex: 1, background: active ? 'var(--green-bg)' : 'var(--bg-page)', border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '8px 6px', color: active ? 'var(--brand)' : 'var(--text-faint-2)', fontFamily: ff, fontSize: '12px', textAlign: 'center', cursor: 'pointer' })
  const hintGreen = { color: 'var(--brand)', fontFamily: ffm, fontSize: '11px', marginTop: '4px' }
  const hintRed   = { color: 'var(--red)',   fontFamily: ffm, fontSize: '11px', marginTop: '4px' }
  const hintBlue  = { color: 'var(--blue)',  fontFamily: ffm, fontSize: '11px', marginTop: '4px' }
  const sectionBadge = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }
  const badgeNum = { width: '20px', height: '20px', borderRadius: '6px', border: '0.5px solid var(--border-color-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint-2)', fontFamily: ffm, fontSize: '10px', flexShrink: 0 }
  const badgeText = { color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.08em' }
  const ruleCard = (icon, title, value, unit, hint, hintStyle) => (
    <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px' }}>{icon}</span>
        <span style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <input name={value[0]} type="number" placeholder="—" value={value[1]} onChange={handleChange}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: ffm, fontSize: '22px', fontWeight: '600', width: '100%', padding: 0 }} />
        <span style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '12px', flexShrink: 0 }}>{unit}</span>
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  )

  const SIZE_PRESETS = [10000, 25000, 50000, 100000, 200000]
  const fmtSize = n => n >= 1000 ? `$${n/1000}K` : `$${n}`

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '12px' : '24px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: isMobile ? '10px' : '14px', width: '100%', maxWidth: isMobile ? '100%' : '860px', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '0.5px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏆</div>
            <div>
              <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: '700', margin: 0 }}>New Challenge</h2>
              <p style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '12px', margin: 0, marginTop: '1px' }}>Set up a prop firm evaluation and track every rule.</p>
            </div>
            {autoFilled && (
              <span style={{ background: 'var(--green-bg)', border: '0.5px solid var(--green-bg-2)', borderRadius: '20px', padding: '3px 10px', color: 'var(--brand)', fontFamily: ff, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✓</span> Auto-filled from {selectedFirm}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint-2)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', maxHeight: isMobile ? '65vh' : '520px', overflowY: isMobile ? 'auto' : 'visible' }}>

          {/* LEFT */}
          <div style={{ flex: isMobile ? '1' : '0 0 300px', padding: '20px 18px', display: 'flex', flexDirection: 'column', overflowY: isMobile ? 'visible' : 'auto' }}>
            <div style={sectionBadge}>
              <div style={badgeNum}>01</div>
              <span style={badgeText}>Firm Setup</span>
            </div>

            {/* Prop Firm dropdown */}
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Prop Firm</label>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '100%', background: 'var(--bg-page)', border: `0.5px solid ${selectedFirm ? 'var(--brand)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '10px 13px', color: selectedFirm ? 'var(--text-primary)' : 'var(--text-faint-2)', fontFamily: ff, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}
                  onClick={() => { setFirmOpen(o => !o); setPhaseOpen(false); setProgramOpen(false) }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>🏛</span>
                    <span style={{ fontWeight: selectedFirm ? '600' : '400' }}>{selectedFirm || 'Select firm'}</span>
                  </span>
                  <span style={{ color: 'var(--text-faint-2)', fontSize: '9px' }}>{firmOpen ? '▲' : '▼'}</span>
                </div>
                {firmOpen && (
                  <div style={{ ...dropdown, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
                      {firms.map(f => {
                        const isMatch = keySearch && f.toLowerCase().startsWith(keySearch)
                        const sel = selectedFirm === f
                        return (
                          <div key={f} id={'firm-item-' + f.replace(/\s+/g, '-')}
                            style={{ padding: '9px 13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isMatch ? 'var(--green-bg-2)' : sel ? 'var(--green-bg)' : 'transparent', color: sel ? 'var(--brand)' : 'var(--text-soft)', fontFamily: ff, fontSize: '13px' }}
                            onClick={() => { setSelectedFirm(f); setFirmOpen(false) }}
                            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--border-color)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = isMatch ? 'var(--green-bg-2)' : sel ? 'var(--green-bg)' : 'transparent' }}
                          >
                            <span>{f}</span>
                            {sel && <span style={{ color: 'var(--brand)' }}>✓</span>}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ padding: '9px 13px', cursor: 'pointer', color: selectedFirm === 'Other' ? 'var(--brand)' : 'var(--text-faint-2)', background: selectedFirm === 'Other' ? 'var(--green-bg)' : 'transparent', fontFamily: ff, fontSize: '13px', borderTop: '0.5px solid var(--border-color-2)' }}
                      onClick={() => { setSelectedFirm('Other'); setFirmOpen(false) }}
                      onMouseEnter={e => { if (selectedFirm !== 'Other') e.currentTarget.style.background = 'var(--border-color)' }}
                      onMouseLeave={e => { if (selectedFirm !== 'Other') e.currentTarget.style.background = 'transparent' }}
                    >+ Other (manual entry)</div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom firm */}
            {isOther && (
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Firm Name</label>
                <input name="custom_firm" type="text" placeholder="e.g. Alpha Capital" value={form.custom_firm} onChange={handleChange} style={input} />
              </div>
            )}

            {/* Program dropdown */}
            {!isOther && programs.length > 1 && (
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Program</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '100%', background: 'var(--bg-page)', border: `0.5px solid ${selectedProgram ? 'var(--brand)' : 'var(--border-color)'}`, borderRadius: '8px', padding: '9px 12px', color: selectedProgram ? 'var(--text-primary)' : 'var(--text-faint-2)', fontFamily: ff, fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}
                    onClick={() => { setProgramOpen(o => !o); setFirmOpen(false); setPhaseOpen(false) }}>
                    <span>{selectedProgram || 'Select program'}</span>
                    <span style={{ color: 'var(--text-faint-2)', fontSize: '9px' }}>{programOpen ? '▲' : '▼'}</span>
                  </div>
                  {programOpen && (
                    <div style={dropdown}>
                      {programs.map(p => (
                        <div key={p} style={dropItem(selectedProgram === p)}
                          onClick={() => { setSelectedProgram(p); setSelectedType(null); setSelectedPhase(null); setAvailablePhases([]); clearRuleFields(); setProgramOpen(false) }}
                          onMouseEnter={e => { if (selectedProgram !== p) e.currentTarget.style.background = 'var(--border-color)' }}
                          onMouseLeave={e => { if (selectedProgram !== p) e.currentTarget.style.background = 'transparent' }}
                        >{p}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Challenge type pills */}
            {!isOther && !isFunded && filteredTypes.length > 0 && (programs.length <= 1 || selectedProgram) && (
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Challenge Type</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {filteredTypes.map(t => (
                    <button key={t} onClick={() => setSelectedType(t)} style={pill(selectedType === t)}>
                      <span style={{ display: 'block', fontWeight: '600', fontSize: '12px' }}>{TYPE_META[t]?.label || t}</span>
                      <span style={{ display: 'block', fontSize: '10px', color: selectedType === t ? 'rgba(var(--brand-rgb), 0.53)' : 'var(--text-faint-2)', marginTop: '2px' }}>{TYPE_META[t]?.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Phase — segmented tabs */}
            {(() => {
              const phaseList = isOther ? ['phase_1','phase_2','phase_3','funded'] : availablePhases
              const disabled = !isOther && !selectedType
              const PHASE_DESC = { phase_1: 'Phase 1 evaluation', phase_2: 'Phase 2 evaluation', phase_3: 'Phase 3 evaluation', funded: 'Live capital' }
              return phaseList.length > 0 ? (
                <div style={{ marginBottom: '14px', opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
                  <label style={label}>Phase</label>
                  <div style={{ display: 'flex', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                    {phaseList.map((p, i) => {
                      const active = selectedPhase === p
                      return (
                        <div key={p} onClick={() => setSelectedPhase(p)}
                          style={{ flex: 1, padding: '10px 6px', textAlign: 'center', cursor: 'pointer', background: active ? 'var(--green-bg)' : 'transparent', borderRight: i < phaseList.length - 1 ? '0.5px solid var(--border-color)' : 'none', transition: 'background 0.15s' }}
                        >
                          <div style={{ color: active ? 'var(--brand)' : 'var(--text-soft)', fontFamily: ff, fontSize: '12px', fontWeight: active ? '700' : '500' }}>{PHASE_LABELS[p]}</div>
                          <div style={{ color: active ? 'rgba(var(--brand-rgb),0.6)' : 'var(--text-faint-2)', fontFamily: ff, fontSize: '10px', marginTop: '2px' }}>{PHASE_DESC[p]}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null
            })()}

            {/* Start date */}
            <div>
              <label style={label}>Start Date</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} style={input} />
              <p style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📅</span> Trading days count starts from this date.
              </p>
            </div>
          </div>

          {/* Divider */}
          {!isMobile && <div style={{ width: '0.5px', background: 'var(--border-color)', alignSelf: 'stretch' }} />}

          {/* RIGHT */}
          <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', overflowY: isMobile ? 'visible' : 'auto', borderTop: isMobile ? '0.5px solid var(--border-color)' : 'none' }}>
            <div style={sectionBadge}>
              <div style={badgeNum}>02</div>
              <span style={badgeText}>Account & Rules</span>
            </div>

            {/* Account size */}
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Account Size</label>
              {/* Quick presets */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {SIZE_PRESETS.map(s => {
                  const active = parseInt(form.account_size) === s
                  return (
                    <button key={s} onClick={() => setForm(f => ({ ...f, account_size: String(s) }))}
                      style={{ background: active ? 'var(--brand)' : 'var(--bg-page)', border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border-color)'}`, borderRadius: '7px', padding: '5px 10px', color: active ? 'var(--brand-fg)' : 'var(--text-faint-2)', fontFamily: ffm, fontSize: '11px', cursor: 'pointer', fontWeight: active ? '700' : '400' }}>
                      {fmtSize(s)}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '9px 12px', gap: '8px' }}>
                <span style={{ color: 'var(--text-faint-2)', fontFamily: ffm, fontSize: '14px' }}>$</span>
                <input name="account_size" type="number" placeholder="100000" value={form.account_size} onChange={handleChange}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: ffm, fontSize: '15px', fontWeight: '600' }} />
                <span style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '12px' }}>USD</span>
              </div>
            </div>

            {/* Rules grid */}
            <div style={{ opacity: (autoFilled || isOther) ? 1 : 0.4, transition: 'opacity 0.25s', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: (autoFilled || isOther) ? 'var(--brand)' : 'var(--border-color-2)', transition: 'background 0.2s', flexShrink: 0, display: 'block' }} />
                  <span style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Challenge Rules</span>
                </div>
                {autoFilled && <span style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '10.5px' }}>Auto-filled from preset</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {ruleCard('🎯', 'Profit Target', ['profit_target_pct', form.profit_target_pct], '%', fmt(profitTargetDollar), hintGreen)}
                {ruleCard('📉', 'Max Drawdown', ['max_drawdown_pct', form.max_drawdown_pct], '%', fmt(maxDDDollar), hintRed)}
                {ruleCard('🛡', 'Daily Drawdown', ['daily_drawdown_pct', form.daily_drawdown_pct], '%', fmt(dailyDDDollar), hintRed)}
                {ruleCard('📅', 'Min Trading Days', ['min_trading_days', form.min_trading_days], 'days',
                  form.min_days_type ? (form.min_days_type === 'profitable' ? 'Profitable days' : 'Any trading days') : null, hintBlue)}
              </div>

              {/* Profitable day min % */}
              {form.min_days_type === 'profitable' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={label}>Min profit per day (%) — if required</label>
                  <input name="min_profit_per_day_pct" type="number" placeholder="0.5" value={form.min_profit_per_day_pct} onChange={handleChange} style={input} />
                  {form.min_profit_per_day_pct && accountSize > 0 && (
                    <p style={hintGreen}>= ${((parseFloat(form.min_profit_per_day_pct) / 100) * accountSize).toLocaleString()} / day</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ margin: '0 22px', background: 'var(--red-bg-2)', border: '0.5px solid var(--red-bg)', borderRadius: '8px', padding: '10px 12px', color: 'var(--red)', fontFamily: ff, fontSize: '13px' }}>{error}</div>
        )}

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '0.5px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '11px', margin: 0 }}>You can edit these settings anytime after creation.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '10px 20px', color: 'var(--text-faint-2)', fontFamily: ff, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !canCreate} style={{ background: canCreate ? 'var(--brand)' : 'var(--green-bg)', border: 'none', borderRadius: '8px', padding: '10px 28px', color: canCreate ? 'var(--brand-fg)' : 'rgba(var(--brand-rgb), 0.27)', fontFamily: ff, fontWeight: '700', fontSize: '13px', cursor: (loading || !canCreate) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>{loading ? 'Creating...' : 'Create Challenge'}</button>
          </div>
        </div>

      </div>
    </div>
  )
}