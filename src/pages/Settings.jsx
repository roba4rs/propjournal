import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '../supabaseClient'
import { useSidebar } from '../SidebarContext'

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose, mobile = false }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: mobile ? '84px' : '32px',
      right: mobile ? 'auto' : '32px',
      left: mobile ? '50%' : 'auto',
      transform: mobile ? 'translateX(-50%)' : 'none',
      background: type === 'success' ? '#0f2219' : '#1e0d0d',
      border: `0.5px solid ${type === 'success' ? '#1a3826' : '#2e1515'}`,
      color: type === 'success' ? '#1db97b' : '#c03535',
      padding: '12px 20px',
      borderRadius: '10px',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '13px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  )
}

// ─── Reusable primitives ──────────────────────────────────────────────────────
function Card({ children, style = {}, mobile = false }) {
  return (
    <div style={{
      background: '#111',
      border: '0.5px solid #1e1e1e',
      borderRadius: mobile ? '10px' : '12px',
      padding: mobile ? '14px' : '20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children, color = '#777', style = {} }) {
  return (
    <p style={{
      color,
      fontFamily: 'DM Mono, monospace',
      fontSize: '10px',
      fontWeight: '500',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: '14px',
      marginTop: 0,
      ...style,
    }}>
      {children}
    </p>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        display: 'block',
        color: '#666',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        marginBottom: '6px',
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputBase = {
  width: '100%',
  background: '#0a0a0a',
  border: '0.5px solid #2a2a2a',
  borderRadius: '8px',
  color: '#fff',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle = {
  ...inputBase,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23555'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '32px',
}

function Toggle({ on, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '36px',
        height: '20px',
        background: on ? '#1db97b' : '#1e1e1e',
        border: `0.5px solid ${on ? '#1db97b' : '#2a2a2a'}`,
        borderRadius: '20px',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{
        position: 'absolute',
        width: '14px',
        height: '14px',
        background: '#fff',
        borderRadius: '50%',
        top: '2px',
        left: on ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}


// ─── Edit Account Modal ──────────────────────────────────────────────────────
function EditAccountModal({ account, onSave, onClose }) {
  const [tab, setTab] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [newName, setNewName] = useState(account.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isDeposit = tab === 'deposit'
  const isWithdraw = tab === 'withdrawal'
  const isRename = tab === 'rename'

  const parsedAmount = parseFloat(amount)
  const newSize = !isRename && !isNaN(parsedAmount) && parsedAmount > 0
    ? isDeposit
      ? account.account_size + parsedAmount
      : account.account_size - parsedAmount
    : null

  async function handleSave() {
    setError('')
    setSaving(true)
    await onSave({ tab, amount, newName })
    setSaving(false)
  }

  const tabs = [
    { id: 'deposit',    label: 'Deposit' },
    { id: 'withdrawal', label: 'Withdrawal' },
    { id: 'rename',     label: 'Rename' },
  ]
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: '#111',
        border: '0.5px solid #1e1e1e',
        borderRadius: '14px',
        padding: isMobile ? '16px' : '24px',
        width: isMobile ? 'calc(100vw - 24px)' : '360px',
        maxWidth: '360px',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600' }}>
            {account.name}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#777',
            cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px',
          }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setAmount(''); setError('') }}
              style={{
                flex: 1,
                background: tab === t.id ? '#1a1a1a' : 'transparent',
                border: `0.5px solid ${tab === t.id ? '#2a2a2a' : '#1e1e1e'}`,
                borderRadius: '8px',
                padding: '7px 0',
                color: tab === t.id ? '#fff' : '#777',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: tab === t.id ? '500' : '400',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Deposit / Withdrawal content */}
        {!isRename && (
          <>
            <div style={{
              background: '#0a0a0a', border: '0.5px solid #1a1a1a',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>Current balance</span>
              <span style={{ color: '#ccc', fontFamily: 'DM Mono, monospace', fontSize: '13px' }}>
                ${Number(account.account_size).toLocaleString()}
              </span>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>
                Amount ($)
              </label>
              <input
                style={{
                  width: '100%', background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                  borderRadius: '8px', color: '#fff', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', padding: '8px 12px', outline: 'none', boxSizing: 'border-box',
                }}
                type="number"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                autoFocus
              />
            </div>

            {newSize !== null && (
              <div style={{
                background: isDeposit ? '#0f2219' : '#1e0d0d',
                border: `0.5px solid ${isDeposit ? '#1a3826' : '#2e1515'}`,
                borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>New balance</span>
                <span style={{
                  color: isDeposit ? '#1db97b' : '#c03535',
                  fontFamily: 'DM Mono, monospace', fontSize: '13px', fontWeight: '600',
                }}>
                  ${newSize.toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}

        {/* Rename content */}
        {isRename && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>
              Account name
            </label>
            <input
              style={{
                width: '100%', background: '#0a0a0a', border: '0.5px solid #2a2a2a',
                borderRadius: '8px', color: '#fff', fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px', padding: '8px 12px', outline: 'none', boxSizing: 'border-box',
              }}
              type="text"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              autoFocus
            />
          </div>
        )}

        {error && (
          <p style={{ color: '#c03535', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', margin: '0 0 12px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              background: isWithdraw ? '#c03535' : '#1db97b',
              color: isWithdraw ? '#fff' : '#000',
              border: 'none', borderRadius: '8px', padding: '10px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : isRename ? 'Rename' : isDeposit ? 'Confirm Deposit' : 'Confirm Withdrawal'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: '#aaa',
              border: '0.5px solid #2a2a2a', borderRadius: '8px',
              padding: '10px 16px', fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings() {
  const { collapsed } = useSidebar()
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ))
  const [user, setUser] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('Africa/Addis_Ababa')
  const [plan, setPlan] = useState('free_trial')
  const [trialStart, setTrialStart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)

  // Personal accounts
  const [personalAccounts, setPersonalAccounts] = useState([])
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountSize, setNewAccountSize] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [deletingAccountId, setDeletingAccountId] = useState(null)
  // editModal: { id, name, account_size } | null
  const [editModal, setEditModal] = useState(null)

  // Notification toggles (UI only for now)
  const [notifDrawdown, setNotifDrawdown] = useState(true)
  const [notifDailyLoss, setNotifDailyLoss] = useState(true)
  const [notifChallenge, setNotifChallenge] = useState(false)
  const [mobileView, setMobileView] = useState('main')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      setUser(authUser)
      setEmail(authUser.email || '')

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, plan, trial_start')
        .eq('id', authUser.id)
        .single()
      if (userError) throw userError

      setName(userData?.name || '')
      setPlan(userData?.plan || 'free_trial')
      setTrialStart(userData?.trial_start || null)

      const { data: accountsData, error: accountError } = await supabase
        .from('accounts')
        .select('id, name, account_size')
        .eq('user_id', authUser.id)
        .eq('type', 'personal')
        .order('created_at', { ascending: true })
      if (accountError) throw accountError
      setPersonalAccounts(accountsData || [])
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id)
      if (userError) throw userError

      setToast({ message: 'Settings saved.', type: 'success' })
    } catch (err) {
      console.error('Save failed:', err)
      setToast({ message: err.message || 'Failed to save settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAccount() {
    if (!user) return
    const trimmedName = newAccountName.trim()
    const size = parseFloat(newAccountSize)
    if (!trimmedName) { setToast({ message: 'Account name is required.', type: 'error' }); return }
    if (isNaN(size) || size < 0) { setToast({ message: 'Enter a valid starting balance.', type: 'error' }); return }
    setAddingAccount(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({ user_id: user.id, type: 'personal', name: trimmedName, account_size: size })
        .select('id, name, account_size')
        .single()
      if (error) throw error
      setPersonalAccounts(prev => [...prev, data])
      setNewAccountName('')
      setNewAccountSize('')
      setShowAddAccount(false)
      setToast({ message: `"${data.name}" created.`, type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Failed to create account.', type: 'error' })
    } finally {
      setAddingAccount(false)
    }
  }

  async function handleDeleteAccount(accountId, accountName) {
    if (!window.confirm(`Delete "${accountName}"? This cannot be undone.`)) return
    setDeletingAccountId(accountId)
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId)
      if (error) throw error
      setPersonalAccounts(prev => prev.filter(a => a.id !== accountId))
      setToast({ message: `"${accountName}" deleted.`, type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Failed to delete account.', type: 'error' })
    } finally {
      setDeletingAccountId(null)
    }
  }

  async function handleEditSave({ tab, amount, newName }) {
    if (!editModal) return
    const { id, account_size: currentSize } = editModal
    try {
      if (tab === 'rename') {
        const trimmed = newName.trim()
        if (!trimmed) { setToast({ message: 'Name cannot be empty.', type: 'error' }); return }
        const { error } = await supabase.from('accounts').update({ name: trimmed }).eq('id', id)
        if (error) throw error
        setPersonalAccounts(prev => prev.map(a => a.id === id ? { ...a, name: trimmed } : a))
        setEditModal(null)
        setToast({ message: 'Account renamed.', type: 'success' })
      } else {
        const amt = parseFloat(amount)
        if (isNaN(amt) || amt <= 0) { setToast({ message: 'Enter a valid amount.', type: 'error' }); return }
        const isDeposit = tab === 'deposit'
        if (!isDeposit && amt > currentSize) { setToast({ message: `Cannot withdraw more than current balance ($${currentSize.toLocaleString()}).`, type: 'error' }); return }
        const newSize = isDeposit ? currentSize + amt : currentSize - amt
        const { error } = await supabase.from('accounts').update({ account_size: newSize }).eq('id', id)
        if (error) throw error
        setPersonalAccounts(prev => prev.map(a => a.id === id ? { ...a, account_size: newSize } : a))
        setEditModal(prev => ({ ...prev, account_size: newSize }))
        setToast({ message: `${isDeposit ? 'Deposit' : 'Withdrawal'} applied.`, type: 'success' })
      }
    } catch (err) {
      setToast({ message: err.message || 'Update failed.', type: 'error' })
    }
  }

  async function handleExportCSV() {
    if (!user) return
    setExporting(true)
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      if (error) throw error

      if (!trades || trades.length === 0) {
        setToast({ message: 'No trades to export.', type: 'error' })
        return
      }

      const headers = ['Date', 'Pair', 'Direction', 'Entry', 'Stop Loss', 'Take Profit', 'RR', 'P&L', 'Session', 'Notes']
      const rows = trades.map(t => [
        t.date,
        t.pair,
        t.direction,
        t.entry,
        t.stop_loss,
        t.take_profit,
        t.rr,
        t.pnl,
        t.session,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ])
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `propjournal-trades-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setToast({ message: 'Trades exported.', type: 'success' })
    } catch (err) {
      setToast({ message: 'Export failed.', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  function getTrialDaysLeft() {
    if (!trialStart) return null
    const start = new Date(trialStart)
    const now = new Date()
    const diff = 7 - Math.floor((now - start) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  function getPlanBadge() {
    if (plan === 'monthly')  return { label: 'Monthly',  bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' }
    if (plan === 'biannual') return { label: '6 Months', bg: '#0f1a2e', color: '#4d9fff', border: '#1a3050' }
    if (plan === 'annual')   return { label: 'Annual',   bg: '#0f2219', color: '#1db97b', border: '#1a3826' }
    return { label: 'Trial', bg: '#141414', color: '#aaa', border: '#2a2a2a' }
  }

  function isTrialPlan() {
    return plan === 'trial' || plan === 'free_trial' || !plan
  }

  function getInitials() {
    return name
      ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : email?.slice(0, 2).toUpperCase() || '?'
  }

  const badge = getPlanBadge()
  const daysLeft = getTrialDaysLeft()
  const inMobileSubView = isMobile && mobileView !== 'main'

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{
          marginLeft: isMobile ? 0 : (collapsed ? '60px' : '220px'),
          transition: 'margin-left 0.2s ease',
          flex: 1,
          minHeight: '100vh',
          padding: isMobile ? '14px' : '32px',
        }}>
          <p style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Loading...</p>
        </main>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{
        marginLeft: isMobile ? 0 : (collapsed ? '60px' : '220px'),
        transition: 'margin-left 0.2s ease',
        flex: 1,
        minHeight: '100vh',
        padding: isMobile ? '62px 12px 84px' : '32px 32px 48px',
        maxWidth: isMobile ? '560px' : 'none',
        marginRight: isMobile ? 'auto' : 0,
      }}>
        {isMobile ? (
          <div>
            {/* Top bar overlay title — matches Trade Log / Challenges placement */}
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: '52px',
              paddingRight: '14px',
              zIndex: 201,
              pointerEvents: 'none',
            }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '15px',
                fontWeight: '500',
                color: '#e0e0e0',
              }}>
                {mobileView === 'main'
                  ? 'Settings'
                  : mobileView === 'profile'
                    ? 'Edit Profile'
                    : mobileView === 'preferences'
                      ? 'Preferences'
                      : mobileView === 'accounts'
                        ? 'Personal Accounts'
                        : 'Notifications'}
              </span>
              {inMobileSubView ? (
                <button
                  onClick={() => setMobileView('main')}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid #2a2a2a',
                    color: '#aaa',
                    borderRadius: '5px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                >
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>

            {mobileView === 'main' && (
              <>
                <SectionLabel style={{ marginBottom: '8px', fontSize: '9px', color: '#666' }}>Account</SectionLabel>
                <div
                  onClick={() => setMobileView('profile')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #141414', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: '#0f2219', border: '0.5px solid #1a3826',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: '600', color: '#1db97b',
                    }}>
                      {getInitials()}
                    </div>
                    <div>
                      <div style={{ color: '#d8d8d8', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: '500' }}>{name || '—'}</div>
                      <div style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', marginTop: '2px' }}>{email}</div>
                    </div>
                  </div>
                  <span style={{ color: '#2f2f2f', fontSize: '16px' }}>›</span>
                </div>

                <SectionLabel style={{ marginTop: '14px', marginBottom: '8px', fontSize: '9px', color: '#666' }}>Preferences</SectionLabel>
                <div onClick={() => setMobileView('preferences')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #141414', cursor: 'pointer' }}>
                  <span style={{ color: '#cfcfcf', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Currency</span>
                  <span style={{ color: '#5a5a5a', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>{currency} <span style={{ color: '#2f2f2f' }}>›</span></span>
                </div>
                <div onClick={() => setMobileView('preferences')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #141414', cursor: 'pointer' }}>
                  <span style={{ color: '#cfcfcf', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Timezone</span>
                  <span style={{ color: '#5a5a5a', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>{timezone.replace('Africa/', '')} <span style={{ color: '#2f2f2f' }}>›</span></span>
                </div>

                <SectionLabel style={{ marginTop: '14px', marginBottom: '8px', fontSize: '9px', color: '#666' }}>Manage</SectionLabel>
                <div onClick={() => setMobileView('accounts')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #141414', cursor: 'pointer' }}>
                  <span style={{ color: '#cfcfcf', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Personal Accounts</span>
                  <span style={{ color: '#5a5a5a', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>{personalAccounts.length} account{personalAccounts.length !== 1 ? 's' : ''} <span style={{ color: '#2f2f2f' }}>›</span></span>
                </div>
                <div onClick={() => setMobileView('notifications')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #141414', cursor: 'pointer' }}>
                  <span style={{ color: '#cfcfcf', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Notifications</span>
                  <span style={{ color: '#5a5a5a', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
                    {[notifDrawdown, notifDailyLoss, notifChallenge].filter(Boolean).length} on <span style={{ color: '#2f2f2f' }}>›</span>
                  </span>
                </div>

                <SectionLabel style={{ marginTop: '14px', marginBottom: '8px', fontSize: '9px', color: '#666' }}>Billing</SectionLabel>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '0.5px solid #141414' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#cfcfcf', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Plan</span>
                    <span style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `0.5px solid ${badge.border}`,
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontFamily: 'DM Mono, monospace',
                      fontSize: '9px',
                      letterSpacing: '0.06em',
                    }}>
                      {badge.label.toUpperCase()}
                    </span>
                  </div>
                  {isTrialPlan() && (
                    <button
                      onClick={() => window.location.href = '/pricing'}
                      style={{
                        background: '#1db97b',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 14px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Upgrade
                    </button>
                  )}
                </div>
                {isTrialPlan() && daysLeft !== null && (
                  <div style={{ color: '#c97a00', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', padding: '8px 0 0' }}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining in your free trial.
                  </div>
                )}

                <SectionLabel style={{ marginTop: '16px', marginBottom: '8px', fontSize: '9px', color: '#c03535' }}>Danger Zone</SectionLabel>
                <div style={{ border: '0.5px solid #2e1515', borderRadius: '10px', padding: '10px 10px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ color: '#c03535', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Delete account</div>
                    <div style={{ color: '#666', fontSize: '11px', fontFamily: 'DM Sans, sans-serif', marginTop: '2px' }}>
                      Permanently deletes all your data.
                    </div>
                  </div>
                  <button
                    disabled
                    style={{
                      background: 'transparent',
                      color: '#c03535',
                      border: '0.5px solid #2e1515',
                      borderRadius: '6px',
                      padding: '5px 12px',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      opacity: 0.5,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}

            {mobileView === 'profile' && (
              <Card mobile style={{ marginTop: '8px' }}>
                <SectionLabel>Profile</SectionLabel>
                <Field label="Name">
                  <input style={inputBase} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </Field>
                <div style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>Email</label>
                  <input style={{ ...inputBase, color: '#666', cursor: 'not-allowed' }} value={email} disabled />
                </div>
              </Card>
            )}

            {mobileView === 'preferences' && (
              <Card mobile style={{ marginTop: '8px' }}>
                <SectionLabel>Preferences</SectionLabel>
                <Field label="Default Currency">
                  <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="ETB">ETB — Ethiopian Birr</option>
                  </select>
                </Field>
                <div style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>Timezone</label>
                  <select style={selectStyle} value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (UTC+3)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="America/New_York">America/New_York (UTC−5)</option>
                    <option value="America/Chicago">America/Chicago (UTC−6)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (UTC−8)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  </select>
                </div>
              </Card>
            )}

            {mobileView === 'accounts' && (
              <Card mobile style={{ marginTop: '8px' }}>
                <SectionLabel>Personal Accounts</SectionLabel>
                {personalAccounts.length === 0 && !showAddAccount && (
                  <p style={{ color: '#3a3a3a', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', margin: 0 }}>
                    No personal accounts yet.
                  </p>
                )}
                {personalAccounts.map((acc, i) => (
                  <div key={acc.id} style={{ padding: '10px 0', borderBottom: (i < personalAccounts.length - 1 || showAddAccount) ? '0.5px solid #1a1a1a' : 'none' }}>
                    <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500' }}>{acc.name}</div>
                    <div style={{ color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '2px', marginBottom: '8px' }}>${Number(acc.account_size).toLocaleString()}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditModal(acc)} style={{ background: 'transparent', color: '#4d9fff', border: '0.5px solid #1a3050', borderRadius: '8px', padding: '6px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', width: '50%' }}>Edit</button>
                      <button onClick={() => handleDeleteAccount(acc.id, acc.name)} disabled={deletingAccountId === acc.id} style={{ background: 'transparent', color: '#c03535', border: '0.5px solid #2e1515', borderRadius: '8px', padding: '6px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', width: '50%', opacity: deletingAccountId === acc.id ? 0.5 : 1 }}>
                        {deletingAccountId === acc.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {mobileView === 'notifications' && (
              <Card mobile style={{ marginTop: '8px' }}>
                <SectionLabel>Notifications</SectionLabel>
                {[
                  { label: 'Drawdown warning', sub: 'Alert when nearing max drawdown', val: notifDrawdown, set: setNotifDrawdown },
                  { label: 'Daily loss limit', sub: 'Alert when daily limit is hit', val: notifDailyLoss, set: setNotifDailyLoss },
                  { label: 'Challenge updates', sub: 'Status changes on your challenges', val: notifChallenge, set: setNotifChallenge },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #1a1a1a' : 'none' }}>
                    <div>
                      <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>{item.label}</div>
                      <div style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginTop: '2px' }}>{item.sub}</div>
                    </div>
                    <Toggle on={item.val} onToggle={() => item.set(v => !v)} />
                  </div>
                ))}
              </Card>
            )}

            {inMobileSubView && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '20px',
                position: 'fixed',
                left: '12px',
                right: '12px',
                bottom: '12px',
                zIndex: 50,
                background: '#0d0d0d',
                border: '0.5px solid #1e1e1e',
                borderRadius: '10px',
                padding: '8px',
              }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: '#1db97b', color: '#000', border: 'none',
                    borderRadius: '8px', padding: '10px 24px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                    fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1, flex: 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { loadSettings(); setMobileView('main') }}
                  disabled={saving}
                  style={{
                    background: 'transparent', color: '#aaa',
                    border: '0.5px solid #2a2a2a', borderRadius: '8px',
                    padding: '10px 20px', fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px', cursor: 'pointer', flex: 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

          </div>
        ) : (
          <>
            {/* Page heading */}
            <h1 style={{
              color: '#fff',
              fontFamily: 'Syne, sans-serif',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '28px',
              marginTop: 0,
            }}>
              Settings
            </h1>

            {/* ── 2-column grid ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}>

          {/* ── Profile ── */}
          <Card mobile={isMobile}>
            <SectionLabel>Profile</SectionLabel>

            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: isMobile ? '36px' : '42px',
                height: isMobile ? '36px' : '42px',
                borderRadius: '50%',
                background: '#0f2219', border: '0.5px solid #1a3826',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontSize: isMobile ? '12px' : '14px',
                fontWeight: '600', color: '#1db97b', flexShrink: 0,
              }}>
                {getInitials()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500' }}>{name || '—'}</div>
                <div style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
              </div>
            </div>

            <Field label="Name">
              <input
                style={inputBase}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>Email</label>
              <input
                style={{ ...inputBase, color: '#666', cursor: 'not-allowed' }}
                value={email}
                disabled
              />
            </div>
          </Card>

          {/* ── Preferences ── */}
          <Card mobile={isMobile}>
            <SectionLabel>Preferences</SectionLabel>

            <Field label="Default Currency">
              <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="ETB">ETB — Ethiopian Birr</option>
              </select>
            </Field>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>Timezone</label>
              <select style={selectStyle} value={timezone} onChange={e => setTimezone(e.target.value)}>
                <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (UTC+3)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
                <option value="America/New_York">America/New_York (UTC−5)</option>
                <option value="America/Chicago">America/Chicago (UTC−6)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC−8)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              </select>
            </div>
          </Card>

          {/* ── Personal Accounts ── */}
          <Card mobile={isMobile} style={{ gridColumn: '1 / -1' }}>
            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '10px' : 0,
            }}>
              <SectionLabel style={{ marginBottom: 0 }}>Personal Accounts</SectionLabel>
              <button
                onClick={() => { setShowAddAccount(true); setNewAccountName(''); setNewAccountSize('') }}
                style={{
                  background: 'transparent', color: '#1db97b',
                  border: '0.5px solid #1a3826', borderRadius: '8px',
                  padding: '6px 14px', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Add account
              </button>
            </div>

            {personalAccounts.length === 0 && !showAddAccount && (
              <p style={{ color: '#3a3a3a', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', margin: 0 }}>
                No personal accounts yet.
              </p>
            )}

            {personalAccounts.map((acc, i) => (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: (i < personalAccounts.length - 1 || showAddAccount) ? '0.5px solid #1a1a1a' : 'none',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '10px' : 0,
                }}
              >
                <div>
                  <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '500' }}>
                    {acc.name}
                  </div>
                  <div style={{ color: '#777', fontFamily: 'DM Mono, monospace', fontSize: '11px', marginTop: '2px' }}>
                    ${Number(acc.account_size).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                  <button
                    onClick={() => setEditModal(acc)}
                    style={{
                      background: 'transparent', color: '#4d9fff',
                      border: '0.5px solid #1a3050', borderRadius: '8px',
                      padding: '6px 12px', fontFamily: 'DM Sans, sans-serif',
                      fontSize: '11px', cursor: 'pointer',
                      width: isMobile ? '50%' : 'auto',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                    disabled={deletingAccountId === acc.id}
                    style={{
                      background: 'transparent', color: '#c03535',
                      border: '0.5px solid #2e1515', borderRadius: '8px',
                      padding: '6px 12px', fontFamily: 'DM Sans, sans-serif',
                      fontSize: '11px', cursor: deletingAccountId === acc.id ? 'not-allowed' : 'pointer',
                      opacity: deletingAccountId === acc.id ? 0.5 : 1,
                      width: isMobile ? '50%' : 'auto',
                    }}
                  >
                    {deletingAccountId === acc.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}

            {showAddAccount && (
              <div style={{ paddingTop: '14px' }}>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: isMobile ? 'stretch' : 'flex-end',
                  flexDirection: isMobile ? 'column' : 'row',
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>
                      Account name
                    </label>
                    <input
                      style={inputBase}
                      type="text"
                      placeholder="e.g. Swing account"
                      value={newAccountName}
                      onChange={e => setNewAccountName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginBottom: '6px' }}>
                      Starting balance ($)
                    </label>
                    <input
                      style={inputBase}
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={newAccountSize}
                      onChange={e => setNewAccountSize(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', paddingBottom: '1px', width: isMobile ? '100%' : 'auto' }}>
                    <button
                      onClick={handleAddAccount}
                      disabled={addingAccount}
                      style={{
                        background: '#1db97b', color: '#000', border: 'none',
                        borderRadius: '8px', padding: '8px 16px',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                        fontWeight: '600', cursor: addingAccount ? 'not-allowed' : 'pointer',
                        opacity: addingAccount ? 0.6 : 1, whiteSpace: 'nowrap',
                        flex: isMobile ? 1 : 'initial',
                      }}
                    >
                      {addingAccount ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowAddAccount(false)}
                      style={{
                        background: 'transparent', color: '#777',
                        border: '0.5px solid #2a2a2a', borderRadius: '8px',
                        padding: '8px 14px', fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px', cursor: 'pointer',
                        flex: isMobile ? 1 : 'initial',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ── Notifications ── */}
          <Card mobile={isMobile} style={{ gridColumn: '1 / -1' }}>
            <SectionLabel>Notifications</SectionLabel>

            {[
              { label: 'Drawdown warning', sub: 'Alert when nearing max drawdown', val: notifDrawdown, set: setNotifDrawdown },
              { label: 'Daily loss limit',  sub: 'Alert when daily limit is hit',    val: notifDailyLoss,  set: setNotifDailyLoss },
              { label: 'Challenge updates', sub: 'Status changes on your challenges', val: notifChallenge, set: setNotifChallenge },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < arr.length - 1 ? '0.5px solid #1a1a1a' : 'none',
              }}>
                <div>
                  <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>{item.label}</div>
                  <div style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginTop: '2px' }}>{item.sub}</div>
                </div>
                <Toggle on={item.val} onToggle={() => item.set(v => !v)} />
              </div>
            ))}
          </Card>

          {/* ── Plan — full width ── */}
          <Card mobile={isMobile} style={{ gridColumn: '1 / -1' }}>
            <SectionLabel>Plan</SectionLabel>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
            }}>
              <div>
                {/* Badge row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ color: '#aaa', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Current plan</span>
                  <span style={{
                    background: badge.bg, color: badge.color,
                    border: `0.5px solid ${badge.border}`,
                    borderRadius: '6px', padding: '3px 10px',
                    fontFamily: 'DM Mono, monospace', fontSize: '10px', fontWeight: '500',
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Trial countdown */}
                {isTrialPlan() && daysLeft !== null && (
                  <p style={{
                    color: daysLeft <= 3 ? '#c97a00' : '#777',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                    margin: '0 0 16px 0',
                  }}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining in your free trial.
                  </p>
                )}

                {/* Billing history */}
                <div style={{ marginTop: isTrialPlan() && daysLeft !== null ? 0 : '12px' }}>
                  <div style={{ color: '#3a3a3a', fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Billing history</div>
                  <div style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}>No payments yet.</div>
                </div>
              </div>

              {/* Upgrade button */}
              {isTrialPlan() && (
                <button
                  onClick={() => window.location.href = '/pricing'}
                  style={{
                    background: '#1db97b', color: '#000', border: 'none',
                    borderRadius: '8px', padding: '9px 20px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer', flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  Upgrade plan
                </button>
              )}
            </div>
          </Card>

          {/* ── Data Export — full width ── */}
          <Card mobile={isMobile} style={{ gridColumn: '1 / -1' }}>
            <SectionLabel>Data</SectionLabel>
            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '10px' : 0,
            }}>
              <div>
                <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Export all trades</div>
                <div style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginTop: '3px' }}>
                  Download your complete trade history as a CSV file.
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                style={{
                  background: 'transparent',
                  color: '#4d9fff',
                  border: '0.5px solid #1a3050',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="#4d9fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </Card>

          {/* ── Danger Zone — full width ── */}
          <Card mobile={isMobile} style={{ gridColumn: '1 / -1', border: '0.5px solid #2e1515' }}>
            <SectionLabel color="#c03535">Danger Zone</SectionLabel>
            <div style={{
              display: 'flex',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '10px' : 0,
            }}>
              <div>
                <div style={{ color: '#ccc', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>Delete account</div>
                <div style={{ color: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: '11px', marginTop: '3px' }}>
                  Permanently delete your account and all associated data. Cannot be undone.
                </div>
              </div>
              <button
                disabled
                style={{
                  background: 'transparent', color: '#c03535',
                  border: '0.5px solid #2e1515', borderRadius: '8px',
                  padding: '8px 16px', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', cursor: 'not-allowed', opacity: 0.5, flexShrink: 0,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                Delete account
              </button>
            </div>
          </Card>

            </div>{/* end grid */}

            {/* ── Save / Cancel ── */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#1db97b', color: '#000', border: 'none',
                  borderRadius: '8px', padding: '10px 24px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                  fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                onClick={loadSettings}
                disabled={saving}
                style={{
                  background: 'transparent', color: '#aaa',
                  border: '0.5px solid #2a2a2a', borderRadius: '8px',
                  padding: '10px 20px', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

      </main>

      {/* ── Edit Account Modal ── */}
      {editModal && (
        <EditAccountModal
          account={editModal}
          onSave={handleEditSave}
          onClose={() => setEditModal(null)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} mobile={isMobile} />
      )}
    </div>
  )
}