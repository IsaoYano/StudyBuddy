import { useState } from 'react'
import { generateQuiz, evaluateAnswer } from '../lib/quiz'
import { supabase } from '../lib/supabase'

const QUIZ_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', desc: '5 questions with 4 options each', emoji: '🔤' },
  { value: 'structured', label: 'Structured', desc: '3 questions requiring written answers', emoji: '✏️' },
  { value: 'essay', label: 'Essay', desc: '1 deep question requiring a detailed response', emoji: '📝' },
]

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner', desc: 'Basic recall and understanding', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Application of concepts', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'advanced', label: 'Advanced', desc: 'Critical thinking and analysis', color: 'text-red-600 bg-red-50 border-red-200' },
]

export default function QuizPage({ subject, subtopic, session, onBack, onComplete }) {
  const [step, setStep] = useState('setup')
  const [quizType, setQuizType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rawQuiz, setRawQuiz] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [evaluations, setEvaluations] = useState({})
  const [evaluating, setEvaluating] = useState(false)

  async function startQuiz() {
    if (!quizType || !difficulty) {
      setError('Please select both a question type and difficulty.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const raw = await generateQuiz(subtopic.title, subject.name, quizType, difficulty, [])
      setRawQuiz(raw)
      const parsed = parseQuiz(raw, quizType)
      setParsedQuestions(parsed)
      setStep('quiz')
    } catch (e) {
      setError('Could not generate quiz. Please try again.')
    }
    setLoading(false)
  }

  function parseQuiz(raw, type) {
    const blocks = raw.split('---').map(b => b.trim()).filter(b => b.length > 0)
    if (type === 'mcq') {
      return blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        const question = lines[0]?.replace(/^Q\d+:\s*/, '') || ''
        const options = lines.slice(1, 5).map(l => l.replace(/^[A-D]\)\s*/, ''))
        const answerLine = lines.find(l => l.startsWith('Answer:'))
        const explanationLine = lines.find(l => l.startsWith('Explanation:'))
        const correctLetter = answerLine?.replace('Answer:', '').trim() || 'A'
        const correctIndex = ['A','B','C','D'].indexOf(correctLetter)
        return {
          id: i,
          type: 'mcq',
          question,
          options,
          correct: correctIndex,
          correctLetter,
          explanation: explanationLine?.replace('Explanation:', '').trim() || '',
        }
      })
    }
    if (type === 'structured') {
      return blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        const question = lines[0]?.replace(/^Q\d+:\s*/, '') || ''
        const modelIdx = lines.findIndex(l => l.startsWith('Model Answer:'))
        const modelAnswer = modelIdx >= 0 ? lines.slice(modelIdx).join(' ').replace('Model Answer:', '').trim() : ''
        return { id: i, type: 'structured', question, modelAnswer }
      })
    }
    if (type === 'essay') {
      const questionLine = raw.match(/Essay Question:\s*(.+)/)?.[1] || ''
      const keyPointsMatch = raw.match(/Key Points:([\s\S]+)/)
      const keyPoints = keyPointsMatch
        ? keyPointsMatch[1].split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(l => l)
        : []
      return [{ id: 0, type: 'essay', question: questionLine, keyPoints }]
    }
    return []
  }

  function selectMCQ(questionId, optionIndex) {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }))
  }

  function updateTextAnswer(questionId, text) {
    setAnswers(prev => ({ ...prev, [questionId]: text }))
  }

  async function submitQuiz() {
    setSubmitted(true)
    if (quizType === 'mcq') {
      let correct = 0
      parsedQuestions.forEach(q => {
        if (answers[q.id] === q.correct) correct++
      })
      await saveResult(correct, parsedQuestions.length)
      return
    }
    setEvaluating(true)
    const evals = {}
    for (const q of parsedQuestions) {
      const studentAnswer = answers[q.id] || ''
      if (studentAnswer.trim()) {
        try {
          const result = await evaluateAnswer(q.question, studentAnswer, q.modelAnswer || '', subtopic.title)
          evals[q.id] = result
        } catch {
          evals[q.id] = 'Could not evaluate this answer.'
        }
      }
    }
    setEvaluations(evals)
    setEvaluating(false)
    await saveResult(null, null)
  }

  async function saveResult(score, total) {
    await supabase.from('quiz_results').insert({
      user_id: session.user.id,
      subject_id: subject.id,
      subtopic_id: subtopic.id,
      quiz_type: quizType,
      difficulty,
      score,
      total,
    })
  }

  function getMCQScore() {
    let correct = 0
    parsedQuestions.forEach(q => { if (answers[q.id] === q.correct) correct++ })
    return correct
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">← Back</button>
            <div>
              <div className="text-xs text-emerald-600 font-medium">{subject.name}</div>
              <div className="text-xs text-gray-400">Quiz: {subtopic.title}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-900 mb-1">Set up your quiz</h2>
            <p className="text-xs text-gray-400 mb-6">Choose how you want to be tested on this subtopic</p>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Question type</div>
              <div className="flex flex-col gap-2">
                {QUIZ_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setQuizType(type.value)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      quizType === type.value
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <span className="text-2xl">{type.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{type.label}</div>
                      <div className="text-xs text-gray-400">{type.desc}</div>
                    </div>
                    {quizType === type.value && <span className="ml-auto text-emerald-500 text-xs font-semibold">Selected</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Difficulty</div>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`flex-1 p-3 rounded-xl border text-center transition-all ${
                      difficulty === d.value ? d.color + ' border-current' : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    <div className="text-sm font-semibold">{d.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !quizType || !difficulty}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {loading ? 'Generating your quiz...' : 'Start quiz'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const mcqScore = quizType === 'mcq' && submitted ? getMCQScore() : null

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600">← Exit</button>
        <div className="flex-1">
          <div className="text-sm font-bold text-emerald-900">{subtopic.title} — Quiz</div>
          <div className="text-xs text-gray-400">{subject.name} · {quizType.toUpperCase()} · {difficulty}</div>
        </div>
        {submitted && quizType === 'mcq' && (
          <div className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-xl">
            Score: {mcqScore}/{parsedQuestions.length}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {submitted && quizType === 'mcq' && (
          <div className={`rounded-2xl border p-6 mb-8 text-center ${
            mcqScore === parsedQuestions.length ? 'bg-emerald-50 border-emerald-200' :
            mcqScore >= parsedQuestions.length * 0.6 ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="text-4xl font-bold text-emerald-800 mb-1">{mcqScore}/{parsedQuestions.length}</div>
            <div className="text-sm text-gray-600">
              {mcqScore === parsedQuestions.length ? 'Perfect score! Excellent work.' :
               mcqScore >= parsedQuestions.length * 0.6 ? 'Good job! Review the ones you missed.' :
               'Keep studying — you will get there.'}
            </div>
          </div>
        )}

        {evaluating && (
          <div className="bg-white rounded-2xl border border-emerald-100 p-6 mb-6 text-center">
            <div className="text-sm text-emerald-600 font-medium">AI is evaluating your answers...</div>
            <div className="flex justify-center gap-1 mt-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {parsedQuestions.map((q, qi) => (
            <div key={q.id} className="bg-white rounded-2xl border border-emerald-100 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {qi + 1}
                </div>
                <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.question}</p>
              </div>

              {q.type === 'mcq' && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[q.id] === oi
                    const isCorrect = oi === q.correct
                    const showResult = submitted
                    let cls = 'border-gray-200 bg-gray-50 text-gray-700'
                    if (showResult && isCorrect) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    else if (showResult && isSelected && !isCorrect) cls = 'border-red-400 bg-red-50 text-red-700'
                    else if (!showResult && isSelected) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    return (
                      <button
                        key={oi}
                        onClick={() => selectMCQ(q.id, oi)}
                        disabled={submitted}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${cls}`}
                      >
                        <span className="font-semibold text-xs w-5 flex-shrink-0">{['A','B','C','D'][oi]}</span>
                        {opt}
                        {showResult && isCorrect && <span className="ml-auto text-emerald-600 text-xs font-semibold">✓ Correct</span>}
                        {showResult && isSelected && !isCorrect && <span className="ml-auto text-red-500 text-xs font-semibold">✗ Wrong</span>}
                      </button>
                    )
                  })}
                  {submitted && q.explanation && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">Explanation</div>
                      <div className="text-xs text-blue-700">{q.explanation}</div>
                    </div>
                  )}
                </div>
              )}

              {q.type === 'structured' && (
                <div>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => updateTextAnswer(q.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Type your answer here..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                  />
                  {submitted && q.modelAnswer && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="text-xs font-semibold text-emerald-700 mb-1">Model Answer</div>
                      <div className="text-xs text-emerald-700">{q.modelAnswer}</div>
                    </div>
                  )}
                  {submitted && evaluations[q.id] && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">AI Feedback</div>
                      <div className="text-xs text-blue-700 whitespace-pre-wrap">{evaluations[q.id]}</div>
                    </div>
                  )}
                </div>
              )}

              {q.type === 'essay' && (
                <div>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => updateTextAnswer(q.id, e.target.value)}
                    disabled={submitted}
                    placeholder="Write your essay response here. Take your time and be thorough."
                    rows={8}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                  />
                  {submitted && q.keyPoints && q.keyPoints.length > 0 && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="text-xs font-semibold text-emerald-700 mb-2">Key points a good answer should cover</div>
                      <ul className="flex flex-col gap-1">
                        {q.keyPoints.map((point, i) => (
                          <li key={i} className="text-xs text-emerald-700 flex items-start gap-2">
                            <span className="text-emerald-500 flex-shrink-0">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {submitted && evaluations[q.id] && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">AI Feedback</div>
                      <div className="text-xs text-blue-700 whitespace-pre-wrap">{evaluations[q.id]}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {!submitted && parsedQuestions.length > 0 && (
          <button
            onClick={submitQuiz}
            className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors"
          >
            Submit answers
          </button>
        )}

        {submitted && !evaluating && (
          <button
            onClick={onComplete}
            className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors"
          >
            Finish and go back to subjects
          </button>
        )}
      </div>
    </div>
  )
}