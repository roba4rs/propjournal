import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function AccountSwitcher({
  onSwitch,
  mobile = false,
  showBalance = true,
  compact = false,
  showSelectedNameOnMobile = false,
  defaultAccountId = null,
}) {
  const [accounts, setAccounts] = useState([])
  const [active, setActive] = useState(null)
  const [open, setOpen] = useState(false)
  const [totalBalance, setTotalBalance] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchAccounts = async (attempt = 0) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          if (attempt < 5) {
            setTimeout(() => { if (!cancelled) fetchAccounts(attempt + 1) }, 300 * (attempt + 1))
          }
          return
        }

        const { data } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: true })

        if (cancelled) return

        if (data) {
          setAccounts(data)
          const preferred = defaultAccountId
            ? (data.find(a => a.id === defaultAccountId) || data[0])
            : data[0]
          setActive(preferred || null)
          if (onSwitch) onSwitch(preferred)
        }
      } catch (err) {
        if (attempt < 5) {
          setTimeout(() => { if (!cancelled) fetchAccounts(attempt + 1) }, 300 * (attempt + 1))
        }
      }
    }

    fetchAccounts()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch total balance (account_size + sum of pnl) for any active account
  useEffect(() => {
    if (!active) {
      setTotalBalance(null)
      return
    }
    const fetchBalance = async () => {
      const { data } = await supabase
        .from('trades')
        .select('pnl, swap, commission')
        .eq('account_id', active.id)
      const totalPnl = (data || []).reduce((sum, t) =>
        sum + (Number(t.pnl) || 0) + (Number(t.swap) || 0) + (Number(t.commission) || 0), 0)
      setTotalBalance((Number(active.account_size) || 0) + totalPnl)
    }
    fetchBalance()
  }, [active])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSwitch = (account) => {
    setActive(account)
    setOpen(false)
    if (account?.id) localStorage.setItem('activeAccountId', account.id)
    if (onSwitch) onSwitch(account)
  }

  const personal = accounts.filter(a => a.type === 'personal')
  const challenges = accounts.filter(a => a.type !== 'personal')

  const groupLabelStyle = {
    display: 'block',
    color: '#3a3a3a',
    fontFamily: 'DM Mono, monospace',
    fontSize: '9px',
    fontWeight: '500',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '8px 12px 4px',
  }

  const optionStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: isActive ? '#0f2219' : 'transparent',
    border: 'none',
    padding: '9px 12px',
    color: isActive ? '#1db97b' : '#ccc',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    fontWeight: isActive ? '500' : '400',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  })

  return (
    <div style={{ marginBottom: mobile ? '0' : '24px', width: mobile && !compact ? '100%' : 'auto' }}>
      <div style={{
        display: 'flex',
        alignItems: mobile && !compact ? 'stretch' : 'center',
        gap: mobile ? '8px' : '12px',
        flexDirection: mobile && !compact ? 'column' : 'row',
        width: mobile && !compact ? '100%' : 'auto',
      }}>

        {/* Dropdown trigger */}
        <div ref={dropdownRef} style={{ position: 'relative', width: mobile && !compact ? '100%' : 'auto' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#111',
              border: '0.5px solid #1e1e1e',
              borderRadius: '10px',
              padding: compact ? '7px 10px' : mobile ? '10px 12px' : '9px 14px',
              color: '#fff',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: compact ? '12px' : '13px',
              fontWeight: '500',
              cursor: 'pointer',
              minWidth: compact ? 'unset' : mobile ? '0' : '180px',
              width: mobile && !compact ? '100%' : 'auto',
            }}
          >
            <span style={{ flex: 1, textAlign: 'left' }}>
              {mobile && showSelectedNameOnMobile
                ? (active?.name || active?.firm_name || 'Select account')
                : active?.type === 'personal'
                  ? 'Personal Account'
                  : active
                    ? 'Challenge Account'
                    : 'Select account'}
            </span>
            <svg
              width="10" height="6" viewBox="0 0 10 6" fill="none"
              style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
            >
              <path d="M1 1l4 4 4-4" stroke="#777" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: mobile && !compact ? '100%' : '220px',
              width: mobile && !compact ? '100%' : 'auto',
              background: '#111',
              border: '0.5px solid #1e1e1e',
              borderRadius: '10px',
              zIndex: 100,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {personal.length > 0 && (
                <>
                  <span style={groupLabelStyle}>Personal</span>
                  {personal.map(acc => (
                    <button key={acc.id} onClick={() => handleSwitch(acc)} style={optionStyle(active?.id === acc.id)}>
                      <span>{acc.name}</span>
                      {active?.id === acc.id && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#1db97b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}

              {personal.length > 0 && challenges.length > 0 && (
                <div style={{ height: '0.5px', background: '#1a1a1a', margin: '4px 0' }} />
              )}

              {/* + New Account */}
              <button
                onClick={() => { setOpen(false); window.location.href = '/settings?section=personal-accounts' }}
                style={{
                  display: 'block', width: '100%', background: 'transparent', border: 'none',
                  padding: '9px 12px', color: '#777', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
                }}
              >
                + New Account
              </button>

              {personal.length > 0 && challenges.length > 0 && (
                <div style={{ height: '0.5px', background: '#1a1a1a', margin: '4px 0' }} />
              )}

              {challenges.length > 0 && (
                <>
                  <span style={groupLabelStyle}>Challenges</span>
                  {challenges.map(acc => (
                    <button key={acc.id} onClick={() => handleSwitch(acc)} style={optionStyle(active?.id === acc.id)}>
                      <span>{acc.name}</span>
                      {active?.id === acc.id && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#1db97b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}

              <div style={{ height: '0.5px', background: '#1a1a1a', margin: '4px 0' }} />
              <button
                onClick={() => { setOpen(false); window.location.href = '/challenges' }}
                style={{
                  display: 'block', width: '100%', background: 'transparent', border: 'none',
                  padding: '9px 12px', color: '#777', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
                }}
              >
                + New Challenge
              </button>
            </div>
          )}
        </div>

        {/* Balance pill — all account types */}
        {showBalance && totalBalance !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0f0f0f',
            border: '0.5px solid #1a1a1a',
            borderRadius: '10px',
            padding: mobile ? '10px 12px' : '9px 14px',
            width: mobile ? '100%' : 'auto',
            boxSizing: 'border-box',
          }}>
            <span style={{ color: '#777', fontFamily: 'DM Sans, sans-serif', fontSize: '11px' }}>
              Balance
            </span>
            <span style={{
              color: totalBalance >= (Number(active.account_size) || 0) ? '#1db97b' : '#c03535',
              fontFamily: 'DM Mono, monospace',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

      </div>
    </div>
  )
}