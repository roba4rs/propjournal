import { useEffect, useState, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { supabase } from '../supabaseClient'

// ── Dot color by type ────────────────────────────────────────────────────────
const DOT_COLOR = {
  daily_dd_warning: '#f59e0b',
  daily_dd_hit:     '#c03535',
  max_dd_warning:   '#f59e0b',
  max_dd_hit:       '#c03535',
  profit_target:    '#1db97b',
  challenge_passed: '#1db97b',
  challenge_failed: '#c03535',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  // ── Fetch all notifications ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchNotifications() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoading(false)

      // Mark all as read on open
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
    fetchNotifications()
  }, [])

  // ── Realtime: new inserts appear live ───────────────────────────────────
  useEffect(() => {
    const channelName = `notifications-page-${Date.now()}`

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      if (channelRef.current) supabase.removeChannel(channelRef.current)

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          setNotifications(prev => [{ ...payload.new, read: true }, ...prev])
          // Mark it read immediately since user is on this page
          supabase.from('notifications').update({ read: true }).eq('id', payload.new.id)
        })
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // ── Mark all read manually ───────────────────────────────────────────────
  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingLeft: '52px', paddingRight: '16px',
        zIndex: 201, pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '15px', fontWeight: '500', color: '#e0e0e0',
          pointerEvents: 'auto',
        }}>Notifications</span>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{
              background: 'none', border: 'none',
              color: '#1db97b', fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px', cursor: 'pointer', pointerEvents: 'auto',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Content — below top bar, above bottom tab bar */}
      <div style={{
        paddingTop: '52px',
        paddingBottom: 'calc(60px + env(safe-area-inset-bottom))',
      }}>
        {loading && (
          <div style={{
            padding: '60px 24px', textAlign: 'center',
            color: '#666', fontFamily: "'DM Mono', monospace", fontSize: '12px',
          }}>Loading…</div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{
            padding: '80px 24px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ fontSize: '32px' }}>🔔</div>
            <p style={{
              color: '#666', fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px', margin: 0,
            }}>No notifications yet</p>
            <p style={{
              color: '#555', fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px', margin: 0,
            }}>You'll be alerted when drawdown or profit thresholds are hit.</p>
          </div>
        )}

        {!loading && notifications.map((n, i) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              borderBottom: '0.5px solid #111',
              background: n.read ? 'transparent' : '#0f1410',
            }}
          >
            {/* Colored dot */}
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: DOT_COLOR[n.type] || '#777',
              flexShrink: 0, marginTop: '5px',
            }} />

            {/* Message + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: '0 0 5px 0',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px', lineHeight: '1.5',
                color: n.read ? '#777' : '#ccc',
              }}>{n.message}</p>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px', color: '#666',
              }}>{timeAgo(n.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
