import LoadingScreen from '../components/LoadingScreen'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { History, ListChecks, PencilLine, FileText, TrendingUp, TrendingDown } from 'lucide-react'

export default function HistoryPage({ session, onRetryQuiz }) {
  const [quizResults, setQuizResults] = useState([])
  const [subjects, setSubjects] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    const { data: quizData } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setQuizResults(quizData || [])

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', session.user.id)
    setSubjects(subjectsData || [])

    const { data: subtopicsData } = await supabase
      .from('subtopics')
      .select('*')
      .eq('user_id', session.user.id)
    setSubtopics(subtopicsData || [])

    setLoading(false)
  }

  function getSubjectName(subjectId) {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown subject'
  }

  function getSubtopicName(subtopicId) {
    return subtopics.find(s => s.id === subtopicId)?.title || 'Unknown subtopic'
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function getScoreColor(score, total) {
    if (!score || !total) return 'text-gray-500'
    const pct = score / total
    if (pct >= 0.8) return 'text-emerald-600'
    if (pct >= 0.6) return 'text-amber-600'
    return 'text-red-500'
  }

  function getScoreBg(score, total) {
    if (!score || !total) return 'bg-gray-50 border-gray-200'
    const pct = score / total
    if (pct >= 0.8) return 'bg-emerald-50 border-emerald-200'
    if (pct >= 0.6) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  function getTypeIcon(type) {
    const props = { size: 18, strokeWidth: 2 }
    if (type === 'mcq') return <ListChecks {...props} className="text-emerald-600" />
    if (type === 'structured') return <PencilLine {...props} className="text-blue-500" />
    return <FileText {...props} className="text-amber-500" />
  }

  function getAvgScore() {
    const mcq = quizResults.filter(r => r.score !== null && r.total !== null)
    if (mcq.length === 0) return null
    const avg = mcq.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / mcq.length
    return Math.round(avg)
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

  if (loading) {
    return <LoadingScreen message="Loading your history..." />
  }

  const avgScore = getAvgScore()
  const strongest = getStrongestSubject()
  const weakest = getWeakestSubject()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">Study history</h1>
        <p className="text-sm text-gray-400 mt-1">Your past quiz results and performance analysis</p>
      </div>

      {quizResults.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
            <History size={28} strokeWidth={1.5} className="text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-gray-700 mb-2">No quiz history yet</div>
          <div className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            Complete a tutor session and take a quiz to see your results and performance analysis here.
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-emerald-100 p-5">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Quizzes taken</div>
              <div className="text-3xl font-bold text-emerald-800">{quizResults.length}</div>
              <div className="text-xs text-emerald-500 mt-1">All time</div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Average MCQ score</div>
              <div className={`text-3xl font-bold ${avgScore !== null ? (avgScore >= 80 ? 'text-emerald-600' : avgScore >= 60 ? 'text-amber-600' : 'text-red-500') : 'text-emerald-800'}`}>
                {avgScore !== null ? `${avgScore}%` : '—'}
              </div>
              <div className="text-xs text-emerald-500 mt-1">MCQ quizzes only</div>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-5">
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">MCQ quizzes</div>
              <div className="text-3xl font-bold text-emerald-800">
                {quizResults.filter(r => r.quiz_type === 'mcq').length}
              </div>
              <div className="text-xs text-emerald-500 mt-1">Multiple choice</div>
            </div>
          </div>

          {(strongest || weakest) && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {strongest && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={18} strokeWidth={2} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Strongest subject</div>
                    <div className="text-sm font-bold text-emerald-900 truncate">{strongest.name}</div>
                    <div className="text-xs text-emerald-600 mt-0.5">Average: {strongest.score}%</div>
                  </div>
                </div>
              )}
              {weakest && weakest.name !== strongest?.name && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={18} strokeWidth={2} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Needs more study</div>
                    <div className="text-sm font-bold text-red-900 truncate">{weakest.name}</div>
                    <div className="text-xs text-red-500 mt-0.5">Average: {weakest.score}% — review this subject</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {quizResults.map(result => (
              <div key={result.id} className="bg-white rounded-2xl border border-emerald-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(result.quiz_type)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">
                        {getSubjectName(result.subject_id)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {getSubtopicName(result.subtopic_id)}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg capitalize">
                          {result.quiz_type}
                        </span>
                        <span className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-lg capitalize">
                          {result.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {result.score !== null && result.total !== null ? (
                      <div className={`inline-flex flex-col items-center px-3 py-2 rounded-xl border ${getScoreBg(result.score, result.total)}`}>
                        <div className={`text-xl font-bold ${getScoreColor(result.score, result.total)}`}>
                          {result.score}/{result.total}
                        </div>
                        <div className={`text-xs font-medium ${getScoreColor(result.score, result.total)}`}>
                          {Math.round((result.score / result.total) * 100)}%
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                        Written answer
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">{formatDate(result.created_at)}</div>
                    {onRetryQuiz && result.subject_id && result.subtopic_id && (
                      <motion.button
                        onClick={() => onRetryQuiz(result.subject_id, result.subtopic_id)}
                        className="mt-2 text-xs text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Retry quiz
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}