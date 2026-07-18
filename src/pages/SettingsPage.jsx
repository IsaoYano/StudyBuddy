import LoadingScreen from '../components/LoadingScreen'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem } from '../utils/animations'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'content', label: 'Content Issue' },
]

const APP_SCREENS = ['Dashboard', 'Subjects', 'Athena Tutor', 'Quiz', 'Flashcards', 'Notes', 'Calendar', 'Progress', 'History', 'Settings', 'Other']

export default function SettingsPage({ session, onNameUpdate, darkMode, setDarkMode }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fbType, setFbType] = useState('general')
  const [fbDescription, setFbDescription] = useState('')
  const [fbScreen, setFbScreen] = useState('')
  const [fbSending, setFbSending] = useState(false)
  const [fbSent, setFbSent] = useState(false)

  async function handleSendFeedback(e) {
    e.preventDefault()
    if (!fbDescription.trim() || fbSending) return
    setFbSending(true)
    const { error: fbError } = await supabase.from('feedback').insert({
      user_id: session.user.id,
      type: fbType,
      description: fbDescription.trim(),
      screen: fbScreen || null,
      device: navigator.userAgent.slice(0, 250),
    })
    if (!fbError) {
      setFbSent(true)
      setFbDescription('')
      setFbScreen('')
      setTimeout(() => setFbSent(false), 4000)
    }
    setFbSending(false)
  }

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) setName(data.name || '')
    setFetchLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    const { error } = await supabase.from('profiles').update({ name }).eq('id', session.user.id)
    if (error) {
      setError('Could not save changes. Please try again.')
    } else {
      setMessage('Profile updated successfully.')
      if (onNameUpdate) onNameUpdate(name)
    }
    setLoading(false)
  }

  if (fetchLoading) return <LoadingScreen />

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="mb-8">
        <h1 className="text-2xl font-bold app-heading">Settings</h1>
        <p className="text-sm app-muted mt-1">Manage your profile and account</p>
      </div>

      <motion.div
        className="max-w-lg flex flex-col gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >

        <motion.div className="app-card rounded-2xl p-6" variants={cardItem}>
          <h2 className="text-sm font-semibold app-heading mb-4">Profile</h2>

          <AnimatePresence>
            {message && (
              <motion.div
                className="rounded-xl px-4 py-3 mb-4 text-sm"
                style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)', color: 'var(--primary)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
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
            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Email</label>
              <input
                type="email"
                value={session.user.email}
                disabled
                className="w-full rounded-xl px-4 py-2.5 text-sm app-input opacity-60"
              />
              <p className="text-xs app-muted mt-1">Email cannot be changed</p>
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              className="text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Saving...' : 'Save changes'}
            </motion.button>
          </form>
        </motion.div>

        <motion.div className="app-card rounded-2xl p-6" variants={cardItem}>
          <h2 className="text-sm font-semibold app-heading mb-1">Appearance</h2>
          <p className="text-xs app-muted mb-4">Choose your preferred display mode</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium app-heading">Dark mode</div>
              <div className="text-xs app-muted mt-0.5">Easy on the eyes at night</div>
            </div>
            <motion.button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${darkMode ? 'bg-emerald-600' : 'bg-gray-200'}`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                animate={{ x: darkMode ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>
        </motion.div>

        <motion.div className="app-card rounded-2xl p-6" variants={cardItem}>
          <h2 className="text-sm font-semibold app-heading mb-1">Account information</h2>
          <p className="text-xs app-muted mb-4">Details about your StudyBuddy account</p>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Email', value: session.user.email },
              { label: 'Account created', value: new Date(session.user.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { label: 'Faculty', value: 'FSKPM, UNIMAS' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs app-muted">{item.label}</span>
                <span className="text-xs font-medium app-heading">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="app-card rounded-2xl p-6" variants={cardItem}>
          <h2 className="text-sm font-semibold app-heading mb-1">Help &amp; feedback</h2>
          <p className="text-xs app-muted mb-4">Report a bug or tell us what you think</p>

          <AnimatePresence>
            {fbSent && (
              <motion.div
                className="rounded-xl px-4 py-3 mb-4 text-sm"
                style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)', color: 'var(--primary)' }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                Thank you — your feedback has been sent.
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendFeedback} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Type</label>
              <select
                value={fbType}
                onChange={e => setFbType(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm app-input"
              >
                {FEEDBACK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Description</label>
              <textarea
                value={fbDescription}
                onChange={e => setFbDescription(e.target.value)}
                placeholder="Describe the issue or your idea..."
                required
                rows={3}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none app-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium app-muted mb-1.5 block">Screen / feature (optional)</label>
              <select
                value={fbScreen}
                onChange={e => setFbScreen(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm app-input"
              >
                <option value="">Select a screen...</option>
                {APP_SCREENS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <motion.button
              type="submit"
              disabled={fbSending || !fbDescription.trim()}
              className="text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {fbSending ? 'Sending...' : 'Send feedback'}
            </motion.button>
          </form>
        </motion.div>

        <motion.div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(220,38,38,0.3)' }} variants={cardItem}>
          <h2 className="text-sm font-semibold text-red-500 mb-1">Danger zone</h2>
          <p className="text-xs app-muted mb-4">Signing out will end your current session.</p>
          <motion.button
            onClick={() => supabase.auth.signOut()}
            className="w-full text-sm font-medium transition-colors py-2.5 rounded-xl app-muted hover:text-red-400"
            style={{ border: '1px solid var(--border)' }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign out
          </motion.button>
        </motion.div>

      </motion.div>
    </motion.div>
  )
}