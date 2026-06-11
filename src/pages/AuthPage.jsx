import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        await supabase.from('profiles').insert({ id: data.user.id, name })
        setMessage('Account created! Welcome to StudyBuddy.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4">
            <svg viewBox="0 0 60 60" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="#059669" strokeWidth="2.2" strokeLinejoin="round"/>
              <line x1="30" y1="10" x2="30" y2="50" stroke="#059669" strokeWidth="1.2" strokeDasharray="3,2.5"/>
              <path d="M16 22C13 27 14 34 17 38" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 25C7 30 9 37 13 41" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M44 22C47 27 46 34 43 38" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M51 25C53 30 51 37 47 41" stroke="#059669" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="20" cy="21" r="2.5" fill="#059669"/>
              <circle cx="40" cy="21" r="2.5" fill="#059669"/>
              <circle cx="18" cy="33" r="2" fill="#059669"/>
              <circle cx="42" cy="33" r="2" fill="#059669"/>
              <circle cx="25" cy="28" r="2" fill="#059669"/>
              <circle cx="35" cy="28" r="2" fill="#059669"/>
              <circle cx="30" cy="40" r="2" fill="#059669"/>
              <line x1="20" y1="21" x2="25" y2="28" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
              <line x1="40" y1="21" x2="35" y2="28" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
              <line x1="18" y1="33" x2="25" y2="28" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
              <line x1="42" y1="33" x2="35" y2="28" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
              <line x1="25" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
              <line x1="35" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="0.9" opacity="0.6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">StudyBuddy</h1>
          <p className="text-sm text-gray-500 mt-1">FSKPM · UNIMAS</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {isLogin ? 'Log in to continue studying' : 'Start your learning journey'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
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
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-5">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}
              className="text-emerald-600 font-medium hover:underline"
            >
              {isLogin ? 'Register' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}