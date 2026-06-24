import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react'

const STEPS = [
  {
    tier: null,
    tierLabel: null,
    tierColor: 'var(--primary)',
    tierBg: 'var(--primary-soft)',
    title: '👋 Welcome to StudyBuddy',
    description: 'Your AI-powered study companion built for FSKPM, UNIMAS students. Let us show you around so you can get started quickly.',
    page: null,
  },
  {
    tier: 'important',
    tierLabel: 'Important to know',
    tierColor: '#dc2626',
    tierBg: 'rgba(220,38,38,0.1)',
    title: '🏠 Dashboard',
    description: 'This is your Dashboard. It shows your study streak, how many topics you have completed, and which subtopic to study next based on your exam dates. Everything starts here.',
    page: 'dashboard',
  },
  {
    tier: 'important',
    tierLabel: 'Important to know',
    tierColor: '#dc2626',
    tierBg: 'rgba(220,38,38,0.1)',
    title: '📚 My Subjects',
    description: 'Add your subjects with exam dates and subtopics here. You can upload lecture files in PDF, PPTX, DOCX, JPG or PNG — Athena reads them and extracts subtopics automatically.\n\nEach subtopic has three buttons:\n• Study — learn with Athena the AI tutor\n• Quiz — test yourself with MCQ, Structured or Essay\n• Cards — review with AI-generated flashcards using spaced repetition',
    page: 'subjects',
  },
  {
    tier: 'need',
    tierLabel: 'Need to know',
    tierColor: '#d97706',
    tierBg: 'rgba(217,119,6,0.1)',
    title: '📝 My Notes',
    description: 'After finishing a tutor session with Athena, you can generate structured study notes. They appear here where you can read, edit, and download them as a PDF anytime for offline revision.',
    page: 'notes',
  },
  {
    tier: 'need',
    tierLabel: 'Need to know',
    tierColor: '#d97706',
    tierBg: 'rgba(217,119,6,0.1)',
    title: '📊 History',
    description: 'All your past quiz results are tracked here. See your strongest and weakest subjects, your average MCQ score, and retry any quiz directly. Your study streak is also driven by completing quizzes daily.',
    page: 'history',
  },
  {
    tier: 'good',
    tierLabel: 'Good to know',
    tierColor: '#059669',
    tierBg: 'rgba(5,150,105,0.1)',
    title: '⚙️ Settings',
    description: 'Update your display name and toggle dark mode here for a more comfortable night study experience. Your preferences are saved automatically.',
    page: 'settings',
  },
  {
    tier: null,
    tierLabel: null,
    tierColor: 'var(--primary)',
    tierBg: 'var(--primary-soft)',
    title: '🎉 You are all set!',
    description: 'You now know everything you need to get started. Add your first subject, study with Athena, and take a quiz to start your streak. Good luck with your studies!',
    page: null,
  },
]

export default function WalkthroughGuide({ onClose, onNavigate }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  function next() {
    if (isLast) {
      localStorage.setItem('hasSeenWalkthrough', 'true')
      onClose()
      return
    }
    const nextStep = STEPS[step + 1]
    if (nextStep.page) onNavigate(nextStep.page)
    setStep(step + 1)
  }

  function prev() {
    if (step === 0) return
    const prevStep = STEPS[step - 1]
    if (prevStep.page) onNavigate(prevStep.page)
    else onNavigate('dashboard')
    setStep(step - 1)
  }

  function skip() {
    localStorage.setItem('hasSeenWalkthrough', 'true')
    onNavigate('dashboard')
    onClose()
  }

  const tierIcon = { important: '🔴', need: '🟡', good: '🟢' }

  return (
    <motion.div
      className="fixed inset-0 z-[70]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Overlay — non-blocking so sidebar is visible */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }}
      />

      {/* Card */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: i === step
                    ? current.tierColor
                    : i < step
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>

          {/* Card body */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="rounded-2xl p-5"
              style={{
                backgroundColor: 'var(--surface)',
                border: `1px solid ${current.tierColor}50`,
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Tier badge + step counter */}
              <div className="flex items-center justify-between mb-3">
                {current.tierLabel ? (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: current.tierBg, color: current.tierColor }}
                  >
                    <span>{tierIcon[current.tier]}</span>
                    <span>{current.tierLabel}</span>
                  </div>
                ) : (
                  <div
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}
                  >
                    StudyBuddy Guide
                  </div>
                )}
                <span className="text-xs app-muted">{step + 1} / {STEPS.length}</span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold app-heading mb-2">{current.title}</h3>

              {/* Description */}
              <p className="text-sm app-muted leading-relaxed mb-5 whitespace-pre-line">
                {current.description}
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <motion.button
                    onClick={prev}
                    className="flex-1 flex items-center justify-center gap-1 text-sm font-semibold py-2.5 rounded-xl app-muted"
                    style={{ border: '1px solid var(--border)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChevronLeft size={15} />
                    Back
                  </motion.button>
                )}
                <motion.button
                  onClick={next}
                  className="flex-1 flex items-center justify-center gap-1 text-sm font-semibold py-2.5 rounded-xl text-white"
                  style={{ backgroundColor: current.tierColor === 'var(--primary)' ? 'var(--primary)' : current.tierColor }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLast ? 'Get started!' : (
                    <>
                      Next
                      <ChevronRight size={15} />
                    </>
                  )}
                </motion.button>
                {!isLast && (
                  <motion.button
                    onClick={skip}
                    className="text-xs app-muted px-3 py-2.5 rounded-xl"
                    style={{ border: '1px solid var(--border)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Skip
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function WalkthroughButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl app-muted"
      style={{ border: '1px solid var(--border)' }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      title="Show app guide"
    >
      <Lightbulb size={14} style={{ color: 'var(--primary)' }} />
      Guide
    </motion.button>
  )
}