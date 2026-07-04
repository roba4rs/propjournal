import { useEffect, useState, useCallback, useRef } from 'react'
import { CalendarClock, Plus, ChevronRight, X, Shuffle, Trash2, Pencil } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'
import { generateCycle, deriveSecondaryDays } from '../utils/scheduleGenerator'

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const DAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Local (NOT UTC) YYYY-MM-DD key. toISOString() converts to UTC first, which
// silently shifts the date back a day for any timezone ahead of UTC (e.g.
// UTC+3) — this is what was causing tomorrow's cell to be marked "today".
// Always use this instead of .toISOString().slice(0, 10) for same-day checks.
function localDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Actual calendar date for a given cell — weekIndex 0-3, dayIndex 0-6 (mon=0..sun=6),
// anchored to the cycle's real cycle_start_date (always a Monday). This is what
// turns the grid from a generic "Mon/Tue/Wed" pattern into a live calendar.
function dateForCell(cycleStartDate, weekIndex, dayIndex) {
  if (!cycleStartDate) return null
  const start = new Date(`${cycleStartDate}T00:00:00`)
  const dt = new Date(start)
  dt.setDate(start.getDate() + weekIndex * 7 + dayIndex)
  return dt
}

// "Jun 29–Jul 3" style range for a single week row (Mon→Fri).
function weekRangeLabel(cycleStartDate, weekIndex) {
  const start = dateForCell(cycleStartDate, weekIndex, 0)
  const end = dateForCell(cycleStartDate, weekIndex, 4)
  if (!start || !end) return ''
  const sameMonth = start.getMonth() === end.getMonth()
  return sameMonth
    ? `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}–${end.getDate()}`
    : `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`
}

// "JUL 2026" / "JUN–JUL 2026" / "DEC 2026 – JAN 2027" for the full 4-week cycle span.
function formatCycleRangeLabel(cycleStartDate) {
  if (!cycleStartDate) return ''
  const start = new Date(`${cycleStartDate}T00:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + 27)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const sameYear = start.getFullYear() === end.getFullYear()
  if (sameMonth) return `${MONTHS_SHORT[start.getMonth()].toUpperCase()} ${start.getFullYear()}`
  if (sameYear) return `${MONTHS_SHORT[start.getMonth()].toUpperCase()}–${MONTHS_SHORT[end.getMonth()].toUpperCase()} ${start.getFullYear()}`
  return `${MONTHS_SHORT[start.getMonth()].toUpperCase()} ${start.getFullYear()} – ${MONTHS_SHORT[end.getMonth()].toUpperCase()} ${end.getFullYear()}`
}

// Most recent/upcoming Monday (today if today is already Monday) — used as
// the new cycle's start date.
function nextCycleStartDate() {
  const d = new Date()
  const day = d.getDay() // 0 = Sun ... 6 = Sat
  const diff = day === 1 ? 0 : (8 - day) % 7
  d.setDate(d.getDate() + diff)
  return localDateKey(d)
}

// Trading-eligible weekdays (used for the rotation logic / pattern generator).
const ALL_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
// Full calendar week shown in the grids — Sat/Sun included for context only,
// never part of primary_days/secondary_days and never selectable as trading days.
const ALL_CALENDAR_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
// Real day offset from the cycle's anchor Monday for each column — NOT the
// same as position in ALL_CALENDAR_DAYS above, since Sunday is shown first
// (matching CalendarPnL's Sun-Sat layout) but is chronologically the day
// BEFORE that row's Monday, and Saturday is the day AFTER Friday.
const DAY_OFFSET = { sun: -1, mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5 }

// Latest cycle for a pairing (only ever one today — cycle rollover isn't
// built yet — but this picks the highest cycle_number to be safe).
function latestCycle(p) {
  const cycles = p?.schedule_cycles || []
  if (cycles.length === 0) return null
  return cycles.reduce((a, b) => (b.cycle_number > a.cycle_number ? b : a))
}

// Where "today" falls inside a cycle, given the cycle's start date (always a
// Monday). Returns null if there's no start date, otherwise one of:
//   { state: 'before', daysUntil }
//   { state: 'during', weekIndex (0-3), dayKey }
//   { state: 'after' }
// weekIndex/dayKey are used to highlight the current cell in the grids below.
function getCycleStatus(cycleStartDate) {
  if (!cycleStartDate) return null
  const start = new Date(`${cycleStartDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - start) / 86400000)
  if (diffDays < 0) return { state: 'before', daysUntil: -diffDays }
  if (diffDays >= 28) return { state: 'after' }
  const weekIndex = Math.floor(diffDays / 7)
  const dayKey = ALL_CALENDAR_DAYS[diffDays % 7]
  return { state: 'during', weekIndex, dayKey }
}

// Compact stacked row — used on mobile (portrait modal). cycleStartDate (the
// cycle's real anchor Monday) lets each cell show its actual calendar date,
// and drives "today" highlighting directly off the real date rather than an
// index match — a live calendar, not a generic weekday pattern.
function WeekRow({ weekNumber, week, showSecondary, cycleStartDate = null }) {
  const todayStr = localDateKey(new Date())
  const rangeLabel = cycleStartDate ? weekRangeLabel(cycleStartDate, weekNumber - 1) : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '0.5px solid var(--border-color)' }}>
      <span style={{ width: '46px', flexShrink: 0 }}>
        <span style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-faint-2)', fontWeight: '400' }}>
          Wk{weekNumber}
        </span>
        {rangeLabel && (
          <span style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: '8.5px', color: 'var(--text-faint-2)', opacity: 0.65, marginTop: '1px' }}>
            {rangeLabel}
          </span>
        )}
      </span>
      <div style={{ display: 'flex', gap: '3px' }}>
        {ALL_CALENDAR_DAYS.map((d) => {
          const isWeekend = d === 'sat' || d === 'sun'
          const isPrimary = !isWeekend && week.primary_days.includes(d)
          const isSecondary = !isWeekend && showSecondary && week.secondary_days.includes(d)
          const isOff = !isPrimary && !isSecondary
          const cellDate = dateForCell(cycleStartDate, weekNumber - 1, DAY_OFFSET[d])
          const isToday = !!cellDate && localDateKey(cellDate) === todayStr
          const bg = isPrimary ? 'var(--green-bg)' : isSecondary ? 'var(--blue-bg-2)' : 'var(--bg-surface-2)'
          const color = isPrimary ? 'var(--brand)' : isSecondary ? 'var(--blue)' : 'var(--text-faint-2)'
          const border = isToday ? 'var(--brand)' : isPrimary ? 'var(--green-bg-2)' : isSecondary ? 'var(--blue-bg)' : 'var(--border-color-2)'
          return (
            <span key={d} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
              minWidth: '28px', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', padding: '3px 5px',
              borderRadius: '4px', background: bg, color,
              border: `${isToday ? '1.5px' : '0.5px'} solid ${border}`,
              opacity: isWeekend ? 0.35 : isOff ? 0.55 : 1,
            }}>
              <span style={{ lineHeight: 1 }}>{DAY_LABELS[d]}</span>
              {cellDate && <span style={{ fontSize: '8.5px', opacity: 0.75, lineHeight: 1 }}>{cellDate.getDate()}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Bigger calendar-style grid — used on desktop (landscape modal). Full
// Mon-Sun columns x 4 week rows (Sat/Sun shown muted, calendar-only — never
// trading days) so the preview reads as a real calendar. cycleStartDate (the
// cycle's real anchor Monday) gives every cell its actual calendar date and
// drives "today" highlighting off the real date rather than an index match.
function CycleGrid({ weeks, showSecondary, cycleStartDate = null }) {
  const todayStr = localDateKey(new Date())
  const cells = []

  cells.push(<div key="hdr-blank" />)
  ALL_CALENDAR_DAYS.forEach((d) => {
    const isWeekend = d === 'sat' || d === 'sun'
    cells.push(
      <div key={`hdr-${d}`} style={{
        textAlign: 'center', color: isWeekend ? 'var(--text-faint-2)' : 'var(--text-faint)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', textTransform: 'uppercase',
        letterSpacing: '0.06em', paddingBottom: '6px', opacity: isWeekend ? 0.6 : 1,
      }}>{DAY_LABELS[d]}</div>
    )
  })

  weeks.forEach((w, i) => {
    const rangeLabel = cycleStartDate ? weekRangeLabel(cycleStartDate, i) : null
    const isCurrentWeek = cycleStartDate
      ? ALL_CALENDAR_DAYS.map((d) => localDateKey(dateForCell(cycleStartDate, i, DAY_OFFSET[d]))).includes(todayStr)
      : false
    cells.push(
      <div key={`lbl-${i}`} style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        color: isCurrentWeek ? 'var(--brand)' : 'var(--text-faint-2)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <span style={{ fontSize: '11.5px', fontWeight: isCurrentWeek ? '700' : '400' }}>Wk{i + 1}</span>
        {rangeLabel && <span style={{ fontSize: '9px', opacity: 0.65, marginTop: '1px' }}>{rangeLabel}</span>}
      </div>
    )
    ALL_CALENDAR_DAYS.forEach((d) => {
      const isWeekend = d === 'sat' || d === 'sun'
      const isPrimary = !isWeekend && w.primary_days.includes(d)
      const isSecondary = !isWeekend && showSecondary && w.secondary_days.includes(d)
      const isOff = !isPrimary && !isSecondary
      const cellDate = dateForCell(cycleStartDate, i, DAY_OFFSET[d])
      const isToday = !!cellDate && localDateKey(cellDate) === todayStr
      const bg = isPrimary ? 'var(--green-bg)' : isSecondary ? 'var(--blue-bg-2)' : 'var(--bg-surface-2)'
      const color = isPrimary ? 'var(--brand)' : isSecondary ? 'var(--blue)' : 'var(--text-faint-2)'
      const border = isToday ? 'var(--brand)' : isPrimary ? 'var(--green-bg-2)' : isSecondary ? 'var(--blue-bg)' : 'var(--border-color-2)'
      cells.push(
        <div key={`c-${i}-${d}`} style={{
          height: '42px', borderRadius: '8px', background: bg,
          border: `${isToday ? '2px' : '0.5px'} solid ${border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
          color, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600',
          opacity: isWeekend ? 0.4 : isOff ? 0.5 : 1,
        }}>
          <span style={{ fontSize: '12.5px', lineHeight: 1 }}>{DAY_LABELS[d]}</span>
          {cellDate && <span style={{ fontSize: '9.5px', fontWeight: '400', opacity: 0.7, lineHeight: 1 }}>{cellDate.getDate()}</span>}
        </div>
      )
    })
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '58px repeat(7, 1fr)', gap: '7px' }}>
      {cells}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE MODAL — unified create / view / edit.
//
// - pairing == null            → create mode (form only, no view state)
// - pairing provided, editing=false → view mode (read-only grid + Edit/Delete/Close)
// - pairing provided, editing=true  → edit mode (same form as create, prefilled)
// ═══════════════════════════════════════════════════════════════════════════
function ScheduleModal({ accounts, pairing, onClose, onSaved, onDeleted, isMobile = false }) {
  const isCreate = !pairing
  const existingCycle = pairing ? latestCycle(pairing) : null
  const cycleStatus = existingCycle ? getCycleStatus(existingCycle.cycle_start_date) : null
  // Real anchor Monday for the grid: the existing cycle's actual start date, or
  // (create mode / no cycle yet) the upcoming Monday it would start on — same
  // date handleSave() will use via nextCycleStartDate(). Lets every preview,
  // including a brand-new unsaved schedule, show live calendar dates.
  const cycleStartDate = existingCycle?.cycle_start_date || nextCycleStartDate()
  const cycleRangeLabel = formatCycleRangeLabel(cycleStartDate)

  const [editing, setEditing] = useState(isCreate)
  const [label, setLabel] = useState(pairing?.label || '')
  const [primaryId, setPrimaryId] = useState(pairing?.primary_account_id || '')
  const [secondaryEnabled, setSecondaryEnabled] = useState(!!pairing?.secondary_account_id)
  const [secondaryId, setSecondaryId] = useState(pairing?.secondary_account_id || '')
  const [weeks, setWeeks] = useState(() => existingCycle?.weeks || generateCycle(false).weeks)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleShuffle = () => {
    setWeeks(generateCycle(secondaryEnabled).weeks)
  }

  const handleToggleSecondary = (checked) => {
    setSecondaryEnabled(checked)
    setWeeks((prev) => prev.map((w) => ({
      ...w,
      secondary_days: checked ? deriveSecondaryDays(w.primary_days) : [],
    })))
    if (!checked) setSecondaryId('')
  }

  const handleEnterEdit = () => {
    // Re-sync form state from the pairing in case it changed since mount.
    setLabel(pairing?.label || '')
    setPrimaryId(pairing?.primary_account_id || '')
    setSecondaryEnabled(!!pairing?.secondary_account_id)
    setSecondaryId(pairing?.secondary_account_id || '')
    setWeeks(existingCycle?.weeks || generateCycle(false).weeks)
    setError('')
    setEditing(true)
  }

  const handleCancelEdit = () => {
    if (isCreate) { onClose(); return }
    setEditing(false)
    setError('')
  }

  const handleSave = async () => {
    if (!primaryId) { setError('Pick a primary account first.'); return }
    if (secondaryEnabled && !secondaryId) { setError('Pick a secondary account, or turn secondary off.'); return }
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      if (isCreate) {
        const { data: pairingRow, error: pairingErr } = await supabase
          .from('schedule_pairings')
          .insert({
            user_id: user.id,
            label: label.trim() || null,
            primary_account_id: primaryId,
            secondary_account_id: secondaryEnabled ? secondaryId : null,
          })
          .select()
          .single()
        if (pairingErr) throw pairingErr

        const { error: cycleErr } = await supabase
          .from('schedule_cycles')
          .insert({
            pairing_id: pairingRow.id,
            cycle_number: 1,
            cycle_start_date: nextCycleStartDate(),
            weeks,
          })
        if (cycleErr) throw cycleErr
      } else {
        const { error: pairingErr } = await supabase
          .from('schedule_pairings')
          .update({
            label: label.trim() || null,
            primary_account_id: primaryId,
            secondary_account_id: secondaryEnabled ? secondaryId : null,
          })
          .eq('id', pairing.id)
        if (pairingErr) throw pairingErr

        if (existingCycle) {
          const { error: cycleErr } = await supabase
            .from('schedule_cycles')
            .update({ weeks })
            .eq('pairing_id', pairing.id)
            .eq('cycle_number', existingCycle.cycle_number)
          if (cycleErr) throw cycleErr
        } else {
          const { error: cycleErr } = await supabase
            .from('schedule_cycles')
            .insert({
              pairing_id: pairing.id,
              cycle_number: 1,
              cycle_start_date: nextCycleStartDate(),
              weeks,
            })
          if (cycleErr) throw cycleErr
        }
      }

      onSaved()
    } catch (err) {
      console.error('Failed to save schedule:', err)
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await supabase.from('schedule_pairings').delete().eq('id', pairing.id)
      // schedule_cycles rows cascade-delete via the FK, no separate call needed
      onDeleted()
    } catch (err) {
      console.error('Failed to delete schedule:', err)
      setError('Could not delete. Please try again.')
      setDeleting(false)
    }
  }

  const secondaryOptions = accounts.filter((a) => a.id !== primaryId)
  const displayName = pairing?.label
    || [pairing?.primary_account?.name, pairing?.secondary_account?.name].filter(Boolean).join(' + ')
    || 'Schedule'

  // ─── Shared form bits, reused by create + edit ─────────────────────────────
  const labelInput = (
    <>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', marginBottom: '6px' }}>
        Name <span style={{ color: 'var(--text-faint-2)' }}>(optional)</span>
      </label>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Main rotation"
        style={{
          width: '100%', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)',
          borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)',
          fontFamily: 'Inter, sans-serif', fontSize: '13px', boxSizing: 'border-box',
        }}
      />
    </>
  )

  const primarySelect = (
    <>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', marginBottom: '6px' }}>
        Primary account
      </label>
      <select
        value={primaryId}
        onChange={(e) => setPrimaryId(e.target.value)}
        style={{
          width: '100%', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)',
          borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)',
          fontFamily: 'Inter, sans-serif', fontSize: '13px', boxSizing: 'border-box',
        }}
      >
        <option value="">Select account...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </>
  )

  const secondaryBlock = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px' }}>
          Pair a secondary account
        </span>
        <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={secondaryEnabled}
            onChange={(e) => handleToggleSecondary(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '999px',
            background: secondaryEnabled ? 'var(--brand)' : 'var(--bg-surface-2)',
            transition: 'background 0.15s ease',
          }}>
            <span style={{
              position: 'absolute', top: '2px', left: secondaryEnabled ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.15s ease',
            }} />
          </span>
        </label>
      </div>

      {secondaryEnabled && (
        <select
          value={secondaryId}
          onChange={(e) => setSecondaryId(e.target.value)}
          style={{
            width: '100%', background: 'var(--bg-page)', border: '0.5px solid var(--border-color)',
            borderRadius: '8px', padding: '9px 12px', color: 'var(--text-primary)',
            fontFamily: 'Inter, sans-serif', fontSize: '13px', boxSizing: 'border-box', marginTop: '10px',
          }}
        >
          <option value="">Select secondary account...</option>
          {secondaryOptions.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}
    </>
  )

  const errorBlock = error && (
    <p style={{ color: 'var(--red)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', margin: 0 }}>{error}</p>
  )

  const editActionButtons = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={handleCancelEdit}
        style={{
          flex: 1, background: 'transparent', border: '0.5px solid var(--border-color-2)',
          borderRadius: '8px', padding: '10px', color: 'var(--text-soft)',
          fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer',
        }}
      >Cancel</button>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          flex: 1, background: 'var(--brand)', border: 'none', borderRadius: '8px', padding: '10px',
          color: 'var(--bg-page)', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1,
        }}
      >{saving ? 'Saving...' : 'Save schedule'}</button>
    </div>
  )

  const reshuffleHeader = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px' }}>
          {editing ? 'Generated 4-week cycle' : 'Current 4-week cycle'}
        </span>
        <span style={{
          display: 'block', color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10.5px', letterSpacing: '0.04em', marginTop: '2px',
        }}>
          {cycleRangeLabel}
        </span>
      </div>
      {editing && (
        <button
          onClick={handleShuffle}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent',
            border: '0.5px solid var(--border-color-2)', borderRadius: '6px', padding: '4px 9px',
            color: 'var(--text-soft)', fontFamily: 'Inter, sans-serif', fontSize: '11.5px', cursor: 'pointer',
          }}
        >
          <Shuffle size={12} strokeWidth={1.8} />
          Reshuffle
        </button>
      )}
    </div>
  )

  const legend = (
    <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-faint)' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'var(--brand)', display: 'inline-block' }} /> Primary
      </span>
      {(editing ? secondaryEnabled : !!pairing?.secondary_account) && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-faint)' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'var(--blue)', display: 'inline-block' }} /> Secondary
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'var(--text-faint)' }}>
        <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: 'var(--bg-surface-2)', border: '0.5px solid var(--border-color-2)', display: 'inline-block' }} /> Rest
      </span>
    </div>
  )

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '18px' : '22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <h2 style={{
          color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: '600', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {isCreate ? 'Create Schedule' : editing ? 'Edit Schedule' : displayName}
        </h2>
        {!isCreate && !editing && (
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              <Pencil size={14} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 10,
                background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)', borderRadius: '8px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)', overflow: 'hidden', minWidth: '128px',
              }}>
                <button
                  onClick={() => { setMenuOpen(false); handleEnterEdit() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box',
                    background: 'transparent', border: 'none', padding: '9px 12px', color: 'var(--text-soft)',
                    fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Pencil size={13} strokeWidth={1.8} /> Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box',
                    background: 'transparent', border: 'none', borderTop: '0.5px solid var(--border-color)',
                    padding: '9px 12px', color: 'var(--red)', fontFamily: 'Inter, sans-serif', fontSize: '13px',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <Trash2 size={13} strokeWidth={1.8} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
        <X size={18} />
      </button>
    </div>
  )

  // Human-readable "where are we in this cycle" line, shown above the grid.
  const statusBanner = cycleStatus && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px', padding: '8px 12px',
      background: cycleStatus.state === 'during' ? 'var(--green-bg)' : 'var(--bg-page)',
      border: `0.5px solid ${cycleStatus.state === 'during' ? 'var(--green-bg-2)' : 'var(--border-color)'}`,
      borderRadius: '8px',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
        background: cycleStatus.state === 'during' ? 'var(--brand)' : 'var(--text-faint-2)',
      }} />
      <span style={{ color: cycleStatus.state === 'during' ? 'var(--brand)' : 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px' }}>
        {cycleStatus.state === 'during' && `You're in Week ${cycleStatus.weekIndex + 1} of 4 — today is ${DAY_FULL[cycleStatus.dayKey]}.`}
        {cycleStatus.state === 'before' && `This cycle hasn't started yet — begins in ${cycleStatus.daysUntil} day${cycleStatus.daysUntil !== 1 ? 's' : ''}.`}
        {cycleStatus.state === 'after' && 'This cycle has ended — reshuffle or edit to start a new one.'}
      </span>
    </div>
  )

  // ─── VIEW MODE (read-only) ──────────────────────────────────────────────────
  const viewBody = (
    <>
      {reshuffleHeader}
      {statusBanner}
      {legend}
      <div style={{ background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: isMobile ? '8px' : '10px', padding: isMobile ? '10px 12px' : '16px', marginBottom: '18px' }}>
        {existingCycle ? (
          isMobile
            ? existingCycle.weeks.map((w, i) => (
              <WeekRow
                key={i} weekNumber={i + 1} week={w} showSecondary={!!pairing?.secondary_account}
                cycleStartDate={cycleStartDate}
              />
            ))
            : <CycleGrid
                weeks={existingCycle.weeks} showSecondary={!!pairing?.secondary_account}
                cycleStartDate={cycleStartDate}
              />
        ) : (
          <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', margin: 0 }}>
            No cycle data found for this schedule.
          </p>
        )}
      </div>

      {errorBlock && <div style={{ marginBottom: '12px' }}>{errorBlock}</div>}

      {confirmDelete && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{
              flex: 1, background: 'transparent', border: '0.5px solid var(--border-color-2)',
              borderRadius: '8px', padding: '10px', color: 'var(--text-soft)',
              fontFamily: 'Inter, sans-serif', fontSize: '13px', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, background: 'var(--red-bg-2)', border: '0.5px solid var(--red-bg)', borderRadius: '8px', padding: '10px',
              color: 'var(--red)', fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: '600',
              cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1,
            }}
          >{deleting ? 'Deleting...' : 'Confirm delete'}</button>
        </div>
      )}
    </>
  )

  // ─── MOBILE ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)',
        padding: '16px',
      }}>
        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)',
          borderRadius: '16px', padding: '22px', width: '440px', maxWidth: '100%',
          maxHeight: '86vh', overflowY: 'auto',
        }}>
          {header}

          {editing ? (
            <>
              <div style={{ marginBottom: '18px' }}>{labelInput}</div>
              <div style={{ marginBottom: '18px' }}>{primarySelect}</div>
              {reshuffleHeader}
              {legend}
              <div style={{ background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', marginBottom: '18px' }}>
                {weeks.map((w, i) => (
                  <WeekRow key={i} weekNumber={i + 1} week={w} showSecondary={secondaryEnabled} cycleStartDate={cycleStartDate} />
                ))}
              </div>
              <div style={{ marginBottom: '18px' }}>{secondaryBlock}</div>
              {errorBlock && <div style={{ marginBottom: '12px' }}>{errorBlock}</div>}
              {editActionButtons}
            </>
          ) : viewBody}
        </div>
      </div>
    )
  }

  // ─── DESKTOP — landscape two-column layout for editing ─────────────────────
  if (editing) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)',
        padding: '16px',
      }}>
        <div style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)',
          borderRadius: '16px', padding: '26px', width: '840px', maxWidth: '100%',
          maxHeight: '86vh', overflowY: 'auto', boxSizing: 'border-box',
        }}>
          {header}

          <div style={{ display: 'flex', gap: '30px' }}>

            {/* Left column: setup */}
            <div style={{ width: '270px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>{labelInput}</div>
              <div>{primarySelect}</div>
              <div style={{
                background: 'var(--bg-page)', border: '0.5px solid var(--border-color)',
                borderRadius: '10px', padding: '14px',
              }}>
                {secondaryBlock}
              </div>
              <div style={{ flex: 1 }} />
              {errorBlock}
              {editActionButtons}
            </div>

            {/* Right column: bigger calendar preview */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {reshuffleHeader}
              {legend}
              <div style={{ background: 'var(--bg-page)', border: '0.5px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                <CycleGrid weeks={weeks} showSecondary={secondaryEnabled} cycleStartDate={cycleStartDate} />
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ─── DESKTOP — view mode ────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '0.5px solid var(--border-color-2)',
        borderRadius: '16px', padding: '26px', width: '620px', maxWidth: '100%',
        maxHeight: '86vh', overflowY: 'auto', boxSizing: 'border-box',
      }}>
        {header}
        <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', margin: '-14px 0 18px' }}>
          {pairing?.primary_account?.name}{pairing?.secondary_account?.name ? ` + ${pairing.secondary_account.name}` : ''}
        </p>
        {viewBody}
      </div>
    </div>
  )
}

// Same status logic as ChallengeTracker.jsx's computeStatus() — accounts have
// no stored `status` column, so status (active / funded / passed / failed) is
// derived from trade history + account fields. Kept as its own local copy
// here rather than importing from ChallengeTracker.jsx, so this page has no
// dependency on that file.
function computeAccountStatus(trades, account) {
  if (account.failure_reason) return 'failed'

  // Funded phase accounts always show as 'funded' regardless of P&L
  if (account.phase === 'funded') return 'funded'

  const withPnl = trades.filter((t) => t.pnl != null)
  const profitTarget = parseFloat(account.profit_target) || 0
  const maxDD = parseFloat(account.max_drawdown) || 0
  const dailyDD = parseFloat(account.daily_drawdown) || 0
  const minDays = account.min_trading_days || 0
  const accountSize = parseFloat(account.account_size) || 0

  const netPnl = withPnl.reduce((s, t) => s + parseFloat(t.pnl) + (parseFloat(t.swap) || 0) + (parseFloat(t.commission) || 0), 0)

  let balance = accountSize
  let lowestBalance = accountSize
  for (const t of withPnl) {
    balance += parseFloat(t.pnl) + (parseFloat(t.swap) || 0) + (parseFloat(t.commission) || 0)
    if (balance < lowestBalance) lowestBalance = balance
  }
  const maxDrawdownUsed = Math.max(0, accountSize - lowestBalance)

  const byDay = {}
  withPnl.forEach((t) => {
    byDay[t.date] = (byDay[t.date] || 0) + parseFloat(t.pnl) + (parseFloat(t.swap) || 0) + (parseFloat(t.commission) || 0)
  })
  const worstDayLoss = Object.values(byDay).length > 0
    ? Math.max(0, ...Object.values(byDay).map((v) => -v))
    : 0

  const maxDDBreach = maxDD > 0 && maxDrawdownUsed >= maxDD
  const dailyDDBreach = dailyDD > 0 && worstDayLoss >= dailyDD

  if (maxDDBreach || dailyDDBreach) return 'failed'

  const tradingDays = new Set(trades.map((t) => t.date)).size
  const minDaysMet = minDays === 0 || tradingDays >= minDays
  const profitMet = profitTarget > 0 && netPnl >= profitTarget

  if (profitMet && minDaysMet) return 'passed'

  return 'active'
}

export default function Schedule() {
  const { collapsed } = useSidebar()
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [pairings, setPairings] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalPairing, setModalPairing] = useState(null) // null = create mode

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: pairingsData }, { data: accountsRaw }] = await Promise.all([
      supabase
        .from('schedule_pairings')
        .select('*, primary_account:primary_account_id(id, name), secondary_account:secondary_account_id(id, name), schedule_cycles(cycle_number, cycle_start_date, weeks)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id),
    ])

    setPairings(pairingsData || [])

    // There's no stored `status` column on accounts — status (active / funded /
    // passed / failed) is computed from trade history, same as ChallengeTracker.
    // Fetch trades for these accounts and run the same computeStatus() logic so
    // the dropdown only offers accounts that are actually still in play.
    const rawAccounts = accountsRaw || []
    let tradesByAccount = {}
    if (rawAccounts.length > 0) {
      const accountIds = rawAccounts.map((a) => a.id)
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .in('account_id', accountIds)
      tradesByAccount = {}
      accountIds.forEach((id) => { tradesByAccount[id] = [] })
      ;(trades || []).forEach((t) => {
        if (tradesByAccount[t.account_id]) tradesByAccount[t.account_id].push(t)
      })
    }

    const eligible = rawAccounts.filter((a) => {
      if (a.is_archived) return false
      const status = computeAccountStatus(tradesByAccount[a.id] || [], a)
      return status === 'active' || status === 'funded'
    })

    setAccounts(eligible)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateSchedule = () => { setModalPairing(null); setModalOpen(true) }
  const handleOpenSchedule = (p) => { setModalPairing(p); setModalOpen(true) }
  const handleCloseModal = () => setModalOpen(false)
  const handleSaved = () => { setModalOpen(false); loadData() }
  const handleDeleted = () => { setModalOpen(false); loadData() }

  // ─── Shared row renderer (mobile + desktop use the same click behavior) ────
  const renderScheduleRow = (p, sizes) => {
    const cycle = latestCycle(p)
    const name = p.label || [p.primary_account?.name, p.secondary_account?.name].filter(Boolean).join(' + ') || 'Schedule'
    return (
      <div
        key={p.id}
        onClick={() => handleOpenSchedule(p)}
        style={{
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border-color)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: sizes.padding,
          cursor: 'pointer',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span style={{ display: 'block', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: sizes.nameSize, fontWeight: '500' }}>
            {name}
          </span>
          {p.label && (
            <span style={{ display: 'block', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: sizes.subSize, marginTop: '2px' }}>
              {[p.primary_account?.name, p.secondary_account?.name].filter(Boolean).join(' + ')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ color: 'var(--text-faint-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: sizes.badgeSize }}>
            Cycle {cycle?.cycle_number ?? 1}
          </span>
          <ChevronRight size={sizes.chevronSize} color="var(--text-faint-2)" />
        </div>
      </div>
    )
  }

  // ─── MOBILE ────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sidebar />
        <main style={{ paddingTop: '64px', paddingBottom: '60px', flex: 1, overflowY: 'auto' }}>

          <div style={{ padding: '16px 14px 0' }}>
            <h1 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '600', margin: 0 }}>Schedule</h1>
            <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '12px', margin: '4px 0 0' }}>
              Non-discretionary trading day rotation — owner only.
            </p>
          </div>

          {/* ─── Today Across Accounts ──────────────────────────────────── */}
          <div style={{ margin: '16px 14px 0' }}>
            <h2 style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500', margin: '0 0 8px' }}>
              Today Across Accounts
            </h2>
            <div style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '16px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>Loading...</div>
              ) : pairings.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                  No schedules set up yet — nothing scheduled for today.
                </div>
              ) : (
                <div style={{ padding: '16px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                  Rotation data not yet generated for {pairings.length} schedule{pairings.length !== 1 ? 's' : ''}.
                </div>
              )}
            </div>
          </div>

          {/* ─── Schedules ───────────────────────────────────────────────── */}
          <div style={{ margin: '16px 14px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500', margin: 0 }}>
                Schedules
              </h2>
              <button
                onClick={handleCreateSchedule}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'var(--green-bg)', border: '0.5px solid var(--green-bg-2)',
                  borderRadius: '7px', padding: '6px 11px', color: 'var(--brand)',
                  fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                }}
              >
                <Plus size={13} strokeWidth={2} />
                Create
              </button>
            </div>

            {loading ? null : pairings.length === 0 ? (
              <div style={{
                background: 'var(--bg-surface)', border: '0.5px dashed var(--border-color-2)', borderRadius: '10px',
                padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center',
              }}>
                <CalendarClock size={20} strokeWidth={1.6} color="var(--text-faint-2)" />
                <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '12.5px', margin: 0 }}>
                  No schedules yet. Create one to generate a non-discretionary 4-week rotation.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pairings.map((p) => renderScheduleRow(p, {
                  padding: '13px 14px', nameSize: '13.5px', subSize: '11px', badgeSize: '10.5px', chevronSize: 15,
                }))}
              </div>
            )}
          </div>
        </main>

        {modalOpen && (
          <ScheduleModal
            accounts={accounts}
            pairing={modalPairing}
            onClose={handleCloseModal}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            isMobile
          />
        )}
      </div>
    )
  }

  // ─── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: 'var(--bg-page)', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: collapsed ? '60px' : '220px', transition: 'margin-left 0.2s ease', flex: 1, padding: '32px' }}>
        <h1 style={{
          color: 'var(--text-primary)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '22px',
          fontWeight: '600',
          margin: '0 0 4px',
        }}>Schedule</h1>
        <p style={{
          color: 'var(--text-faint)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          margin: '0 0 24px',
        }}>Non-discretionary trading day rotation — owner only.</p>

        {/* ─── Today Across Accounts ──────────────────────────────────────── */}
        <section style={{ marginBottom: '28px' }}>
          <h2 style={{
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: '500',
            margin: '0 0 10px',
          }}>Today Across Accounts</h2>

          <div style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-color)',
            borderRadius: '10px',
            overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                Loading...
              </div>
            ) : pairings.length === 0 ? (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                No schedules set up yet — nothing scheduled for today.
              </div>
            ) : (
              <div style={{ padding: '18px', color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                Rotation data not yet generated for {pairings.length} schedule{pairings.length !== 1 ? 's' : ''}.
              </div>
            )}
          </div>
        </section>

        {/* ─── Schedules ──────────────────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: '500',
              margin: 0,
            }}>Schedules</h2>
            <button
              onClick={handleCreateSchedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--green-bg)',
                border: '0.5px solid var(--green-bg-2)',
                borderRadius: '7px',
                padding: '6px 12px',
                color: 'var(--brand)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '12.5px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} strokeWidth={2} />
              Create Schedule
            </button>
          </div>

          {loading ? null : pairings.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              border: '0.5px dashed var(--border-color-2)',
              borderRadius: '10px',
              padding: '32px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              textAlign: 'center',
            }}>
              <CalendarClock size={22} strokeWidth={1.6} color="var(--text-faint-2)" />
              <p style={{ color: 'var(--text-faint)', fontFamily: 'Inter, sans-serif', fontSize: '13px', margin: 0, maxWidth: '320px' }}>
                No schedules yet. Create one to generate a non-discretionary 4-week rotation for a primary account, with an optional secondary account auto-paired on the off days.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pairings.map((p) => renderScheduleRow(p, {
                padding: '14px 16px', nameSize: '14px', subSize: '11.5px', badgeSize: '11px', chevronSize: 16,
              }))}
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <ScheduleModal
          accounts={accounts}
          pairing={modalPairing}
          onClose={handleCloseModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          isMobile={false}
        />
      )}
    </div>
  )
}