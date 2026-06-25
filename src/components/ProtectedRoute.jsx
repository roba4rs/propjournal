import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

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
        // active plan, do nothing
      } else {
        const trialStart = new Date(userData.trial_start)
        const trialEnd = new Date(trialStart)
        trialEnd.setDate(trialEnd.getDate() + 7)
        if (now > trialEnd) {
          navigate('/pricing?expired=true', { replace: true })
        }
      }
    }

    setChecking(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await checkTrial(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session)
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (session === undefined || checking) return null
  if (!session) return <Navigate to="/login" replace />
  return children
}