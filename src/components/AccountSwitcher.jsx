import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function AccountSwitcher({
  onSwitch,
  mobile = false,
  compact = false,
  showSelectedNameOnMobile = false,
  defaultAccountId = null,
}) {
  const [accounts, setAccounts] = useState([])
  const [active, setActive] = useState(null)
  const [open, setOpen] = useState(false)
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
          const visibleData = data.filter(a => !a.is_hidden)
          const preferred = defaultAccountId
            ? (visibleData.find(a => a.id === defaultAccountId) || visibleData[0])
            : visibleData[0]
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

  const personal = accounts.filter(a => a.type === 'personal' && !a.is_hidden)
  const challenges = accounts.filter(a => a.type !== 'personal')

  const groupLabelStyle = {
    display: 'block',
    color: 'var(--text-faint-2)',
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
    background: isActive ? 'var(--green-bg)' : 'transparent',
    border: 'none',
    padding: '9px 12px',
    color: isActive ? 'var(--brand)' : 'var(--text-soft)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    fontWeight: isActive ? '500' : '400',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  })

  return (
    <div style={{ width: mobile && !compact ? '100%' : 'auto' }}>
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
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-color)',
              borderRadius: '10px',
              padding: compact ? '7px 10px' : mobile ? '10px 12px' : '9px 14px',
              color: 'var(--text-primary)',
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
              <path d="M1 1l4 4 4-4" stroke="var(--text-faint)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: mobile && !compact ? '100%' : '220px',
              width: mobile && !compact ? '100%' : 'auto',
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border-color)',
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
                          <path d="M2 6l3 3 5-5" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}

              {personal.length > 0 && challenges.length > 0 && (
                <div style={{ height: '0.5px', background: 'var(--border-color)', margin: '4px 0' }} />
              )}

              {/* + New Account */}
              <button
                onClick={() => { setOpen(false); window.location.href = '/settings?section=personal-accounts' }}
                style={{
                  display: 'block', width: '100%', background: 'transparent', border: 'none',
                  padding: '9px 12px', color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
                }}
              >
                + New Account
              </button>

              {personal.length > 0 && challenges.length > 0 && (
                <div style={{ height: '0.5px', background: 'var(--border-color)', margin: '4px 0' }} />
              )}

              {challenges.length > 0 && (
                <>
                  <span style={groupLabelStyle}>Challenges</span>
                  {challenges.map(acc => (
                    <button key={acc.id} onClick={() => handleSwitch(acc)} style={optionStyle(active?.id === acc.id)}>
                      <span>{acc.name}</span>
                      {active?.id === acc.id && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </>
              )}

              <div style={{ height: '0.5px', background: 'var(--border-color)', margin: '4px 0' }} />
              <button
                onClick={() => { setOpen(false); window.location.href = '/challenges' }}
                style={{
                  display: 'block', width: '100%', background: 'transparent', border: 'none',
                  padding: '9px 12px', color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px', cursor: 'pointer', textAlign: 'left', boxSizing: 'border-box',
                }}
              >
                + New Challenge
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}