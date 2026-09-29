import { useState, useEffect, useCallback } from 'react'
import { Fingerprint } from 'lucide-react'
import { supabase } from '../supabaseClient'

const ff = 'DM Sans, sans-serif'

const DEVICE_FLAG = 'pj_passkey_device'

// Remember on this device that fingerprint login was set up (drives the login screen layout)
export function deviceHasPasskey() {
  try { return passkeysSupported() && localStorage.getItem(DEVICE_FLAG) === '1' } catch { return false }
}
export function markDevicePasskey(on) {
  try { if (on) localStorage.setItem(DEVICE_FLAG, '1'); else localStorage.removeItem(DEVICE_FLAG) } catch { /* storage unavailable */ }
}

export function passkeysSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

// Turn a passkey error into something a user can act on
export function passkeyErrorMessage(err, fallback) {
  const name = err?.name || err?.cause?.name || ''
  if (name === 'NotAllowedError' || name === 'AbortError') return 'Cancelled. Nothing was changed.'
  if (name === 'InvalidStateError') return 'This device already has a passkey for your account.'
  return fallback
}

// Register / list / remove fingerprint (passkey) sign-in for the logged-in user
export default function PasskeySettings({ standalone = false }) {
  const supported = passkeysSupported()
  const [passkeys, setPasskeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok' | 'err', text }

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.passkey.list()
      if (error) throw error
      setPasskeys(data || [])
      if ((data || []).length === 0) markDevicePasskey(false)
    } catch (err) {
      console.error('Could not load passkeys', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (supported) load(); else setLoading(false) }, [supported, load])

  if (!supported) {
    return (
      <div style={standalone ? {} : { marginTop: '18px', paddingTop: '16px', borderTop: '0.5px solid var(--border-color)' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '11px', margin: '0 0 6px 0' }}>Fingerprint / Face ID login</p>
        <p style={{ color: 'var(--text-faint)', fontFamily: ff, fontSize: '12px', margin: 0 }}>
          This browser or device doesn't support fingerprint login. Try Chrome or Safari, and make sure a screen lock is set on your phone.
        </p>
      </div>
    )
  }

  const add = async () => {
    setBusy(true); setMsg(null)
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) throw error
      markDevicePasskey(true)
      setMsg({ type: 'ok', text: 'Fingerprint login is on for this device.' })
      await load()
    } catch (err) {
      console.error(err)
      setMsg({ type: 'err', text: passkeyErrorMessage(err, 'Could not set up fingerprint login. Try again.') })
    } finally { setBusy(false) }
  }

  const remove = async p => {
    setBusy(true); setMsg(null)
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId: p.id })
      if (error) throw error
      await load()
    } catch (err) {
      console.error(err)
      setMsg({ type: 'err', text: 'Could not remove it. Try again.' })
    } finally { setBusy(false) }
  }

  return (
    <div style={standalone ? {} : { marginTop: '18px', paddingTop: '16px', borderTop: '0.5px solid var(--border-color)' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: ff, fontSize: '11px', margin: '0 0 6px 0' }}>Fingerprint / Face ID login</p>
      <p style={{ color: 'var(--text-faint)', fontFamily: ff, fontSize: '11px', margin: '0 0 10px 0' }}>
        Sign in with your phone's fingerprint or face instead of typing. Set it up once on each device.
      </p>

      {!loading && passkeys.length > 0 && (
        <div style={{ border: '0.5px solid var(--border-color)', borderRadius: '8px', marginBottom: '10px' }}>
          {passkeys.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderTop: i === 0 ? 'none' : '0.5px solid var(--border-color)' }}>
              <Fingerprint size={16} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', color: 'var(--text-primary)', fontFamily: ff, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.friendly_name || 'Passkey'}</span>
                <span style={{ display: 'block', color: 'var(--text-faint)', fontFamily: ff, fontSize: '11px' }}>Added {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => remove(p)} disabled={busy} style={{ background: 'transparent', border: '0.5px solid var(--border-color)', borderRadius: '6px', color: 'var(--red)', fontFamily: ff, fontSize: '12px', padding: '6px 10px', cursor: busy ? 'default' : 'pointer', flexShrink: 0 }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={add}
        disabled={busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '0.5px solid var(--border-color-2)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)', fontFamily: ff, fontSize: '13px', cursor: busy ? 'default' : 'pointer', minHeight: '44px' }}
      >
        <Fingerprint size={16} />
        {busy ? 'Waiting…' : passkeys.length > 0 ? 'Add another device' : 'Enable fingerprint login'}
      </button>

      {msg && <p style={{ color: msg.type === 'ok' ? 'var(--brand)' : 'var(--red)', fontFamily: ff, fontSize: '12px', margin: '10px 0 0 0' }}>{msg.text}</p>}
    </div>
  )
}