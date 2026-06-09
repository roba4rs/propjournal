import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const { register, handleSubmit, formState: { errors }, watch } = useForm()
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    setLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name }
        }
      })
      if (error) throw error
      navigate('/dashboard')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
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
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#111',
        border: '0.5px solid #1e1e1e',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          color: '#fff',
          fontFamily: 'Syne, sans-serif',
          fontSize: '24px',
          marginBottom: '8px',
        }}>Create account</h1>
        <p style={{
          color: '#999',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          marginBottom: '32px',
        }}>Start your 7-day free trial</p>

        {/* GOOGLE BUTTON */}
        <button
          onClick={handleGoogleSignUp}
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

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
          <span style={{ color: '#999', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>or</span>
          <div style={{ flex: 1, height: '0.5px', background: '#1e1e1e' }} />
        </div>

        {/* EMAIL/PASSWORD FORM */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', color: '#aaa',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '8px',
            }}>Full name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              placeholder="Robel Gidey"
              style={inputStyle}
            />
            {errors.name && (
              <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                {errors.name.message}
              </p>
            )}
          </div>

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
              style={inputStyle}
            />
            {errors.email && (
              <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', color: '#aaa',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '8px',
            }}>Password</label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              type="password"
              placeholder="••••••••"
              style={inputStyle}
            />
            {errors.password && (
              <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{
              display: 'block', color: '#aaa',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', marginBottom: '8px',
            }}>Confirm password</label>
            <input
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === watch('password') || 'Passwords do not match'
              })}
              type="password"
              placeholder="••••••••"
              style={inputStyle}
            />
            {errors.confirmPassword && (
              <p style={{ color: '#c03535', fontSize: '12px', marginTop: '6px' }}>
                {errors.confirmPassword.message}
              </p>
            )}
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
              fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{
          color: '#999', fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px', textAlign: 'center', marginTop: '24px',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1db97b', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
