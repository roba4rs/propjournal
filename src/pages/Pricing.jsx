import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import { usePaddle } from '../PaddleContext'
import { useTheme } from '../ThemeContext'

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

const PRICE_IDS = {
  monthly: process.env.REACT_APP_PADDLE_MONTHLY_PRICE_ID,
  biannual: process.env.REACT_APP_PADDLE_SIXMONTH_PRICE_ID,
  annual: process.env.REACT_APP_PADDLE_YEARLY_PRICE_ID,
}

// Theme tokens shared across Pricing's sub-components.
// PropJournal's accent green (#1db97b) stays constant across both modes —
// only neutrals (backgrounds, borders, text) flip.
function getColors(isLight) {
  return isLight
    ? {
        pageBg: '#f7f7f8',
        cardBg: '#ffffff',
        cardBorder: 'rgba(0,0,0,0.08)',
        highlightCardBg: 'rgba(29,185,123,0.05)',
        text: '#18181b',
        textMuted: '#6b6b70',
        textFaint: '#9a9aa0',
        modalBg: '#ffffff',
        modalBorder: 'rgba(0,0,0,0.1)',
        optionBorder: 'rgba(0,0,0,0.12)',
        optionHoverBg: 'rgba(0,0,0,0.04)',
        accent: '#1db97b',
        accentSoft: 'rgba(29,185,123,0.10)',
        danger: '#c03535',
      }
    : {
        pageBg: '#0a0a0a',
        cardBg: '#161616',
        cardBorder: 'rgba(255,255,255,0.07)',
        highlightCardBg: 'rgba(29,185,123,0.04)',
        text: '#ffffff',
        textMuted: '#777777',
        textFaint: '#555555',
        modalBg: '#161616',
        modalBorder: 'rgba(255,255,255,0.1)',
        optionBorder: 'rgba(255,255,255,0.12)',
        optionHoverBg: 'rgba(255,255,255,0.05)',
        accent: '#1db97b',
        accentSoft: 'rgba(29,185,123,0.12)',
        danger: '#c03535',
      }
}

const CheckIcon = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function PaymentModal({ plan, onClose, onCard, onCrypto, loading, c }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: c.modalBg,
          border: `0.5px solid ${c.modalBorder}`,
          borderRadius: '16px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '360px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '18px',
            fontWeight: '700',
            color: c.text,
            margin: '0 0 6px 0',
          }}>
            How would you like to pay?
          </h2>
          <p style={{ fontSize: '13px', color: c.textMuted, margin: 0 }}>
            {plan.label} plan · ${plan.price}{plan.id !== 'monthly' ? ' total' : '/mo'}
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Card */}
          <button
            onClick={onCard}
            disabled={!!loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '10px',
              border: `0.5px solid ${c.optionBorder}`,
              background: loading === 'card' ? c.optionHoverBg : 'transparent',
              color: c.text,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading && loading !== 'card' ? 0.4 : 1,
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>💳</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                {loading === 'card' ? 'Opening checkout...' : 'Pay with Card'}
              </div>
              <div style={{ fontSize: '11px', color: c.textMuted }}>Visa, Mastercard, Amex via Paddle</div>
            </div>
          </button>

          {/* Crypto */}
          <button
            onClick={onCrypto}
            disabled={!!loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '10px',
              border: `0.5px solid ${c.optionBorder}`,
              background: loading === 'crypto' ? c.optionHoverBg : 'transparent',
              color: c.text,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading && loading !== 'crypto' ? 0.4 : 1,
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>₿</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                {loading === 'crypto' ? 'Creating invoice...' : 'Pay with Crypto'}
              </div>
              <div style={{ fontSize: '11px', color: c.textMuted }}>BTC, ETH, USDT and more via NOWPayments</div>
            </div>
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          disabled={!!loading}
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: c.textFaint,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Pricing() {
  const { isLight } = useTheme()
  const c = getColors(isLight)

  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [selectedPlan, setSelectedPlan] = useState(null) // plan object for modal
  const [modalLoading, setModalLoading] = useState(null) // 'card' | 'crypto' | null
  const navigate = useNavigate()
  const paddle = usePaddle()

  const expired = new URLSearchParams(window.location.search).get('expired') === 'true'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return null }
    return user
  }

  function handleUpgradeClick(planId) {
    const plan = plans.find(p => p.id === planId)
    setSelectedPlan(plan)
    setError('')
  }

  async function handleCard() {
    setModalLoading('card')
    setError('')
    try {
      const user = await getUser()
      if (!user) return

      if (!paddle) {
        setError('Checkout is still loading. Please wait a moment and try again.')
        setSelectedPlan(null)
        return
      }

      const priceId = PRICE_IDS[selectedPlan.id]
      if (!priceId) {
        setError('This plan is not available right now.')
        setSelectedPlan(null)
        return
      }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: user.email },
        customData: { user_id: user.id },
      })

      setSelectedPlan(null)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setSelectedPlan(null)
    } finally {
      setModalLoading(null)
    }
  }

  async function handleCrypto() {
    setModalLoading('crypto')
    setError('')
    try {
      const user = await getUser()
      if (!user) return

      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan.id,
          user_id: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.payment_url) {
        setError('Failed to create crypto invoice. Please try again.')
        setSelectedPlan(null)
        return
      }

      window.location.href = data.payment_url
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setSelectedPlan(null)
    } finally {
      setModalLoading(null)
    }
  }

  return (
    <div style={{ display: 'flex', background: c.pageBg, minHeight: '100vh' }}>
      <Sidebar />

      {/* Payment method modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          loading={modalLoading}
          onClose={() => { if (!modalLoading) setSelectedPlan(null) }}
          onCard={handleCard}
          onCrypto={handleCrypto}
          c={c}
        />
      )}

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
            color: c.text,
            marginBottom: '8px',
            marginTop: 0,
            letterSpacing: '-0.02em',
          }}>
            {expired ? 'Your free trial has ended.' : 'Take your prop trading seriously.'}
          </h1>
          <p style={{ color: c.textMuted, fontSize: '14px', margin: 0 }}>
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
              background: plan.highlight ? c.highlightCardBg : c.cardBg,
              border: plan.highlight ? `2px solid ${c.accent}` : `0.5px solid ${c.cardBorder}`,
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
                        background: c.accentSoft,
                        color: c.accent,
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
                      color: c.text,
                      fontFamily: 'Syne, sans-serif',
                      marginBottom: '3px',
                    }}>
                      {plan.label}
                    </div>
                    <div style={{ fontSize: '11px', color: c.textMuted, lineHeight: '1.4' }}>{plan.billed}</div>
                    {plan.save && (
                      <div style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        background: c.accentSoft,
                        color: c.accent,
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
                          color: c.text,
                          marginTop: '5px',
                          marginRight: '1px',
                        }}>$</sup>
                        <span style={{
                          fontFamily: 'Syne, sans-serif',
                          fontSize: '34px',
                          fontWeight: '700',
                          color: c.text,
                          lineHeight: '1',
                          letterSpacing: '-0.03em',
                        }}>
                          {plan.perMonth}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: c.textMuted }}>/ month</div>
                    </div>
                    <button
                      onClick={() => handleUpgradeClick(plan.id)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: plan.highlight ? 'none' : `0.5px solid ${c.optionBorder}`,
                        backgroundColor: plan.highlight ? c.accent : 'transparent',
                        color: plan.highlight ? '#000' : c.text,
                        fontSize: '12px',
                        fontWeight: '600',
                        fontFamily: 'DM Sans, sans-serif',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Upgrade
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {plan.highlight && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      background: c.accentSoft,
                      color: c.accent,
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
                    color: c.textMuted,
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
                      color: c.text,
                      marginTop: '8px',
                      marginRight: '1px',
                    }}>$</sup>
                    <span style={{
                      fontFamily: 'Syne, sans-serif',
                      fontSize: '42px',
                      fontWeight: '700',
                      color: c.text,
                      lineHeight: '1',
                      letterSpacing: '-0.03em',
                    }}>
                      {plan.perMonth}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: c.textMuted, marginBottom: '4px' }}>per month</div>
                  <div style={{ fontSize: '11px', color: c.textMuted, marginBottom: plan.save ? '6px' : '20px' }}>{plan.billed}</div>

                  {plan.save && (
                    <div style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      background: c.accentSoft,
                      color: c.accent,
                      borderRadius: '20px',
                      padding: '2px 10px',
                      marginBottom: '16px',
                      alignSelf: 'flex-start',
                    }}>
                      {plan.save}
                    </div>
                  )}

                  <div style={{ borderTop: `0.5px solid ${c.cardBorder}`, margin: '0 0 16px 0' }} />

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
                        color: c.textMuted,
                      }}>
                        <CheckIcon color={c.accent} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgradeClick(plan.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      borderRadius: '9px',
                      border: plan.highlight ? 'none' : `0.5px solid ${c.optionBorder}`,
                      backgroundColor: plan.highlight ? c.accent : 'transparent',
                      color: plan.highlight ? '#000' : c.text,
                      fontSize: '13px',
                      fontWeight: '600',
                      fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    Upgrade
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: '20px', color: c.danger, fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <p style={{ marginTop: '20px', fontSize: '12px', color: c.textFaint, textAlign: 'center' }}>
          Payments processed securely · Cancel anytime
        </p>
      </main>
    </div>
  )
}