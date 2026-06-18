import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import LoadingScreen from './components/LoadingScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <LoadingScreen message="Starting up..." />

  return session
    ? <Dashboard session={session} darkMode={darkMode} setDarkMode={setDarkMode} />
    : <AuthPage />
}