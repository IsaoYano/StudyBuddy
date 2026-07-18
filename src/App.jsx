import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import LoadingScreen from './components/LoadingScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileState, setProfileState] = useState({ uid: null, profile: null })
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

  useEffect(() => {
    if (!session) return
    let active = true
    supabase.from('profiles').select('id, name, role').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (active) setProfileState({ uid: session.user.id, profile: data })
      })
    return () => { active = false }
  }, [session?.user?.id])

  if (loading) return <LoadingScreen message="Starting up..." />

  if (!session) return <AuthPage />

  if (profileState.uid !== session.user.id) return <LoadingScreen message="Starting up..." />

  if (profileState.profile?.role === 'admin') {
    return <AdminDashboard session={session} profile={profileState.profile} darkMode={darkMode} setDarkMode={setDarkMode} />
  }

  return <Dashboard session={session} darkMode={darkMode} setDarkMode={setDarkMode} />
}