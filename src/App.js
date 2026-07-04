import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserDetail from './pages/admin/AdminUserDetail'
import Schedule from './pages/Schedule'
import { supabase } from './supabaseClient'
import { SidebarProvider } from './SidebarContext'
import { PaddleProvider } from './PaddleContext'
import { ThemeProvider } from './ThemeContext'
import { ADMIN_USER_ID } from './constants/admin'

function RequireAdmin({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'allowed' | 'denied'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setStatus(user?.id === ADMIN_USER_ID ? 'allowed' : 'denied')
    })
  }, [])

  if (status === 'loading') return null
  if (status === 'denied') return <Navigate to="/dashboard" replace />
  return children
}

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
    <ThemeProvider>
      <PaddleProvider>
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
              <Route path="/admin/users" element={<ProtectedRoute><RequireAdmin><AdminUsers /></RequireAdmin></ProtectedRoute>} />
              <Route path="/admin/users/:userId" element={<ProtectedRoute><RequireAdmin><AdminUserDetail /></RequireAdmin></ProtectedRoute>} />
              <Route path="/schedule" element={<ProtectedRoute><RequireAdmin><Schedule /></RequireAdmin></ProtectedRoute>} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
            </Routes>
          </BrowserRouter>
        </SidebarProvider>
      </PaddleProvider>
    </ThemeProvider>
  )
}

export default App