import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeUp } from '../utils/animations'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.')
      setLoading(false)
      return
    }
    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message.includes('Invalid login credentials')
          ? 'We could not find an account with these credentials. Please check your email and password.'
          : error.message)
      }
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
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <motion.div className="w-full max-w-sm" variants={fadeUp} initial="initial" animate="animate">

        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg viewBox="0 0 60 60" width="44" height="44" fill="none">
              <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="var(--primary)" strokeWidth="2.2" strokeLinejoin="round"/>
              <line x1="30" y1="10" x2="30" y2="50" stroke="var(--primary)" strokeWidth="1.2" strokeDasharray="3,2.5"/>
              <path d="M16 22C13 27 14 34 17 38" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 25C7 30 9 37 13 41" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M44 22C47 27 46 34 43 38" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M51 25C53 30 51 37 47 41" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="20" cy="21" r="2.5" fill="var(--primary)"/>
              <circle cx="40" cy="21" r="2.5" fill="var(--primary)"/>
              <circle cx="18" cy="33" r="2" fill="var(--primary)"/>
              <circle cx="42" cy="33" r="2" fill="var(--primary)"/>
              <circle cx="25" cy="28" r="2" fill="var(--primary)"/>
              <circle cx="35" cy="28" r="2" fill="var(--primary)"/>
              <circle cx="30" cy="40" r="2" fill="var(--primary)"/>
              <line x1="20" y1="21" x2="25" y2="28" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
              <line x1="40" y1="21" x2="35" y2="28" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
              <line x1="18" y1="33" x2="25" y2="28" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
              <line x1="42" y1="33" x2="35" y2="28" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
              <line x1="25" y1="28" x2="30" y2="40" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
              <line x1="35" y1="28" x2="30" y2="40" stroke="var(--primary)" strokeWidth="0.9" opacity="0.6"/>
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold app-heading">StudyBuddy</h1>
          <p className="text-sm app-muted mt-1">FSKPM · UNIMAS</p>
        </div>

        <motion.div
          className="app-card rounded-2xl p-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-lg font-semibold app-heading mb-1">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm app-muted mb-6">
            {isLogin ? 'Log in to continue studying' : 'Start your learning journey'}
          </p>

          {error && (
            <motion.div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.div>
          )}
          {message && (
            <motion.div
              className="rounded-xl px-4 py-3 mb-4 text-sm"
              style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)', color: 'var(--primary)' }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {message}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-medium app-muted mb-1.5 block">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all app-input"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="w-full rounded-xl px-4 py-2.5 text-sm transition-all app-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-all app-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 app-muted hover:opacity-80 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isLogin && password.length > 0 && password.length < 6 && (
                <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters.</p>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs font-medium app-muted mb-1.5 block">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-all app-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 app-muted hover:opacity-80 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                )}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="mt-1 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01, boxShadow: '0 6px 20px rgba(5,150,105,0.25)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
            </motion.button>
          </form>

          <p className="text-xs app-muted text-center mt-5">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); setPassword(''); setConfirmPassword('') }}
              className="font-medium hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              {isLogin ? 'Register' : 'Log in'}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}