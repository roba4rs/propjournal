import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)
  const [trialExpired, setTrialExpired] = useState(false)
  const [checking, setChecking] = useState(true)

  const checkTrial = async (session) => {
    if (!session) {
      setChecking(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('trial_start, plan, plan_expires_at')
      .eq('id', session.user.id)
      .single()

    if (userData) {
      const now = new Date()
      if (userData.plan_expires_at && new Date(userData.plan_expires_at) > now) {
        setTrialExpired(false)
      } else {
        const trialStart = new Date(userData.trial_start)
        const trialEnd = new Date(trialStart)
        trialEnd.setDate(trialEnd.getDate() + 7)
        if (now > trialEnd) {
          setTrialExpired(true)
        }
      }
    }

    setChecking(false)
  }

  useEffect(() => {
    // Initial session check only
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkTrial(session)
    })

    // Only react to actual sign-in/sign-out, not token refreshes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined || checking) return null
  if (!session) return <Navigate to="/login" replace />
  if (trialExpired) return <Navigate to="/pricing" replace />
  return children
}
