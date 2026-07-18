import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem } from '../utils/animations'
import { calculateStreak } from '../utils/streak'
import LoadingScreen from '../components/LoadingScreen'
import { Flame, BookOpen, Layers, Target, CalendarCheck } from 'lucide-react'

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

export default function ProgressPage({ session }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [subjectStats, setSubjectStats] = useState([])

  useEffect(() => { fetchProgress() }, [])

  async function fetchProgress() {
    setLoading(true)
    const uid = session.user.id

    const [subjectsRes, sessionsRes, quizzesRes, streaksRes, cardsRes, progressRes, plansRes] = await Promise.all([
      supabase.from('subjects').select('id, name, exam_date').eq('user_id', uid),
      supabase.from('tutor_sessions').select('id, subject_id, status, updated_at').eq('user_id', uid),
      supabase.from('quiz_results').select('subject_id, score, total, created_at').eq('user_id', uid),
      supabase.from('study_streaks').select('study_date').eq('user_id', uid),
      supabase.from('flashcards').select('id, subject_id').eq('user_id', uid),
      supabase.from('flashcard_progress').select('flashcard_id, repetitions').eq('user_id', uid),
      supabase.from('study_plans').select('planned_date').eq('user_id', uid),
    ])

    const subjects = subjectsRes.data || []
    const sessions = sessionsRes.data || []
    const quizzes = quizzesRes.data || []
    const streakDates = (streaksRes.data || []).map(s => s.study_date)
    const cards = cardsRes.data || []
    const progress = progressRes.data || []
    const plans = plansRes.data || []

    const masteredIds = new Set(progress.filter(p => p.repetitions >= 3).map(p => p.flashcard_id))
    const scoredQuizzes = quizzes.filter(q => q.score !== null && q.total > 0)
    const avgScore = scoredQuizzes.length > 0
      ? Math.round(scoredQuizzes.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / scoredQuizzes.length)
      : null

    // Calendar adherence this month: planned days (up to today) where the
    // student actually studied (has a streak entry that day)
    const now = new Date()
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const todayStr = now.toISOString().split('T')[0]
    const studiedSet = new Set(streakDates)
    const duePlans = plans.filter(p => p.planned_date.startsWith(monthPrefix) && p.planned_date <= todayStr)
    const keptPlans = duePlans.filter(p => studiedSet.has(p.planned_date))
    const adherence = duePlans.length > 0 ? pct(keptPlans.length, duePlans.length) : null

    setStats({
      streak: calculateStreak(streakDates),
      totalSessions: sessions.filter(s => s.status === 'completed').length,
      totalMastered: masteredIds.size,
      avgScore,
      adherence,
    })

    const cardsBySubject = {}
    cards.forEach(c => {
      if (!cardsBySubject[c.subject_id]) cardsBySubject[c.subject_id] = { total: 0, mastered: 0 }
      cardsBySubject[c.subject_id].total++
      if (masteredIds.has(c.id)) cardsBySubject[c.subject_id].mastered++
    })

    setSubjectStats(subjects.map(subj => {
      const subjSessions = sessions.filter(s => s.subject_id === subj.id)
      const subjQuizzes = scoredQuizzes.filter(q => q.subject_id === subj.id)
      const subjCards = cardsBySubject[subj.id] || { total: 0, mastered: 0 }
      const activityDates = [
        ...subjSessions.map(s => s.updated_at),
        ...quizzes.filter(q => q.subject_id === subj.id).map(q => q.created_at),
      ].filter(Boolean).sort()
      return {
        id: subj.id,
        name: subj.name,
        sessions: subjSessions.length,
        avgScore: subjQuizzes.length > 0
          ? Math.round(subjQuizzes.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / subjQuizzes.length)
          : null,
        mastery: subjCards.total > 0 ? pct(subjCards.mastered, subjCards.total) : null,
        lastStudied: activityDates.length > 0 ? activityDates[activityDates.length - 1] : null,
      }
    }))
    setLoading(false)
  }

  if (loading) return <LoadingScreen />

  const summaryCards = [
    { label: 'Study streak', value: stats.streak, sub: stats.streak === 1 ? 'day in a row' : 'days in a row', icon: <Flame size={16} strokeWidth={2} /> },
    { label: 'Sessions completed', value: stats.totalSessions, sub: 'all time', icon: <BookOpen size={16} strokeWidth={2} /> },
    { label: 'Flashcards mastered', value: stats.totalMastered, sub: 'all time', icon: <Layers size={16} strokeWidth={2} /> },
    { label: 'Average quiz score', value: stats.avgScore !== null ? `${stats.avgScore}%` : '—', sub: 'all time', icon: <Target size={16} strokeWidth={2} /> },
    { label: 'Plan adherence', value: stats.adherence !== null ? `${stats.adherence}%` : '—', sub: 'this month', icon: <CalendarCheck size={16} strokeWidth={2} /> },
  ]

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="mb-8">
        <h1 className="text-2xl font-bold app-heading">My progress</h1>
        <p className="text-sm app-muted mt-1">Track how your studying is paying off</p>
      </div>

      <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-8" variants={staggerContainer} initial="initial" animate="animate">
        {summaryCards.map(stat => (
          <motion.div key={stat.label} className="app-card rounded-2xl p-3 sm:p-5" variants={cardItem}>
            <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
              <span style={{ color: 'var(--primary)' }}>{stat.icon}</span>
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide app-muted truncate">{stat.label}</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold app-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs mt-1 truncate" style={{ color: 'var(--primary)' }}>{stat.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      <h2 className="text-sm font-semibold app-muted uppercase tracking-wide mb-4">By subject</h2>
      {subjectStats.length === 0 ? (
        <div className="app-card rounded-2xl p-10 text-center" style={{ borderStyle: 'dashed' }}>
          <div className="text-sm font-semibold app-heading mb-1">Nothing to show yet</div>
          <div className="text-xs app-muted">Add a subject and complete a session to see your progress here.</div>
        </div>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-3" variants={staggerContainer} initial="initial" animate="animate">
          {subjectStats.map(subj => (
            <motion.div key={subj.id} className="app-card rounded-2xl p-5" variants={cardItem}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-sm font-bold app-heading">{subj.name}</div>
                {subj.lastStudied && (
                  <div className="text-[10px] app-muted flex-shrink-0">
                    Last studied {new Date(subj.lastStudied).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
              <div className="flex gap-5 mb-3">
                <div>
                  <div className="text-lg font-bold app-heading">{subj.sessions}</div>
                  <div className="text-[10px] app-muted">Sessions</div>
                </div>
                <div>
                  <div className="text-lg font-bold app-heading">{subj.avgScore !== null ? `${subj.avgScore}%` : '—'}</div>
                  <div className="text-[10px] app-muted">Avg quiz</div>
                </div>
                <div>
                  <div className="text-lg font-bold app-heading">{subj.mastery !== null ? `${subj.mastery}%` : '—'}</div>
                  <div className="text-[10px] app-muted">Mastery</div>
                </div>
              </div>
              <div className="rounded-full h-1.5 app-progress-track">
                <motion.div
                  className="h-1.5 rounded-full app-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${subj.mastery || 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
