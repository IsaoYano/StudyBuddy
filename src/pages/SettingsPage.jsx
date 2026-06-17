import LoadingScreen from '../components/LoadingScreen'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function SettingsPage({ session, onNameUpdate }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (data) setName(data.name || '')
    setFetchLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', session.user.id)

    if (error) {
      setError('Could not save changes. Please try again.')
    } else {
      setMessage('Profile updated successfully.')
      if (onNameUpdate) onNameUpdate(name)
    }
    setLoading(false)
  }

  if (fetchLoading) {
    return <LoadingScreen message="Loading settings..." />
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your profile and account</p>
      </div>

      <div className="max-w-lg flex flex-col gap-6">

        <div className="bg-white rounded-2xl border border-emerald-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <input
                type="email"
                value={session.user.email}
                disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Account information</h2>
          <p className="text-xs text-gray-400 mb-4">Details about your StudyBuddy account</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Email', value: session.user.email },
              { label: 'Account created', value: new Date(session.user.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Faculty', value: 'FSKPM, UNIMAS' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-xs text-gray-500">{item.label}</span>
                <span className="text-xs font-medium text-gray-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
          <p className="text-xs text-gray-400 mb-4">
            Signing out will end your current session.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>

      </div>
    </div>
  )
}