import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    setLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!resetEmail) return
    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (error) throw error
      setResetSent(true)
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback'
      }
    })
  }

  const inputStyle = {
    width: '100%',
    background: '#0a0a0a',
    border: '0.5px solid #1e1e1e',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#fff',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '16px', // 16px prevents iOS zoom on focus
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100dvh', // dynamic viewport height for mobile browsers
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#111',
        border: '0.5px solid #1e1e1e',
        borderRadius: '12px',
        padding: 'clamp(24px, 5vw, 40px)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          color: '#fff',
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(20px, 5vw, 24px)',
          marginBottom: '8px',
        }}>Welcome back</h1>
        <p style={{
          color: '#666',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          marginBottom: '32px',
        }}>Sign in to your PropJournal account</p>

        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            background: 'transparent',
            border: '0.5px solid #2a2a2a',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '24px',
            transition: 'background 0.2s',
            minHeight: '44px', // minimum touch target
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#161616'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.7 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
          <span style={{ color: '#666', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>or</span>
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
        </div>

        {!showReset ? (
          <>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', color: '#aaa',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '8px',
                }}>Email</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  style={inputStyle}
                />
                {errors.email && (
                  <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  display: 'block', color: '#aaa',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '8px',
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#555', padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setAuthError(null) }}
                  style={{
                    background: 'none', border: 'none', color: '#777',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                    cursor: 'pointer', padding: '8px 0', // larger touch target
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {authError && (
                <div style={{
                  background: '#1e0d0d', border: '0.5px solid #2e1515',
                  borderRadius: '8px', padding: '12px', marginBottom: '20px',
                  color: '#c03535', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: '#1db97b', border: 'none',
                  borderRadius: '8px', padding: '13px', color: '#000',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: '600',
                  fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  minHeight: '44px', // minimum touch target
                }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p style={{
              color: '#666', fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', textAlign: 'center', marginTop: '24px',
            }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#1db97b', textDecoration: 'none' }}>
                Sign up
              </Link>
            </p>
          </>
        ) : (
          <div>
            <p style={{
              color: '#aaa', fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px', marginBottom: '20px',
            }}>
              Enter your email and we'll send you a reset link.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              autoComplete="email"
              style={{ ...inputStyle, marginBottom: '16px' }}
            />

            {resetSent && (
              <div style={{
                background: '#0f2219', border: '0.5px solid #1a3826',
                borderRadius: '8px', padding: '12px', marginBottom: '16px',
                color: '#1db97b', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              }}>
                Reset link sent — check your email.
              </div>
            )}

            {authError && (
              <div style={{
                background: '#1e0d0d', border: '0.5px solid #2e1515',
                borderRadius: '8px', padding: '12px', marginBottom: '16px',
                color: '#c03535', fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              }}>
                {authError}
              </div>
            )}

            <button
              onClick={handleForgotPassword}
              disabled={resetLoading || resetSent}
              style={{
                width: '100%', background: '#1db97b', border: 'none',
                borderRadius: '8px', padding: '13px', color: '#000',
                fontFamily: 'DM Sans, sans-serif', fontWeight: '600',
                fontSize: '15px', cursor: resetLoading ? 'not-allowed' : 'pointer',
                opacity: resetLoading || resetSent ? 0.7 : 1, marginBottom: '12px',
                minHeight: '44px',
              }}
            >
              {resetLoading ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              onClick={() => { setShowReset(false); setResetSent(false); setAuthError(null) }}
              style={{
                width: '100%', background: 'transparent',
                border: '0.5px solid #2a2a2a', borderRadius: '8px',
                padding: '12px', color: '#666',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}