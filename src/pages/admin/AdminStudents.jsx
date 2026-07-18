import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem } from '../../utils/animations'
import { exportStudentsCSV } from '../../lib/adminData'
import { Search, Download, ArrowUpDown } from 'lucide-react'

const STATUS_STYLES = {
  active: { label: 'Active', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  'at-risk': { label: 'At-Risk', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  inactive: { label: 'Inactive', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
}

const AVATAR_COLORS = [
  { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
  { color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  { color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  { color: '#db2777', bg: 'rgba(219,39,119,0.12)' },
  { color: '#0d9488', bg: 'rgba(13,148,136,0.12)' },
  { color: '#059669', bg: 'rgba(5,150,105,0.12)' },
]

function Avatar({ name, size = 'w-7 h-7 text-[11px]' }) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  const c = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-bold flex-shrink-0`} style={{ backgroundColor: c.bg, color: c.color }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'classCode', label: 'Class' },
  { key: 'lastActive', label: 'Last Active' },
  { key: 'sessionsThisWeek', label: 'Sessions (wk)' },
  { key: 'avgScore', label: 'Avg Quiz' },
  { key: 'mastery', label: 'Mastery' },
  { key: 'streak', label: 'Streak' },
  { key: 'status', label: 'Status' },
]

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status]
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

function StudentDetail({ student, data, onBack }) {
  const subtopicById = Object.fromEntries(data.subtopics.map(st => [st.id, st]))

  const cards = [
    { label: 'Study streak', value: student.streak },
    { label: 'Sessions completed', value: student.sessionsCompleted },
    { label: 'Avg quiz score', value: student.avgScore !== null ? `${student.avgScore}%` : '—' },
    { label: 'Flashcard mastery', value: student.mastery !== null ? `${student.mastery}%` : '—' },
    { label: 'Plan adherence', value: student.adherence !== null ? `${student.adherence}%` : '—' },
  ]

  // Deck (subtopic) level flashcard breakdown
  const decks = {}
  student.cards.forEach(c => {
    const key = c.subtopic_id
    if (!decks[key]) decks[key] = { total: 0, subtopic: subtopicById[key] }
    decks[key].total++
  })

  const subjectStats = student.subjects.map(subj => {
    const subjQuizzes = student.quizzes.filter(q => q.subject_id === subj.id && q.score !== null && q.total > 0)
    const subjSessions = student.sessions.filter(s => s.subject_id === subj.id)
    const subjCards = student.cards.filter(c => c.subject_id === subj.id)
    const lastDates = [...subjSessions.map(s => s.updated_at), ...student.quizzes.filter(q => q.subject_id === subj.id).map(q => q.created_at)].filter(Boolean).sort()
    return {
      ...subj,
      sessions: subjSessions.length,
      avgScore: subjQuizzes.length > 0 ? Math.round(subjQuizzes.reduce((a, q) => a + (q.score / q.total) * 100, 0) / subjQuizzes.length) : null,
      cardCount: subjCards.length,
      lastStudied: lastDates.length > 0 ? lastDates[lastDates.length - 1] : null,
    }
  })

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
        <Avatar name={student.name} size="w-11 h-11 text-base" />
        <div>
          <div className="text-lg font-bold app-heading">{student.name}</div>
          <div className="text-xs app-muted flex items-center gap-2">
            {student.classCode ? `Class ${student.classCode}` : 'No class'} · Last active {fmtDate(student.lastActive)}
            <StatusBadge status={student.status} />
          </div>
        </div>
      </div>

      <motion.div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-8" variants={staggerContainer} initial="initial" animate="animate">
        {cards.map(c => (
          <motion.div key={c.label} className="app-card rounded-2xl p-3 sm:p-4" variants={cardItem}>
            <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1 app-muted">{c.label}</div>
            <div className="text-xl sm:text-2xl font-bold app-heading">{c.value}</div>
          </motion.div>
        ))}
      </motion.div>

      <h3 className="text-sm font-semibold app-muted uppercase tracking-wide mb-3">Subjects</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {subjectStats.length === 0 && <div className="text-xs app-muted">No subjects yet</div>}
        {subjectStats.map(s => (
          <div key={s.id} className="app-card rounded-2xl p-4">
            <div className="text-sm font-bold app-heading mb-2">{s.name}</div>
            <div className="text-xs app-muted">
              {s.sessions} session{s.sessions !== 1 ? 's' : ''} · Avg quiz {s.avgScore !== null ? `${s.avgScore}%` : '—'} · {s.cardCount} cards · Last studied {fmtDate(s.lastStudied)}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold app-muted uppercase tracking-wide mb-3">Quiz history</h3>
      <div className="app-card rounded-2xl overflow-x-auto mb-8">
        <table className="w-full text-left" style={{ minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Subject', 'Type', 'Score'].map(h => (
                <th key={h} className="text-xs font-semibold app-muted px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student.quizzes.length === 0 && (
              <tr><td colSpan={4} className="text-xs app-muted px-4 py-4">No quizzes taken yet</td></tr>
            )}
            {[...student.quizzes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 25).map(q => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="text-xs app-heading px-4 py-2.5 whitespace-nowrap">{fmtDate(q.created_at)}</td>
                <td className="text-xs app-heading px-4 py-2.5">{data.subjectById[q.subject_id]?.name || '—'}</td>
                <td className="text-xs app-muted px-4 py-2.5 uppercase">{q.quiz_type}</td>
                <td className="text-xs font-semibold app-heading px-4 py-2.5">
                  {q.score !== null && q.total ? `${q.score}/${q.total} (${Math.round((q.score / q.total) * 100)}%)` : 'AI-graded'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold app-muted uppercase tracking-wide mb-3">Session feedback</h3>
      <div className="flex flex-col gap-2 mb-8">
        {student.ratings.length === 0 && <div className="text-xs app-muted">No session ratings submitted</div>}
        {student.ratings.map(r => (
          <div key={r.id} className="app-card rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--primary)' }}>{r.rating}/5</span>
            <span className="text-xs app-muted flex-1">{r.comment || 'No comment'}</span>
            <span className="text-[10px] app-muted flex-shrink-0">{fmtDate(r.created_at)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function AdminStudents({ data }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState(1)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    let list = data.students
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.classCode || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter)
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'string') return av.localeCompare(bv) * sortDir
      return (av - bv) * sortDir
    })
  }, [data.students, search, statusFilter, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(-sortDir)
    else { setSortKey(key); setSortDir(1) }
  }

  if (selected) {
    return <StudentDetail student={selected} data={data} onBack={() => setSelected(null)} />
  }

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 app-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or class..."
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm app-input"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'at-risk', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl transition-all capitalize"
              style={{
                border: `1px solid ${statusFilter === f ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: statusFilter === f ? 'var(--primary-soft)' : 'var(--surface-soft)',
                color: statusFilter === f ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {f === 'all' ? 'All' : STATUS_STYLES[f].label}
            </button>
          ))}
          <button
            onClick={() => exportStudentsCSV(filtered)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download size={13} strokeWidth={2} />
            CSV
          </button>
        </div>
      </div>

      <div className="app-card rounded-2xl overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 720 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(c => (
                <th key={c.key} className="px-4 py-3">
                  <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 text-xs font-semibold app-muted hover:opacity-80">
                    {c.label}
                    <ArrowUpDown size={11} strokeWidth={2} className={sortKey === c.key ? '' : 'opacity-30'} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="text-xs app-muted px-4 py-5">No students match</td></tr>
            )}
            {filtered.map(s => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className="cursor-pointer transition-colors hover:opacity-80"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} />
                    <span className="text-xs font-semibold app-heading">{s.name}</span>
                  </div>
                </td>
                <td className="text-xs app-muted px-4 py-3">{s.classCode || '—'}</td>
                <td className="text-xs app-muted px-4 py-3 whitespace-nowrap">{fmtDate(s.lastActive)}</td>
                <td className="text-xs app-heading px-4 py-3">{s.sessionsThisWeek}</td>
                <td className="text-xs app-heading px-4 py-3">{s.avgScore !== null ? `${s.avgScore}%` : '—'}</td>
                <td className="text-xs app-heading px-4 py-3">{s.mastery !== null ? `${s.mastery}%` : '—'}</td>
                <td className="text-xs app-heading px-4 py-3">{s.streak}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] app-muted mt-2">
        "Last Active" reflects study activity (sessions, quizzes, reviews) — login events are not tracked client-side.
      </p>
    </motion.div>
  )
}
