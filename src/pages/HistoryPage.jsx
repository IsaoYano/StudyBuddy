import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function HistoryPage({ session }) {
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

  function getTypeEmoji(type) {
    if (type === 'mcq') return '🔤'
    if (type === 'structured') return '✏️'
    return '📝'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-400">Loading history...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">Study history</h1>
        <p className="text-sm text-gray-400 mt-1">Your past quiz results and performance</p>
      </div>

      {quizResults.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No quiz history yet</div>
          <div className="text-xs text-gray-400">Complete a quiz after a tutor session to see your results here</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {quizResults.map(result => (
            <div key={result.id} className="bg-white rounded-2xl border border-emerald-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {getTypeEmoji(result.quiz_type)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {getSubjectName(result.subject_id)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {getSubtopicName(result.subtopic_id)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
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
                    <div>
                      <div className={`text-2xl font-bold ${getScoreColor(result.score, result.total)}`}>
                        {result.score}/{result.total}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {Math.round((result.score / result.total) * 100)}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Written answer</div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">{formatDate(result.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quizResults.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-emerald-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Overall performance</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-800">{quizResults.length}</div>
              <div className="text-xs text-gray-400 mt-1">Quizzes taken</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-800">
                {quizResults.filter(r => r.quiz_type === 'mcq').length}
              </div>
              <div className="text-xs text-gray-400 mt-1">MCQ quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-800">
                {(() => {
                  const mcq = quizResults.filter(r => r.score !== null && r.total !== null)
                  if (mcq.length === 0) return '—'
                  const avg = mcq.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / mcq.length
                  return Math.round(avg) + '%'
                })()}
              </div>
              <div className="text-xs text-gray-400 mt-1">Average MCQ score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}