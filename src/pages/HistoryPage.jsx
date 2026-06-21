import LoadingScreen from '../components/LoadingScreen'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { History, ListChecks, PencilLine, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { fadeUp, staggerContainer, cardItem } from '../utils/animations'

export default function HistoryPage({ session, onRetryQuiz }) {
  const [quizResults, setQuizResults] = useState([])
  const [subjects, setSubjects] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setLoading(true)
    const { data: quizData } = await supabase.from('quiz_results').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setQuizResults(quizData || [])
    const { data: subjectsData } = await supabase.from('subjects').select('*').eq('user_id', session.user.id)
    setSubjects(subjectsData || [])
    const { data: subtopicsData } = await supabase.from('subtopics').select('*').eq('user_id', session.user.id)
    setSubtopics(subtopicsData || [])
    setLoading(false)
  }

  function getSubjectName(subjectId) { return subjects.find(s => s.id === subjectId)?.name || 'Unknown subject' }
  function getSubtopicName(subtopicId) { return subtopics.find(s => s.id === subtopicId)?.title || 'Unknown subtopic' }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function getScoreStyle(score, total) {
    if (!score || !total) return { color: 'var(--text-muted)', bg: 'var(--surface-soft)', border: 'var(--border)' }
    const pct = score / total
    if (pct >= 0.8) return { color: 'var(--primary)', bg: 'var(--primary-soft)', border: 'var(--primary)' }
    if (pct >= 0.6) return { color: '#d97706', bg: 'rgba(217,119,6,0.12)', border: '#d97706' }
    return { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: '#dc2626' }
  }

  function getTypeIcon(type) {
    const props = { size: 18, strokeWidth: 2 }
    if (type === 'mcq') return <ListChecks {...props} style={{ color: 'var(--primary)' }} />
    if (type === 'structured') return <PencilLine {...props} className="text-blue-500" />
    return <FileText {...props} className="text-amber-500" />
  }

  function getAvgScore() {
    const mcq = quizResults.filter(r => r.score !== null && r.total !== null)
    if (mcq.length === 0) return null
    return Math.round(mcq.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / mcq.length)
  }

  function getStrongestSubject() {
    const bySubject = {}
    quizResults.filter(r => r.score !== null && r.total !== null).forEach(r => {
      if (!bySubject[r.subject_id]) bySubject[r.subject_id] = []
      bySubject[r.subject_id].push((r.score / r.total) * 100)
    })
    let best = null, bestScore = 0
    Object.entries(bySubject).forEach(([id, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg > bestScore) { bestScore = avg; best = id }
    })
    return best ? { name: getSubjectName(best), score: Math.round(bestScore) } : null
  }

  function getWeakestSubject() {
    const bySubject = {}
    quizResults.filter(r => r.score !== null && r.total !== null).forEach(r => {
      if (!bySubject[r.subject_id]) bySubject[r.subject_id] = []
      bySubject[r.subject_id].push((r.score / r.total) * 100)
    })
    let worst = null, worstScore = 101
    Object.entries(bySubject).forEach(([id, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg < worstScore) { worstScore = avg; worst = id }
    })
    return worst ? { name: getSubjectName(worst), score: Math.round(worstScore) } : null
  }

  if (loading) return <LoadingScreen />

  const avgScore = getAvgScore()
  const strongest = getStrongestSubject()
  const weakest = getWeakestSubject()

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="mb-8">
        <h1 className="text-2xl font-bold app-heading">Study history</h1>
        <p className="text-sm app-muted mt-1">Your past quiz results and performance analysis</p>
      </div>

      <AnimatePresence mode="wait">
        {quizResults.length === 0 ? (
          <motion.div
            key="empty"
            className="app-card rounded-2xl p-12 text-center"
            style={{ borderStyle: 'dashed' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
              <History size={28} strokeWidth={1.5} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="text-sm font-semibold app-heading mb-2">No quiz history yet</div>
            <div className="text-xs app-muted max-w-xs mx-auto leading-relaxed">
              Complete a tutor session and take a quiz to see your results and performance analysis here.
            </div>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

            <motion.div
              className="grid grid-cols-3 gap-2 sm:gap-4 mb-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {[
                { label: 'Quizzes taken', value: quizResults.length, sub: 'All time' },
                {
                  label: 'Average MCQ score',
                  value: avgScore !== null ? `${avgScore}%` : '—',
                  sub: 'MCQ quizzes only',
                  valueColor: avgScore !== null ? (avgScore >= 80 ? 'var(--primary)' : avgScore >= 60 ? '#d97706' : '#dc2626') : 'var(--text-main)',
                },
                { label: 'MCQ quizzes', value: quizResults.filter(r => r.quiz_type === 'mcq').length, sub: 'Multiple choice' },
              ].map(stat => (
                <motion.div key={stat.label} className="app-card rounded-2xl p-3 sm:p-5" variants={cardItem}>
                  <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1 sm:mb-2 app-muted truncate">{stat.label}</div>
                  <div className="text-xl sm:text-3xl font-bold app-heading" style={stat.valueColor ? { color: stat.valueColor } : {}}>{stat.value}</div>
                  <div className="text-[10px] sm:text-xs mt-1 truncate" style={{ color: 'var(--primary)' }}>{stat.sub}</div>
                </motion.div>
              ))}
            </motion.div>

            {(strongest || weakest) && (
              <motion.div
                className="grid grid-cols-2 gap-4 mb-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {strongest && (
                  <motion.div
                    className="rounded-2xl p-5 flex items-start gap-3"
                    style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
                    variants={cardItem}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <TrendingUp size={18} strokeWidth={2} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--primary)' }}>Strongest subject</div>
                      <div className="text-sm font-bold app-heading truncate">{strongest.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--primary)' }}>Average: {strongest.score}%</div>
                    </div>
                  </motion.div>
                )}
                {weakest && weakest.name !== strongest?.name && (
                  <motion.div
                    className="rounded-2xl p-5 flex items-start gap-3"
                    style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)' }}
                    variants={cardItem}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <TrendingDown size={18} strokeWidth={2} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-red-500">Needs more study</div>
                      <div className="text-sm font-bold app-heading truncate">{weakest.name}</div>
                      <div className="text-xs text-red-500 mt-0.5">Average: {weakest.score}% — review this subject</div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            <motion.div
              className="flex flex-col gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {quizResults.map(result => {
                const scoreStyle = getScoreStyle(result.score, result.total)
                return (
                  <motion.div
                    key={result.id}
                    className="app-card rounded-2xl p-5"
                    variants={cardItem}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                          {getTypeIcon(result.quiz_type)}
                        </div>
                        <div>
                          <div className="text-sm font-bold app-heading">{getSubjectName(result.subject_id)}</div>
                          <div className="text-xs app-muted mt-0.5">{getSubtopicName(result.subtopic_id)}</div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-lg capitalize" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                              {result.quiz_type}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-lg capitalize app-muted" style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                              {result.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {result.score !== null && result.total !== null ? (
                          <div className="inline-flex flex-col items-center px-3 py-2 rounded-xl" style={{ backgroundColor: scoreStyle.bg, border: `1px solid ${scoreStyle.border}` }}>
                            <div className="text-xl font-bold" style={{ color: scoreStyle.color }}>{result.score}/{result.total}</div>
                            <div className="text-xs font-medium" style={{ color: scoreStyle.color }}>{Math.round((result.score / result.total) * 100)}%</div>
                          </div>
                        ) : (
                          <div className="text-xs app-muted px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}>
                            Written answer
                          </div>
                        )}
                        <div className="text-xs app-muted mt-2">{formatDate(result.created_at)}</div>
                        {onRetryQuiz && result.subject_id && result.subtopic_id && (
                          <motion.button
                            onClick={() => onRetryQuiz(result.subject_id, result.subtopic_id)}
                            className="mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--primary)', border: '1px solid var(--border)' }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Retry quiz
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}