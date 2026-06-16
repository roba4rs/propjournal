import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ChallengeTracker from './pages/ChallengeTracker'
import TradeLog from './pages/TradeLog'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Pricing from './pages/Pricing'
import AuthCallback from './pages/AuthCallback'
import ProtectedRoute from './components/ProtectedRoute'
import Notifications from './pages/Notifications'
import Terms from './pages/Terms'
import PrivacyPolicy from './pages/PrivacyPolicy'
import RefundPolicy from './pages/RefundPolicy'
import { supabase } from './supabaseClient'
import { SidebarProvider } from './SidebarContext'

function AuthListener() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const authPages = ['/login', '/signup']
        if (authPages.includes(location.pathname)) {
          navigate('/dashboard')
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  return null
}

function App() {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <AuthListener />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><ChallengeTracker /></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute><TradeLog /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  )
}

export default App