import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  const checkTrial = async (user) => {
    if (!user) {
      setChecking(false)
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('trial_start, plan, plan_expires_at')
      .eq('id', user.id)
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
    // getUser() validates the token against Supabase (and refreshes if needed)
    // instead of trusting whatever's cached in local storage. getSession() was
    // causing false logouts on cold load when the cached access token had expired.
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      await checkTrial(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (user === undefined || checking) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}