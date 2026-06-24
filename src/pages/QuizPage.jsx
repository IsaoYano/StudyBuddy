import { useState, useEffect } from 'react'
import { generateQuiz, evaluateAnswer, QUESTION_COUNT_LIMITS } from '../lib/quiz'
import { supabase } from '../lib/supabase'
import { ListChecks, PencilLine, FileText, Minus, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, cardItem, staggerContainer, quizReveal } from '../utils/animations'

const QUIZ_TYPES = [
  {
    value: 'mcq',
    label: 'Multiple Choice',
    desc: `${QUESTION_COUNT_LIMITS.mcq.min}–${QUESTION_COUNT_LIMITS.mcq.max} questions, you choose how many`,
    icon: <ListChecks size={22} strokeWidth={2} className="text-emerald-600" />,
  },
  {
    value: 'structured',
    label: 'Structured',
    desc: `${QUESTION_COUNT_LIMITS.structured.min}–${QUESTION_COUNT_LIMITS.structured.max} questions requiring written answers`,
    icon: <PencilLine size={22} strokeWidth={2} className="text-blue-500" />,
  },
  {
    value: 'essay',
    label: 'Essay',
    desc: `${QUESTION_COUNT_LIMITS.essay.min}–${QUESTION_COUNT_LIMITS.essay.max} deep questions requiring detailed responses`,
    icon: <FileText size={22} strokeWidth={2} className="text-amber-500" />,
  },
]

export default function QuizPage({ subject, subtopic, session, onBack, onComplete, studentLanguage = 'English' }) {
  const [step, setStep] = useState('setup')
  const [quizType, setQuizType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [numQuestions, setNumQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsedQuestions, setParsedQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [evaluations, setEvaluations] = useState({})
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    if (quizType) setNumQuestions(QUESTION_COUNT_LIMITS[quizType].min)
  }, [quizType])

  function adjustNumQuestions(delta) {
    if (!quizType) return
    const { min, max } = QUESTION_COUNT_LIMITS[quizType]
    setNumQuestions(prev => Math.min(max, Math.max(min, (prev ?? min) + delta)))
  }

  async function startQuiz() {
    if (!quizType || !difficulty) {
      setError('Please select both a question type and difficulty level.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const raw = await generateQuiz(subtopic.title, subject.name, quizType, difficulty, [], studentLanguage, numQuestions)
      const parsed = parseQuiz(raw, quizType)
      setParsedQuestions(parsed)
      setStep('quiz')
    } catch (e) {
      setError('Could not generate quiz. Please try again.')
    }
    setLoading(false)
  }

  function parseQuiz(raw, type) {
    if (type === 'mcq') {
      const questions = []
      const qBlocks = raw.split(/\n(?=Q\d+:)/).map(b => b.trim()).filter(b => b.length > 0)
      const blocks = qBlocks.length > 1 ? qBlocks : raw.split('---').map(b => b.trim()).filter(b => b.length > 0)
      blocks.forEach((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        const question = lines[0]?.replace(/^Q\d+:\s*/, '') || ''
        if (!question) return
        const options = []
        lines.forEach(l => { if (/^[A-D]\)/.test(l)) options.push(l.replace(/^[A-D]\)\s*/, '')) })
        const answerLine = lines.find(l => l.startsWith('Answer:'))
        const explanationLine = lines.find(l => l.startsWith('Explanation:'))
        const correctLetter = answerLine?.replace('Answer:', '').trim().charAt(0) || 'A'
        const correctIndex = ['A','B','C','D'].indexOf(correctLetter)
        questions.push({ id: i, type: 'mcq', question, options, correct: correctIndex, correctLetter, explanation: explanationLine?.replace('Explanation:', '').trim() || '' })
      })
      return questions
    }
    if (type === 'structured') {
      const qBlocks = raw.split(/\n(?=Q\d+:)/).map(b => b.trim()).filter(b => b.length > 0)
      const blocks = qBlocks.length > 1 ? qBlocks : raw.split('---').map(b => b.trim()).filter(b => b.length > 0)
      return blocks.map((block, i) => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        const question = lines[0]?.replace(/^Q\d+:\s*/, '') || ''
        const modelIdx = lines.findIndex(l => l.startsWith('Model Answer:'))
        const modelAnswer = modelIdx >= 0 ? lines.slice(modelIdx).join(' ').replace('Model Answer:', '').trim() : ''
        return { id: i, type: 'structured', question, modelAnswer }
      })
    }
    if (type === 'essay') {
      const questions = []
      const essayBlocks = raw.split(/\n(?=Essay Question:)/).map(b => b.trim()).filter(b => b.length > 0)
      const blocks = essayBlocks.length > 1 ? essayBlocks : raw.split('---').map(b => b.trim()).filter(b => b.length > 0)
      blocks.forEach((block, i) => {
        const questionLine = block.match(/Essay Question:\s*(.+)/)?.[1] || ''
        if (!questionLine) return
        const keyPointsMatch = block.match(/Key Points:([\s\S]+)/)
        const keyPoints = keyPointsMatch ? keyPointsMatch[1].split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(l => l && !l.startsWith('Essay')) : []
        questions.push({ id: i, type: 'essay', question: questionLine, keyPoints })
      })
      return questions
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
      parsedQuestions.forEach(q => { if (answers[q.id] === q.correct) correct++ })
      await saveResult(correct, parsedQuestions.length)
      return
    }
    setEvaluating(true)
    const evals = {}
    for (const q of parsedQuestions) {
      const studentAnswer = answers[q.id] || ''
      if (studentAnswer.trim()) {
        try {
          const result = await evaluateAnswer(q.question, studentAnswer, q.modelAnswer || '', subtopic.title, studentLanguage)
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
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('study_streaks').upsert(
      { user_id: session.user.id, study_date: today },
      { onConflict: 'user_id,study_date' }
    )
  }

  function getMCQScore() {
    let correct = 0
    parsedQuestions.forEach(q => { if (answers[q.id] === q.correct) correct++ })
    return correct
  }

  const DIFFICULTIES = [
    { value: 'beginner', label: 'Beginner', desc: 'Basic recall and understanding' },
    { value: 'intermediate', label: 'Intermediate', desc: 'Application of concepts' },
    { value: 'advanced', label: 'Advanced', desc: 'Critical thinking and analysis' },
  ]

  const difficultyColors = {
    beginner: { active: '#059669', bg: 'rgba(5,150,105,0.12)', border: '#059669' },
    intermediate: { active: '#d97706', bg: 'rgba(217,119,6,0.12)', border: '#d97706' },
    advanced: { active: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: '#dc2626' },
  }

  if (step === 'setup') {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <div className="w-full max-w-lg">

          <motion.div className="flex items-center gap-3 mb-8" variants={fadeUp} initial="initial" animate="animate">
            <button onClick={onBack} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--primary)' }}>{subject.name}</div>
              <div className="text-xs app-muted">Quiz: {subtopic.title}</div>
            </div>
          </motion.div>

          <motion.div
            className="app-card rounded-2xl p-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-lg font-bold app-heading mb-1">Set up your quiz</h2>
            <p className="text-xs app-muted mb-6">Choose how you want to be tested on this subtopic</p>

            {error && (
              <motion.div
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <div className="mb-6">
              <div className="text-xs font-semibold app-muted uppercase tracking-wide mb-3">Question type</div>
              <motion.div className="flex flex-col gap-2" variants={staggerContainer} initial="initial" animate="animate">
                {QUIZ_TYPES.map(type => (
                  <motion.button
                    key={type.value}
                    onClick={() => setQuizType(type.value)}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: `1px solid ${quizType === type.value ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: quizType === type.value ? 'var(--primary-soft)' : 'var(--surface-soft)',
                    }}
                    variants={cardItem}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                      {type.icon}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold app-heading">{type.label}</div>
                      <div className="text-xs app-muted">{type.desc}</div>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: quizType === type.value ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: quizType === type.value ? 'var(--primary)' : 'transparent',
                      }}
                    >
                      {quizType === type.value && (
                        <motion.span className="text-white text-xs font-bold" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>✓</motion.span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>

            <div className="mb-6">
              <div className="text-xs font-semibold app-muted uppercase tracking-wide mb-3">Difficulty</div>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => {
                  const colors = difficultyColors[d.value]
                  const isSelected = difficulty === d.value
                  return (
                    <motion.button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className="flex-1 p-3 rounded-xl text-center transition-all relative"
                      style={{
                        border: `1px solid ${isSelected ? colors.border : 'var(--border)'}`,
                        backgroundColor: isSelected ? colors.bg : 'var(--surface-soft)',
                        color: isSelected ? colors.active : 'var(--text-muted)',
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="text-sm font-semibold">{d.label}</div>
                      <div className="text-xs app-muted mt-0.5">{d.desc}</div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.active }}>
                          <span className="text-white font-bold" style={{ fontSize: '9px' }}>✓</span>
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
              {(!quizType || !difficulty) && (
                <p className="text-xs app-muted mt-3 text-center">Choose a question type and difficulty to start.</p>
              )}
            </div>

            {quizType && (
              <div className="mb-6">
                <div className="text-xs font-semibold app-muted uppercase tracking-wide mb-3">Number of questions</div>
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    onClick={() => adjustNumQuestions(-1)}
                    disabled={numQuestions <= QUESTION_COUNT_LIMITS[quizType].min}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-soft)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Minus size={16} />
                  </motion.button>
                  <div className="text-2xl font-bold app-heading w-12 text-center">{numQuestions}</div>
                  <motion.button
                    onClick={() => adjustNumQuestions(1)}
                    disabled={numQuestions >= QUESTION_COUNT_LIMITS[quizType].max}
                    className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-30"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-soft)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
                <p className="text-xs app-muted mt-2 text-center">
                  {QUESTION_COUNT_LIMITS[quizType].min}–{QUESTION_COUNT_LIMITS[quizType].max} questions allowed
                </p>
              </div>
            )}

            <motion.button
              onClick={startQuiz}
              disabled={loading || !quizType || !difficulty}
              className="w-full text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Generating your quiz...' : 'Start quiz'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  const mcqScore = quizType === 'mcq' && submitted ? getMCQScore() : null

  return (
    <div className="min-h-screen app-bg">
      <div className="px-6 py-4 flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
        <div className="flex-1">
          <div className="text-sm font-bold app-heading">{subtopic.title} — Quiz</div>
          <div className="text-xs app-muted">{subject.name} · {quizType.toUpperCase()} · {difficulty}</div>
        </div>
        <AnimatePresence>
          {submitted && quizType === 'mcq' && (
            <motion.div
              className="text-sm font-bold px-4 py-1.5 rounded-xl"
              style={{
                backgroundColor: mcqScore === parsedQuestions.length ? 'rgba(5,150,105,0.12)' : mcqScore >= parsedQuestions.length * 0.6 ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)',
                color: mcqScore === parsedQuestions.length ? 'var(--primary)' : mcqScore >= parsedQuestions.length * 0.6 ? '#d97706' : '#dc2626',
                border: `1px solid ${mcqScore === parsedQuestions.length ? 'var(--primary)' : mcqScore >= parsedQuestions.length * 0.6 ? '#d97706' : '#dc2626'}`,
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              Score: {mcqScore}/{parsedQuestions.length}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        <AnimatePresence>
          {submitted && quizType === 'mcq' && (
            <motion.div
              className="rounded-2xl p-6 mb-8 text-center"
              style={{
                backgroundColor: mcqScore === parsedQuestions.length ? 'rgba(5,150,105,0.12)' : mcqScore >= parsedQuestions.length * 0.6 ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)',
                border: `1px solid ${mcqScore === parsedQuestions.length ? 'var(--primary)' : mcqScore >= parsedQuestions.length * 0.6 ? '#d97706' : '#dc2626'}`,
              }}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="text-4xl font-bold app-heading mb-1">{mcqScore}/{parsedQuestions.length}</div>
              <div className="text-sm app-muted">
                {mcqScore === parsedQuestions.length ? 'Perfect score! Excellent work.' :
                 mcqScore >= parsedQuestions.length * 0.6 ? 'Good job! Review the ones you missed below.' :
                 'Keep studying — review the explanations below and try again.'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {evaluating && (
            <motion.div
              className="app-card rounded-2xl p-6 mb-6 text-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--primary)' }}>AI is evaluating your answers...</div>
              <div className="flex justify-center gap-1 mt-3">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="flex flex-col gap-6" variants={staggerContainer} initial="initial" animate="animate">
          {parsedQuestions.map((q, qi) => (
            <motion.div key={q.id} className="app-card rounded-2xl p-6" variants={cardItem}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'var(--primary)' }}>
                  {qi + 1}
                </div>
                <p className="text-sm font-semibold app-heading leading-relaxed">{q.question}</p>
              </div>

              {q.type === 'mcq' && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[q.id] === oi
                    const isCorrect = oi === q.correct
                    const showResult = submitted
                    let bgColor = 'var(--surface-soft)'
                    let borderColor = 'var(--border)'
                    let textColor = 'var(--text-body)'
                    if (showResult && isCorrect) { bgColor = 'rgba(5,150,105,0.12)'; borderColor = 'var(--primary)'; textColor = 'var(--primary)' }
                    else if (showResult && isSelected && !isCorrect) { bgColor = 'rgba(220,38,38,0.12)'; borderColor = '#dc2626'; textColor = '#dc2626' }
                    else if (!showResult && isSelected) { bgColor = 'var(--primary-soft)'; borderColor = 'var(--primary)'; textColor = 'var(--primary)' }
                    return (
                      <motion.button
                        key={oi}
                        onClick={() => selectMCQ(q.id, oi)}
                        disabled={submitted}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all"
                        style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: textColor }}
                        whileHover={!submitted ? { scale: 1.005 } : {}}
                        whileTap={!submitted ? { scale: 0.995 } : {}}
                      >
                        <span className="font-semibold text-xs w-5 flex-shrink-0">{['A','B','C','D'][oi]}</span>
                        <span className="flex-1">{opt}</span>
                        {showResult && isCorrect && <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--primary)' }}>✓ Correct</span>}
                        {showResult && isSelected && !isCorrect && <span className="ml-auto text-red-500 text-xs font-semibold">✗ Wrong</span>}
                      </motion.button>
                    )
                  })}
                  <AnimatePresence>
                    {submitted && q.explanation && (
                      <motion.div
                        className="mt-2 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
                        variants={quizReveal}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>Explanation</div>
                        <div className="text-xs app-muted">{q.explanation}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none app-input"
                  />
                  <AnimatePresence>
                    {submitted && q.modelAnswer && (
                      <motion.div
                        className="mt-3 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
                        variants={quizReveal}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>Model Answer</div>
                        <div className="text-xs app-muted">{q.modelAnswer}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {submitted && evaluations[q.id] && (
                      <motion.div
                        className="mt-2 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}
                        variants={quizReveal}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="text-xs font-semibold mb-2 app-heading">AI Feedback</div>
                        {evaluations[q.id].split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className={`text-xs app-muted ${line.startsWith('Score:') ? 'font-bold text-sm mb-1 app-heading' : 'leading-relaxed'}`}>
                            {line}
                          </div>
                        ))}
                        <div className="mt-3">
                          <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--primary)', border: '1px solid var(--border)' }}>
                            Review topic
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none app-input"
                  />
                  <AnimatePresence>
                    {submitted && q.keyPoints && q.keyPoints.length > 0 && (
                      <motion.div
                        className="mt-3 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}
                        variants={quizReveal}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--primary)' }}>Key points a good answer should cover</div>
                        <ul className="flex flex-col gap-1">
                          {q.keyPoints.map((point, i) => (
                            <li key={i} className="text-xs app-muted flex items-start gap-2">
                              <span style={{ color: 'var(--primary)' }} className="flex-shrink-0">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {submitted && evaluations[q.id] && (
                      <motion.div
                        className="mt-2 rounded-xl px-4 py-3"
                        style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}
                        variants={quizReveal}
                        initial="initial"
                        animate="animate"
                      >
                        <div className="text-xs font-semibold mb-2 app-heading">AI Feedback</div>
                        {evaluations[q.id].split('\n').filter(l => l.trim()).map((line, i) => (
                          <div key={i} className={`text-xs app-muted ${line.startsWith('Score:') ? 'font-bold text-sm mb-1 app-heading' : 'leading-relaxed'}`}>
                            {line}
                          </div>
                        ))}
                        <div className="mt-3">
                          <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--primary)', border: '1px solid var(--border)' }}>
                            Review topic
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence>
          {!submitted && parsedQuestions.length > 0 && (
            <motion.button
              onClick={submitQuiz}
              className="mt-8 w-full text-white rounded-xl py-3.5 text-sm font-semibold transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Submit answers
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {submitted && !evaluating && (
            <motion.div
              className="mt-8 flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.button
                onClick={onComplete}
                className="w-full text-white rounded-xl py-3.5 text-sm font-semibold transition-colors"
                style={{ backgroundColor: 'var(--primary)' }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Finish and go back to subjects
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}