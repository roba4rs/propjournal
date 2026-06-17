import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'

const features = [
  'Unlimited trades',
  'Unlimited challenge accounts',
  'Screenshot uploads',
  'Full analytics + charts',
  'Calendar heatmap',
  'Challenge rule tracker',
]

const plans = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 12,
    perMonth: 12,
    billed: 'Billed monthly · cancel anytime',
    save: null,
    highlight: false,
  },
  {
    id: 'biannual',
    label: '6 Months',
    price: 10,
    perMonth: 10,
    billed: '$60 billed every 6 months',
    save: 'Save 17%',
    highlight: true,
  },
  {
    id: 'annual',
    label: 'Annual',
    price: 8,
    perMonth: 8,
    billed: '$96 billed every year',
    save: 'Save 33%',
    highlight: false,
  },
]

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1db97b" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function Pricing() {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const navigate = useNavigate()

  const expired = new URLSearchParams(window.location.search).get('expired') === 'true'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function handleUpgrade(planId) {
    setLoading(planId)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, user_id: user.id, email: user.email }),
      })
      const data = await response.json()
      if (!response.ok) { setError('Failed to create invoice. Please try again.'); return }
      window.open(data.payment_url, '_blank')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', background: '#0a0a0a', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{
        marginLeft: isMobile ? '0' : '220px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '72px 16px 90px' : '48px 40px',
        fontFamily: 'DM Sans, sans-serif',
        boxSizing: 'border-box',
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? '24px' : '48px',
          width: '100%',
        }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: isMobile ? '22px' : '30px',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '8px',
            marginTop: 0,
            letterSpacing: '-0.02em',
          }}>
            {expired ? 'Your free trial has ended.' : 'Take your prop trading seriously.'}
          </h1>
          <p style={{ color: '#777', fontSize: '14px', margin: 0 }}>
            {expired ? 'Upgrade your plan to continue.' : 'Upgrade your plan.'}
          </p>
        </div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? '12px' : '16px',
          width: '100%',
          maxWidth: isMobile ? '420px' : '860px',
        }}>
          {plans.map((plan) => (
            <div key={plan.id} style={{
              background: plan.highlight ? 'rgba(29,185,123,0.04)' : '#161616',
              border: plan.highlight ? '2px solid #1db97b' : '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: isMobile ? '18px 16px' : '28px 24px',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              alignItems: isMobile ? 'center' : 'stretch',
              boxSizing: 'border-box',
            }}>

              {isMobile ? (
                <>
                  {/* Left: label + billing info */}
                  <div style={{ flex: 1 }}>
                    {plan.highlight && (
                      <div style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        background: 'rgba(29,185,123,0.12)',
                        color: '#1db97b',
                        borderRadius: '20px',
                        padding: '2px 10px',
                        marginBottom: '6px',
                        fontWeight: '500',
                      }}>
                        Most popular
                      </div>
                    )}
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fff',
                      fontFamily: 'Syne, sans-serif',
                      marginBottom: '3px',
                    }}>
                      {plan.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777', lineHeight: '1.4' }}>{plan.billed}</div>
                    {plan.save && (
                      <div style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        background: 'rgba(29,185,123,0.12)',
                        color: '#1db97b',
                        borderRadius: '20px',
                        padding: '2px 8px',
                        marginTop: '6px',
                      }}>
                        {plan.save}
                      </div>
                    )}
                  </div>

                  {/* Right: price + button */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '10px',
                    flexShrink: 0,
                    marginLeft: '16px',
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                        <sup style={{
                          fontFamily: 'Syne, sans-serif',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#fff',
                          marginTop: '5px',
                          marginRight: '1px',
                        }}>$</sup>
                        <span style={{
                          fontFamily: 'Syne, sans-serif',
                          fontSize: '34px',
                          fontWeight: '700',
                          color: '#fff',
                          lineHeight: '1',
                          letterSpacing: '-0.03em',
                        }}>
                          {plan.perMonth}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#777' }}>/ month</div>
                    </div>
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading === plan.id}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: plan.highlight ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
                        backgroundColor: plan.highlight ? '#1db97b' : 'transparent',
                        color: plan.highlight ? '#000' : '#fff',
                        fontSize: '12px',
                        fontWeight: '600',
                        fontFamily: 'DM Sans, sans-serif',
                        cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                        opacity: loading === plan.id ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {loading === plan.id ? '...' : 'Upgrade'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {plan.highlight && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      background: 'rgba(29,185,123,0.12)',
                      color: '#1db97b',
                      borderRadius: '20px',
                      padding: '3px 12px',
                      marginBottom: '14px',
                      fontWeight: '500',
                      alignSelf: 'flex-start',
                    }}>
                      Most popular
                    </div>
                  )}

                  <div style={{
                    fontSize: '11px',
                    color: '#777',
                    textTransform: 'uppercase',
                    letterSpacing: '0.09em',
                    marginBottom: '10px',
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    {plan.label}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <sup style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#fff',
                      marginTop: '8px',
                      marginRight: '1px',
                    }}>$</sup>
                    <span style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '42px',
                      fontWeight: '700',
                      color: '#fff',
                      lineHeight: '1',
                      letterSpacing: '-0.03em',
                    }}>
                      {plan.perMonth}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#777', marginBottom: '4px' }}>per month</div>
                  <div style={{ fontSize: '11px', color: '#777', marginBottom: plan.save ? '6px' : '20px' }}>{plan.billed}</div>

                  {plan.save && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      background: 'rgba(29,185,123,0.12)',
                      color: '#1db97b',
                      borderRadius: '20px',
                      padding: '2px 10px',
                      marginBottom: '16px',
                      alignSelf: 'flex-start',
                    }}>
                      {plan.save}
                    </div>
                  )}

                  <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', margin: '0 0 16px 0' }} />

                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 20px 0',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    {features.map((feature) => (
                      <li key={feature} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#aaa',
                      }}>
                        <CheckIcon />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading === plan.id}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      borderRadius: '9px',
                      border: plan.highlight ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
                      backgroundColor: plan.highlight ? '#1db97b' : 'transparent',
                      color: plan.highlight ? '#000' : '#fff',
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                      opacity: loading === plan.id ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {loading === plan.id ? 'Processing...' : 'Upgrade'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: '20px', color: '#c03535', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <p style={{ marginTop: '20px', fontSize: '12px', color: '#555', textAlign: 'center' }}>
          Payments processed securely · Cancel anytime
        </p>
      </main>
    </div>
  )
}
