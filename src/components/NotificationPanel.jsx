import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

// ── Dot color by notification type ──────────────────────────────────────────
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

export default function NotificationPanel({ onClose, onRead, anchorRef }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef(null)

  // ── Fetch notifications ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetch() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotifications(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  // ── Realtime: new inserts appear live ───────────────────────────────────
  const panelChannelRef = useRef(null)

  useEffect(() => {
    const channelName = `notifications-panel-${Date.now()}`

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return

      if (panelChannelRef.current) {
        supabase.removeChannel(panelChannelRef.current)
      }

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev])
        })
        .subscribe()

      panelChannelRef.current = channel
    })

    return () => {
      if (panelChannelRef.current) {
        supabase.removeChannel(panelChannelRef.current)
        panelChannelRef.current = null
      }
    }
  }, [])

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  // ── Mark single as read ──────────────────────────────────────────────────
  async function markRead(id) {
    const n = notifications.find(n => n.id === id)
    if (!n || n.read) return
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    onRead(1)
  }

  // ── Mark all as read ─────────────────────────────────────────────────────
  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const unreadCount = notifications.filter(n => !n.read).length
    if (unreadCount === 0) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    onRead(unreadCount)
  }

  // Position panel to the right of the bell button
  const bellRect = anchorRef?.current?.getBoundingClientRect()
  const panelTop = bellRect ? Math.min(bellRect.top, window.innerHeight - 440) : 200
  const panelLeft = bellRect ? bellRect.right + 8 : 228

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${panelLeft}px`,
        top: `${panelTop}px`,
        width: '320px',
        maxHeight: '420px',
        background: '#0d0d0d',
        border: '0.5px solid #1e1e1e',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 500,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '0.5px solid #1a1a1a',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: '700',
          fontSize: '14px',
          color: '#fff',
        }}>Notifications</span>
        <button
          onClick={markAllRead}
          style={{
            background: 'none',
            border: 'none',
            color: '#777',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#1db97b'}
          onMouseLeave={e => e.currentTarget.style.color = '#777'}
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading && (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#999',
            fontFamily: 'DM Mono, monospace',
            fontSize: '12px',
          }}>Loading…</div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: '#999',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
          }}>No notifications yet</div>
        )}

        {!loading && notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 16px',
              borderBottom: '0.5px solid #111',
              background: n.read ? 'transparent' : '#0f1410',
              cursor: n.read ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = '#111' }}
            onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = '#0f1410' }}
          >
            {/* Colored dot */}
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: DOT_COLOR[n.type] || '#777',
              flexShrink: 0,
              marginTop: '5px',
            }} />

            {/* Message + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: '0 0 4px 0',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: n.read ? '#999' : '#ccc',
                lineHeight: '1.45',
              }}>{n.message}</p>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '10px',
                color: '#999',
              }}>{timeAgo(n.created_at)}</span>
            </div>

            {/* Unread dot indicator */}
            {!n.read && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#1db97b',
                flexShrink: 0,
                marginTop: '6px',
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
