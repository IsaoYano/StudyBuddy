import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { fetchAdminData } from '../../lib/adminData'
import { fadeUp, staggerContainer, cardItem } from '../../utils/animations'
import LoadingScreen from '../../components/LoadingScreen'
import AdminStudents from './AdminStudents'
import AdminAlerts from './AdminAlerts'
import AdminFeedback from './AdminFeedback'
import AdminSettings from './AdminSettings'
import {
  LayoutDashboard, Users, Bell, Inbox, Settings, LogOut, RefreshCw,
  ShieldCheck, GraduationCap, Activity, CalendarClock, Target, Layers,
} from 'lucide-react'

function BrandLogo({ size = 26 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} fill="none">
      <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round"/>
      <line x1="30" y1="10" x2="30" y2="50" stroke="var(--primary)" strokeWidth="1.2" strokeDasharray="3,2.5"/>
      <circle cx="20" cy="21" r="2.5" fill="var(--primary)"/>
      <circle cx="40" cy="21" r="2.5" fill="var(--primary)"/>
      <circle cx="25" cy="28" r="2" fill="var(--primary)"/>
      <circle cx="35" cy="28" r="2" fill="var(--primary)"/>
      <circle cx="30" cy="40" r="2" fill="var(--primary)"/>
      <line x1="20" y1="21" x2="25" y2="28" stroke="var(--primary)" strokeWidth="1" opacity="0.6"/>
      <line x1="40" y1="21" x2="35" y2="28" stroke="var(--primary)" strokeWidth="1" opacity="0.6"/>
      <line x1="25" y1="28" x2="30" y2="40" stroke="var(--primary)" strokeWidth="1" opacity="0.6"/>
      <line x1="35" y1="28" x2="30" y2="40" stroke="var(--primary)" strokeWidth="1" opacity="0.6"/>
    </svg>
  )
}

function LineChart({ data }) {
  const w = 560, h = 150, pad = 28
  const max = Math.max(1, ...data.map(d => d.count))
  const pts = data.map((d, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    h - pad - (d.count / max) * (h - pad * 2),
  ])
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Daily active students, last 30 days">
      <defs>
        <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={pad} y1={pad + f * (h - pad * 2)} x2={w - pad} y2={pad + f * (h - pad * 2)} stroke="var(--border)" strokeWidth="0.6" strokeDasharray="3,4" />
      ))}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="1" />
      <path d={area} fill="url(#dauGrad)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => data[i].count > 0 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="var(--surface)" stroke="var(--primary)" strokeWidth="1.6" />
      ))}
      <text x={pad} y={h - 8} fontSize="9" fill="var(--text-muted)">{data[0]?.date.slice(5)}</text>
      <text x={w - pad} y={h - 8} fontSize="9" fill="var(--text-muted)" textAnchor="end">{data[data.length - 1]?.date.slice(5)}</text>
      <text x={pad - 5} y={pad + 3} fontSize="9" fill="var(--text-muted)" textAnchor="end">{max}</text>
    </svg>
  )
}

function BarChart({ data }) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div className="flex flex-col gap-2.5">
      {data.length === 0 && <div className="text-xs app-muted">No sessions yet</div>}
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="text-xs app-heading w-36 truncate flex-shrink-0" title={d.name}>{d.name}</div>
          <div className="flex-1 rounded-full h-3 app-progress-track overflow-hidden">
            <motion.div
              className="h-3 rounded-full"
              style={{ backgroundColor: 'var(--primary)', opacity: 1 - i * 0.08 }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="text-xs font-semibold app-heading w-8 text-right flex-shrink-0">{d.count}</div>
        </div>
      ))}
    </div>
  )
}

const METRIC_STYLES = [
  { icon: <GraduationCap size={16} strokeWidth={2} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  { icon: <Activity size={16} strokeWidth={2} />, color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  { icon: <CalendarClock size={16} strokeWidth={2} />, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  { icon: <Users size={16} strokeWidth={2} />, color: '#db2777', bg: 'rgba(219,39,119,0.1)' },
  { icon: <Target size={16} strokeWidth={2} />, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  { icon: <Layers size={16} strokeWidth={2} />, color: '#0d9488', bg: 'rgba(13,148,136,0.1)' },
]

function Overview({ data }) {
  const o = data.overview
  const cards = [
    { label: 'Total students', value: o.totalStudents, sub: 'registered' },
    { label: 'Active today', value: o.activeToday, sub: 'studying now' },
    { label: 'Active this week', value: o.activeThisWeek, sub: 'last 7 days' },
    { label: 'Sessions this week', value: o.sessionsThisWeek, sub: 'completed' },
    { label: 'Avg quiz score', value: o.avgScoreThisWeek !== null ? `${o.avgScoreThisWeek}%` : '—', sub: 'this week' },
    { label: 'Avg mastery', value: o.avgMastery !== null ? `${o.avgMastery}%` : '—', sub: 'flashcards' },
  ]
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-8" variants={staggerContainer} initial="initial" animate="animate">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            className="app-card rounded-2xl p-3 sm:p-4"
            variants={cardItem}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5" style={{ backgroundColor: METRIC_STYLES[i].bg, color: METRIC_STYLES[i].color }}>
              {METRIC_STYLES[i].icon}
            </div>
            <div className="text-xl sm:text-2xl font-bold app-heading">{c.value}</div>
            <div className="text-[10px] sm:text-xs font-medium app-muted mt-0.5">{c.label}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--primary)' }}>{c.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-4" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold app-heading">Daily active students</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>Last 30 days</span>
          </div>
          <LineChart data={data.dau} />
        </motion.div>
        <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold app-heading">Sessions per subject</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>Top {data.sessionsPerSubject.length}</span>
          </div>
          <BarChart data={data.sessionsPerSubject} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

const NAV = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
  { id: 'students', label: 'Students', icon: <Users size={18} strokeWidth={2} /> },
  { id: 'alerts', label: 'At-risk alerts', icon: <Bell size={18} strokeWidth={2} /> },
  { id: 'feedback', label: 'Feedback inbox', icon: <Inbox size={18} strokeWidth={2} /> },
]

const SCREEN_SUBTITLES = {
  overview: 'A live snapshot of how your students are doing',
  students: 'Search, sort and inspect every registered student',
  alerts: 'Students who need your attention first',
  feedback: 'Flagged AI responses and student feedback',
  settings: 'Your profile, appearance and role management',
}

export default function AdminDashboard({ session, profile, darkMode, setDarkMode }) {
  const [screen, setScreen] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminName, setAdminName] = useState(profile?.name || 'Admin')

  useEffect(() => { load() }, [])

  async function load() {
    setRefreshing(true)
    const result = await fetchAdminData()
    setData(result)
    setLoading(false)
    setRefreshing(false)
  }

  if (loading) return <LoadingScreen message="Loading admin data..." />

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen app-bg flex">
      {/* Sidebar (desktop) */}
      <div className="hidden md:flex w-56 app-sidebar flex-col fixed h-full z-10">
        <div className="p-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
              <BrandLogo />
            </div>
            <div>
              <div className="text-sm font-bold app-heading">StudyBuddy</div>
              <div className="text-xs app-muted">FSKPM · UNIMAS</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
            <ShieldCheck size={13} strokeWidth={2} style={{ color: 'var(--primary)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Admin Console</span>
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                screen === item.id ? 'app-nav-active' : 'app-nav-inactive hover:opacity-80'
              }`}
            >
              <span style={{ color: screen === item.id ? 'var(--primary)' : 'var(--text-muted)' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setScreen('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-2 ${
              screen === 'settings' ? 'app-nav-active' : 'app-nav-inactive hover:opacity-80'
            }`}
          >
            <span style={{ color: screen === 'settings' ? 'var(--primary)' : 'var(--text-muted)' }}>
              <Settings size={18} strokeWidth={2} />
            </span>
            Settings
          </button>
          <div className="flex items-center gap-3 mt-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
              {adminName?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold app-heading truncate">{adminName}</div>
              <div className="text-xs app-muted truncate">{session.user.email}</div>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 text-xs transition-colors text-left mt-1 app-muted hover:text-red-400"
          >
            <LogOut size={14} strokeWidth={2} />
            Log out
          </button>
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex app-sidebar" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[...NAV, { id: 'settings', label: 'Settings', icon: <Settings size={18} strokeWidth={2} /> }].map(item => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium"
            style={{ color: screen === item.id ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            {item.icon}
            {item.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0 md:ml-56 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 app-bg overflow-x-hidden">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="min-w-0">
            {screen === 'overview' ? (
              <h1 className="text-2xl font-bold app-heading truncate">{greeting}, {adminName}</h1>
            ) : (
              <h1 className="text-2xl font-bold app-heading truncate">{screen === 'settings' ? 'Settings' : NAV.find(n => n.id === screen)?.label}</h1>
            )}
            <p className="text-sm app-muted mt-1">{SCREEN_SUBTITLES[screen]}</p>
          </div>
          <motion.button
            onClick={load}
            disabled={refreshing}
            aria-label="Refresh data"
            className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-xl app-muted transition-colors disabled:opacity-40 flex-shrink-0"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            <RefreshCw size={14} strokeWidth={2} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </motion.button>
        </div>

        {screen === 'overview' && <Overview data={data} />}
        {screen === 'students' && <AdminStudents data={data} />}
        {screen === 'alerts' && <AdminAlerts data={data} onViewStudent={() => setScreen('students')} />}
        {screen === 'feedback' && <AdminFeedback data={data} onChanged={load} />}
        {screen === 'settings' && (
          <AdminSettings
            session={session}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onNameUpdate={setAdminName}
          />
        )}
      </div>
    </div>
  )
}
