import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Flame, TrendingUp, Settings2, BookOpen, Plus, Bell } from 'lucide-react'

import { supabase } from '../supabaseClient'
import { useEffect, useState, useRef } from 'react'
import { useSidebar } from '../SidebarContext'
import NotificationPanel from './NotificationPanel'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Challenges', path: '/challenges', icon: Flame },
  { label: 'Trade Log', path: '/trades', icon: BookOpen },
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
  { label: 'Settings', path: '/settings', icon: Settings2 },
]

// Bottom tab bar icons — Trades slot is replaced by a + FAB button
const tabItems = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Challenges', path: '/challenges', icon: Flame },
  null, // placeholder for center + button
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
  { label: 'Alerts', path: '/notifications', icon: Bell },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { collapsed, toggle } = useSidebar()
  const [user, setUser] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [unreadCount, setUnreadCount] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const drawerRef = useRef(null)
  const bellRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
    // If user navigated to notifications page, reset badge
    if (location.pathname === '/notifications') {
      setUnreadCount(0)
    }
  }, [location.pathname])

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return
    const handleClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [drawerOpen])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = drawerOpen ? 'hidden' : ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, isMobile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('users')
          .select('name, plan')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  // ── Notifications: initial unread count + realtime subscription ──
  const notifChannelRef = useRef(null)

  useEffect(() => {
    const channelName = `notifications-sidebar-${Date.now()}`

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      const userId = session.user.id

      // Fetch initial unread count
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .then(({ count }) => setUnreadCount(count || 0))

      // Remove stale channel from previous StrictMode mount if present
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          setUnreadCount(c => c + 1)
        })
        .subscribe()

      notifChannelRef.current = channel
    })

    return () => {
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current)
        notifChannelRef.current = null
      }
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const confirmLogout = () => setShowConfirm(true)
  const cancelLogout = () => setShowConfirm(false)

  // ─── DESKTOP SIDEBAR (unchanged) ────────────────────────────────────────────
  if (!isMobile) {
    const w = collapsed ? '60px' : '220px'
    return (
      <div style={{
        width: w,
        minHeight: '100vh',
        background: '#0d0d0d',
        borderRight: '0.5px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo + Chevron */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '0.5px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '69px',
          maxHeight: '69px',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <span style={{
              color: '#fff',
              fontFamily: 'Syne, sans-serif',
              fontWeight: '700',
              fontSize: '18px',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
            }}>Prop<span style={{ color: '#1db97b' }}>Journal</span></span>
          )}
          <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#666'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              title={collapsed ? item.label : ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? '0' : '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                textDecoration: 'none',
                background: isActive ? '#0f2219' : 'transparent',
                color: isActive ? '#1db97b' : '#666',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: isActive ? '500' : '400',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              })}
            >
              <item.icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {!collapsed && item.label}
            </NavLink>
          ))}

          {/* Bell — Notifications */}
          <button
            ref={bellRef}
            onClick={() => setPanelOpen(o => !o)}
            title={collapsed ? 'Notifications' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: collapsed ? '0' : '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              marginTop: '4px',
              background: panelOpen ? '#0f2219' : 'transparent',
              color: panelOpen ? '#1db97b' : '#666',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              fontWeight: '400',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!panelOpen) e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { if (!panelOpen) e.currentTarget.style.color = '#666' }}
          >
            {/* Bell icon + badge */}
            <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
              <Bell size={16} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-6px',
                  background: '#c03535',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: '9px',
                  fontWeight: '700',
                  fontFamily: 'DM Mono, monospace',
                  minWidth: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  padding: '0 2px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && 'Notifications'}
          </button>
        </nav>

        {/* Notification Panel */}
        {panelOpen && (
          <NotificationPanel
            onClose={() => setPanelOpen(false)}
            onRead={(delta) => setUnreadCount(c => Math.max(0, c - delta))}
            anchorRef={bellRef}
          />
        )}

        {/* User Info + Logout */}
        <div style={{
          padding: collapsed ? '16px 8px' : '16px 20px',
          borderTop: '0.5px solid #1a1a1a',
        }}>
          {user && !collapsed && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{
                color: '#fff',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: '500',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{user.name}</p>
              <span style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                background: '#0f2219',
                border: '0.5px solid #1a3826',
                borderRadius: '4px',
                color: '#1db97b',
                fontFamily: 'DM Mono, monospace',
                fontSize: '11px',
              }}>{user.plan}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : ''}
            style={{
              width: '100%',
              background: 'transparent',
              border: '0.5px solid #1e1e1e',
              borderRadius: '8px',
              padding: '9px',
              color: '#666',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: collapsed ? '16px' : '13px',
              cursor: 'pointer',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? '⏻' : 'Sign out'}
          </button>
        </div>
      </div>
    )
  }

  // ─── MOBILE: TOP BAR + DRAWER + BOTTOM TAB BAR ──────────────────────────────
  return (
    <>
      {/* Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '52px',
        background: '#0d0d0d',
        borderBottom: '0.5px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
      }}>
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            borderRadius: '6px',
          }}
          aria-label="Open menu"
        >
          <span style={{ display: 'block', width: '20px', height: '1.5px', background: '#aaa', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '1.5px', background: '#aaa', borderRadius: '2px' }} />
          <span style={{ display: 'block', width: '20px', height: '1.5px', background: '#aaa', borderRadius: '2px' }} />
        </button>

        {/* Center intentionally blank (no brand text on mobile header) */}

        {/* Right side — reserved for account switcher pill (added per page) */}
        <div style={{ width: '32px' }} />
      </div>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 300,
          backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '200px',
          background: '#0d0d0d',
          borderRight: '0.5px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 400,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '0 20px',
          height: '64px',
          borderBottom: '0.5px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{
            color: '#fff',
            fontFamily: 'Syne, sans-serif',
            fontWeight: '700',
            fontSize: '18px',
            letterSpacing: '-0.3px',
          }}>Prop<span style={{ color: '#1db97b' }}>Journal</span></span>
        </div>



        {/* Drawer Nav Links */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '4px',
                textDecoration: 'none',
                background: isActive ? '#0f2219' : 'transparent',
                color: isActive ? '#1db97b' : '#aaa',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                fontWeight: isActive ? '500' : '400',
              })}
            >
              <item.icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Drawer Footer — User info + Sign out */}
        <div style={{
          padding: '16px 20px',
          paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)',
          borderTop: '0.5px solid #1a1a1a',
        }}>
          {user && (
            <div
              onClick={confirmLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: '0.5px solid #1a1a1a',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#111'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#0f2219',
                border: '0.5px solid #1a3826',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: '#1db97b', fontFamily: 'Syne, sans-serif', fontWeight: '700', fontSize: '13px' }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  margin: '0 0 3px 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{user.name}</p>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  background: '#0f2219',
                  border: '0.5px solid #1a3826',
                  borderRadius: '4px',
                  color: '#1db97b',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '10px',
                }}>{user.plan}</span>
              </div>
              <span style={{ color: '#666', fontSize: '15px', flexShrink: 0 }}>⏻</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#0d0d0d',
        borderTop: '0.5px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 600,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {tabItems.map((item, idx) => {
          // Center slot: + button that opens Log Trade form
          if (item === null) {
            return (
              <button
                key="log-trade"
                onClick={() => {
                  navigate('/trades', { state: { openForm: true } })
                }}
                style={{
                  flex: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#1db97b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 12px rgba(29,185,123,0.35)',
                }}>
                  <Plus size={22} strokeWidth={2.5} color="#0a0a0a" />
                </div>
              </button>
            )
          }

          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                flex: 1,
                height: '100%',
                textDecoration: 'none',
                color: isActive ? '#1db97b' : '#777',
                transition: 'color 0.15s ease',
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative', display: 'flex' }}>
                <item.icon size={20} strokeWidth={1.8} />
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-7px',
                    background: '#c03535',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: '9px',
                    fontWeight: '700',
                    fontFamily: 'DM Mono, monospace',
                    minWidth: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    padding: '0 2px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: isActive ? '500' : '400',
                letterSpacing: '0.2px',
              }}>{item.label}</span>
              {isActive && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '28px',
                  height: '2px',
                  background: '#1db97b',
                  borderRadius: '0 0 2px 2px',
                }} />
              )}
            </NavLink>
          )
        })}
      </div>

      {/* Sign Out Confirmation */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }}>
          <div style={{
            background: '#111',
            border: '0.5px solid #222',
            borderRadius: '16px',
            padding: '20px 20px 16px',
            width: '260px',
          }}>
            <p style={{
              color: '#fff',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              margin: '0 0 4px 0',
              textAlign: 'center',
            }}>Sign out?</p>
            <p style={{
              color: '#777',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              margin: '0 0 16px 0',
              textAlign: 'center',
            }}>You'll be returned to the login screen.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={cancelLogout}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '0.5px solid #2a2a2a',
                  borderRadius: '8px',
                  padding: '9px',
                  color: '#aaa',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  background: '#1a0a0a',
                  border: '0.5px solid #3a1a1a',
                  borderRadius: '8px',
                  padding: '9px',
                  color: '#c03535',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
