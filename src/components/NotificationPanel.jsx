import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

// ── Dot color by notification type ──────────────────────────────────────────
const DOT_COLOR = {
  daily_dd_warning: 'var(--warning)',
  daily_dd_hit:     'var(--red)',
  max_dd_warning:   'var(--warning)',
  max_dd_hit:       'var(--red)',
  profit_target:    'var(--brand)',
  challenge_passed: 'var(--brand)',
  challenge_failed: 'var(--red)',
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
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || cancelled) return

      const topic = `notifications-panel-${session.user.id}`

      // See Sidebar.jsx for why this stale-channel check is necessary:
      // supabase.channel(topic) reuses an existing channel for a matching
      // topic, and .on() cannot be called on one that's already subscribed.
      const stale = supabase.getChannels().find(c => c.topic === `realtime:${topic}`)
      if (stale) supabase.removeChannel(stale)

      if (cancelled) return

      const channel = supabase
        .channel(topic)
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
      cancelled = true
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
        background: 'var(--bg-hover)',
        border: '0.5px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '0.5px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: '700',
          fontSize: '14px',
          color: 'var(--text-primary)',
        }}>Notifications</span>
        <button
          onClick={markAllRead}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-faint)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
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
            color: 'var(--text-muted)',
            fontFamily: 'DM Mono, monospace',
            fontSize: '12px',
          }}>Loading…</div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
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
              borderBottom: '0.5px solid var(--bg-surface)',
              background: n.read ? 'transparent' : 'var(--green-bg)',
              cursor: n.read ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = 'var(--bg-surface)' }}
            onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = 'var(--green-bg)' }}
          >
            {/* Colored dot */}
            <div style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: DOT_COLOR[n.type] || 'var(--text-faint)',
              flexShrink: 0,
              marginTop: '5px',
            }} />

            {/* Message + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: '0 0 4px 0',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: n.read ? 'var(--text-muted)' : 'var(--text-soft)',
                lineHeight: '1.45',
              }}>{n.message}</p>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}>{timeAgo(n.created_at)}</span>
            </div>

            {/* Unread dot indicator */}
            {!n.read && (
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--brand)',
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