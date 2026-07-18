import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem } from '../../utils/animations'
import { Search, ShieldCheck, UserCog } from 'lucide-react'

const ROLES = ['student', 'teacher', 'admin']

const ROLE_STYLES = {
  student: { color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  teacher: { color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  admin: { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  institution: { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
}

function RoleRow({ user, isSelf, onRoleChanged }) {
  const [pendingRole, setPendingRole] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const style = ROLE_STYLES[user.role] || ROLE_STYLES.student

  async function applyRole() {
    setBusy(true)
    setError('')
    const { error: e } = await supabase.from('profiles').update({ role: pendingRole }).eq('id', user.id)
    if (e) {
      setError('Could not change role. Make sure the security patch SQL has been run.')
    } else {
      onRoleChanged(user.id, pendingRole)
      setPendingRole(null)
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ backgroundColor: style.bg, color: style.color }}>
          {user.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold app-heading truncate">
            {user.name || 'Unnamed user'}
            {isSelf && <span className="text-[10px] app-muted font-normal ml-1.5">(you)</span>}
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg capitalize flex-shrink-0" style={{ backgroundColor: style.bg, color: style.color }}>
          {user.role}
        </span>
        {!isSelf && (
          <select
            value={pendingRole ?? user.role}
            onChange={e => setPendingRole(e.target.value === user.role ? null : e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 app-input flex-shrink-0 capitalize"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </div>
      <AnimatePresence>
        {pendingRole && (
          <motion.div
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="text-xs app-heading">
              Change <strong>{user.name}</strong> from <strong className="capitalize">{user.role}</strong> to <strong className="capitalize">{pendingRole}</strong>?
            </span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setPendingRole(null)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg app-muted"
                style={{ border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={applyRole}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {busy ? 'Applying...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  )
}

export default function AdminSettings({ session, darkMode, setDarkMode, onNameUpdate }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('id, name, role').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setName(data.name || '') })
    supabase.from('profiles').select('id, name, role').order('name')
      .then(({ data }) => setUsers(data || []))
  }, [session.user.id])

  async function handleSaveName(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('profiles').update({ name }).eq('id', session.user.id)
    setMessage(error ? 'Could not save changes. Please try again.' : 'Profile updated successfully.')
    if (!error) onNameUpdate(name)
    setSaving(false)
  }

  const filteredUsers = search.trim()
    ? users.filter(u => (u.name || '').toLowerCase().includes(search.trim().toLowerCase()))
    : users.filter(u => u.role !== 'student')

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <motion.div className="max-w-2xl flex flex-col gap-6" variants={staggerContainer} initial="initial" animate="animate">

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
          <form onSubmit={handleSaveName} className="flex flex-col gap-4">
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
              <input type="email" value={session.user.email} disabled className="w-full rounded-xl px-4 py-2.5 text-sm app-input opacity-60" />
              <p className="text-xs app-muted mt-1">Email cannot be changed</p>
            </div>
            <motion.button
              type="submit"
              disabled={saving}
              className="text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? 'Saving...' : 'Save changes'}
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
              aria-label="Toggle dark mode"
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
          <div className="flex items-center gap-2 mb-1">
            <UserCog size={16} strokeWidth={2} style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold app-heading">Role management</h2>
          </div>
          <p className="text-xs app-muted mb-4">
            Admins are not self-registered. Users sign up as students, then an existing admin promotes them here.
            Search a user by name and assign their role.
          </p>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 app-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users by name..."
              className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm app-input"
            />
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {filteredUsers.length === 0 && (
              <div className="text-xs app-muted px-4 py-5 text-center">
                {search.trim() ? 'No users match that name.' : 'No staff accounts yet. Search a student to promote them.'}
              </div>
            )}
            {filteredUsers.slice(0, 8).map(u => (
              <RoleRow
                key={u.id}
                user={u}
                isSelf={u.id === session.user.id}
                onRoleChanged={(id, role) => setUsers(prev => prev.map(x => x.id === id ? { ...x, role } : x))}
              />
            ))}
            {filteredUsers.length > 8 && (
              <div className="text-[10px] app-muted px-4 py-2">Showing 8 of {filteredUsers.length} — refine your search</div>
            )}
          </div>

          <div className="flex items-start gap-2 mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
            <ShieldCheck size={14} strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            <p className="text-[11px] app-muted leading-relaxed">
              You cannot change your own role — this prevents accidentally locking yourself out.
              The very first admin is created once from the Supabase dashboard; after that, all promotions happen here.
            </p>
          </div>
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
