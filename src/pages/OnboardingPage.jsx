import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, cardItem, staggerContainer } from '../utils/animations'

const QUESTIONS = [
  {
    id: 'priorKnowledge',
    question: 'How much do you already know about this subject?',
    options: [
      { value: 'none', label: 'Nothing at all', desc: 'I have never studied this before' },
      { value: 'beginner', label: 'A little bit', desc: 'I have heard of it but do not understand it yet' },
      { value: 'intermediate', label: 'Some knowledge', desc: 'I understand the basics but want to go deeper' },
      { value: 'advanced', label: 'Quite a lot', desc: 'I know this well and want to master the details' },
    ]
  },
  {
    id: 'depth',
    question: 'How deeply do you want to learn this topic?',
    options: [
      { value: 'overview', label: 'Quick overview', desc: 'Just the key ideas, nothing too detailed' },
      { value: 'conceptual', label: 'Proper understanding', desc: 'I want to understand it fully with examples' },
      { value: 'deep-dive', label: 'Deep dive', desc: 'Everything including mechanisms and critical thinking' },
    ]
  },
  {
    id: 'language',
    question: 'Which language do you prefer to learn in?',
    options: [
      { value: 'English', label: 'English', desc: 'Explain everything in English' },
      { value: 'Bahasa Malaysia', label: 'Bahasa Malaysia', desc: 'Terangkan dalam Bahasa Malaysia' },
      { value: 'Mix of both', label: 'Mixed', desc: 'Mix of English and Bahasa Malaysia is fine' },
    ]
  },
  {
    id: 'goal',
    question: 'What is your main goal for this session?',
    options: [
      { value: 'exam prep', label: 'Exam preparation', desc: 'I have an exam coming and need to study fast' },
      { value: 'understanding', label: 'Deep understanding', desc: 'I want to really understand this topic' },
      { value: 'revision', label: 'Quick revision', desc: 'I have studied this before and need a refresher' },
      { value: 'assignment', label: 'Assignment help', desc: 'I need to understand this for an assignment' },
    ]
  },
]

export default function OnboardingPage({ subject, subtopic, onStart, onBack }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})

  function selectAnswer(questionId, value) {
    const updated = { ...answers, [questionId]: value }
    setAnswers(updated)
    setTimeout(() => {
      if (step < QUESTIONS.length - 1) {
        setStep(step + 1)
      } else {
        onStart(updated)
      }
    }, 300)
  }

  const current = QUESTIONS[step]
  const progress = (step / QUESTIONS.length) * 100

  if (!subject || !subtopic) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <motion.div
          className="flex items-center gap-3 mb-8"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-emerald-600 transition-colors"
          >
            ← Back
          </button>
          <div>
            <div className="text-xs text-emerald-600 font-medium">{subject.name}</div>
            <div className="text-xs text-gray-400">Subtopic: {subtopic.title}</div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="bg-white rounded-2xl border border-emerald-100 p-8 shadow-sm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">
                  Question {step + 1} of {QUESTIONS.length}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            <h2 className="text-lg font-bold text-emerald-900 mb-6">
              {current.question}
            </h2>

            <motion.div
              className="flex flex-col gap-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {current.options.map(option => (
                <motion.button
                  key={option.value}
                  onClick={() => selectAnswer(current.id, option.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    answers[current.id] === option.value
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  variants={cardItem}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    answers[current.id] === option.value
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300'
                  }`}>
                    {answers[current.id] === option.value && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${
                      answers[current.id] === option.value ? 'text-emerald-800' : 'text-gray-800'
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{option.desc}</div>
                  </div>
                  {answers[current.id] === option.value && (
                    <motion.span
                      className="text-xs font-semibold text-emerald-600 flex-shrink-0"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      Selected
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </motion.div>

          </motion.div>
        </AnimatePresence>

        <motion.p
          className="text-xs text-gray-400 text-center mt-4"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
          Your answers personalise how the AI tutor teaches you
        </motion.p>

      </div>
    </div>
  )
}