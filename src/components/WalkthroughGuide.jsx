import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    targetId: null,
    page: 'dashboard',
    title: 'Welcome to StudyBuddy',
    description: 'Your AI study companion for FSKPM, UNIMAS. This tour takes 60 seconds and shows you everything.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: null,
    tooltipPrefer: 'auto',
  },
  {
    id: 'study-banner',
    targetId: 'guide-study-banner',
    page: 'dashboard',
    title: 'Your next priority',
    description: 'This card shows exactly what to study next, ranked by exam urgency. The closer your exam, the higher it appears.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'important',
    tooltipPrefer: 'bottom',
  },
  {
    id: 'streak',
    targetId: 'streak-card',
    page: 'dashboard',
    title: 'Your study streak',
    description: 'Complete a quiz each day to keep your streak alive. Streaks show consistent effort — something universities value.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'need',
    tooltipPrefer: 'bottom',
  },
  {
    id: 'calendar',
    targetId: 'guide-calendar',
    page: 'dashboard',
    title: 'Study planner',
    description: 'See your exam dates and planned study sessions in one place. Tap any date to plan which subjects to study that day.',
    actionHint: 'Tap a date chip to try it',
    requiresAction: false,
    actionTargetId: null,
    tier: 'need',
    tooltipPrefer: 'top',
  },
  {
    id: 'subjects-nav',
    targetId: 'nav-subjects',
    page: 'dashboard',
    title: 'My Subjects',
    description: 'All your subjects and subtopics live here. Upload lecture files and StudyBuddy extracts the subtopics automatically.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'important',
    tooltipPrefer: 'right',
  },
  {
    id: 'add-subject',
    targetId: 'guide-add-subject-subjects',
    page: 'subjects',
    title: 'Add your first subject',
    description: 'Tap this button to add a subject with its exam date. You can upload a PDF, PPTX, DOCX, or image right away.',
    actionHint: 'Tap Next to continue the tour',
    requiresAction: false,
    actionTargetId: null,
    tier: 'important',
    tooltipPrefer: 'bottom',
  },
  {
    id: 'subtopic-actions',
    targetId: 'guide-subtopic-actions',
    page: 'subjects',
    title: 'Study, Quiz, Cards',
    description: 'Each subtopic has three modes: Study with the AI tutor, Quiz yourself, or review Flashcards with spaced repetition.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'important',
    tooltipPrefer: 'top',
  },
  {
    id: 'notes',
    targetId: 'nav-notes',
    page: 'subjects',
    title: 'My Notes',
    description: 'After a tutor session, generate structured study notes here. Export them as PDF for offline revision.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'need',
    tooltipPrefer: 'right',
  },
  {
    id: 'history',
    targetId: 'nav-history',
    page: 'subjects',
    title: 'History',
    description: 'See your quiz scores over time and identify your weakest subjects. Retry any past quiz directly from here.',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: 'need',
    tooltipPrefer: 'right',
  },
  {
    id: 'done',
    targetId: null,
    page: null,
    title: 'You are all set!',
    description: 'Add your first subject and take a quiz today to start your streak. Good luck with your studies!',
    actionHint: null,
    requiresAction: false,
    actionTargetId: null,
    tier: null,
    tooltipPrefer: 'auto',
  },
]

function SpotlightOverlay({ rect, padding = 8, onClickOutside }) {
  if (!rect) {
    return (
      <motion.div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.65)', pointerEvents: 'all' }}
        onClick={onClickOutside}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
    )
  }
  const top = rect.top - padding
  const left = rect.left - padding
  const right = rect.right + padding
  const bottom = rect.bottom + padding
  const color = 'rgba(0,0,0,0.65)'
  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: top, backgroundColor: color, pointerEvents: 'all' }}
        onClick={onClickOutside}
      />
      <div
        style={{ position: 'fixed', top: bottom, left: 0, right: 0, bottom: 0, backgroundColor: color, pointerEvents: 'all' }}
        onClick={onClickOutside}
      />
      <div
        style={{ position: 'fixed', top: top, left: 0, width: left, height: bottom - top, backgroundColor: color, pointerEvents: 'all' }}
        onClick={onClickOutside}
      />
      <div
        style={{ position: 'fixed', top: top, left: right, right: 0, height: bottom - top, backgroundColor: color, pointerEvents: 'all' }}
        onClick={onClickOutside}
      />
    </div>
  )
}

function PulsingRing({ rect, padding = 8 }) {
  if (!rect) return null
  const style = {
    position: 'fixed',
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    borderRadius: 12,
    border: '2px solid var(--primary)',
    pointerEvents: 'none',
    zIndex: 52,
  }
  return (
    <>
      <motion.div
        style={style}
        animate={{ scale: [1, 1.05, 1], opacity: [0.9, 0.4, 0.9] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{ ...style, border: '4px solid white', borderRadius: 14 }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.05, 0.15] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
      />
    </>
  )
}

function computeTooltipStyle(rect, prefer, windowWidth, windowHeight) {
  const CARD_W = Math.min(360, windowWidth - 32)
  const CARD_H = 300  // generous estimate so we never clip
  const GAP = 16
  const PAD = 16

  if (windowWidth < 768) {
    return {
      position: 'fixed',
      bottom: 24,
      left: PAD,
      right: PAD,
      width: 'auto',
      zIndex: 53,
    }
  }

  if (!rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: CARD_W,
      zIndex: 53,
    }
  }

  const spaceTop    = rect.top
  const spaceBottom = windowHeight - rect.bottom
  const spaceLeft   = rect.left
  const spaceRight  = windowWidth - rect.right

  // Determine side — if preferred side lacks space, fall through to auto
  let side = prefer
  if (side !== 'auto') {
    const hasSpace =
      (side === 'bottom' && spaceBottom >= CARD_H + GAP) ||
      (side === 'top'    && spaceTop    >= CARD_H + GAP) ||
      (side === 'right'  && spaceRight  >= CARD_W + GAP) ||
      (side === 'left'   && spaceLeft   >= CARD_W + GAP)
    if (!hasSpace) side = 'auto'
  }
  if (side === 'auto') {
    side = spaceBottom >= CARD_H + GAP ? 'bottom'
         : spaceTop    >= CARD_H + GAP ? 'top'
         : spaceRight  >= CARD_W + GAP ? 'right'
         : 'left'
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

  if (side === 'bottom') {
    return {
      position: 'fixed',
      top: Math.min(rect.bottom + GAP, windowHeight - CARD_H - PAD),
      left: clamp(rect.left + rect.width / 2 - CARD_W / 2, PAD, windowWidth - CARD_W - PAD),
      width: CARD_W,
      zIndex: 53,
    }
  }
  if (side === 'top') {
    return {
      position: 'fixed',
      top: Math.max(PAD, rect.top - CARD_H - GAP),
      left: clamp(rect.left + rect.width / 2 - CARD_W / 2, PAD, windowWidth - CARD_W - PAD),
      width: CARD_W,
      zIndex: 53,
    }
  }
  if (side === 'right') {
    return {
      position: 'fixed',
      top: clamp(rect.top + rect.height / 2 - CARD_H / 2, PAD, windowHeight - CARD_H - PAD),
      left: Math.min(rect.right + GAP, windowWidth - CARD_W - PAD),
      width: CARD_W,
      zIndex: 53,
    }
  }
  // left
  return {
    position: 'fixed',
    top: clamp(rect.top + rect.height / 2 - CARD_H / 2, PAD, windowHeight - CARD_H - PAD),
    left: Math.max(PAD, rect.left - CARD_W - GAP),
    width: CARD_W,
    zIndex: 53,
  }
}

function TooltipCard({ step, total, current, onNext, onPrev, onSkip, isMobile }) {
  const isFirst = step === 0
  const isLast = step === total - 1

  const tierColor = current.tier === 'important' ? 'var(--danger)'
    : current.tier === 'need' ? '#d97706'
    : current.tier === 'good' ? '#059669'
    : 'var(--primary)'

  const tierBg = current.tier === 'important' ? 'rgba(220,38,38,0.1)'
    : current.tier === 'need' ? 'rgba(217,119,6,0.1)'
    : current.tier === 'good' ? 'rgba(5,150,105,0.1)'
    : 'var(--primary-soft)'

  const tierLabel = current.tier === 'important' ? 'Important to know'
    : current.tier === 'need' ? 'Need to know'
    : current.tier === 'good' ? 'Good to know'
    : null

  const btnColor = tierColor === 'var(--primary)' ? 'var(--primary)' : tierColor

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${tierColor}50`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      {/* Progress bar */}
      <div className="w-full" style={{ height: 3, backgroundColor: 'var(--border)' }}>
        <motion.div
          className="h-full"
          style={{ backgroundColor: tierColor }}
          animate={{ width: `${((step + 1) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onNext()
          else if (info.offset.x > 60 && step > 0) onPrev()
        }}
        className="px-5 pt-4 pb-2"
        style={{ cursor: 'grab', userSelect: 'none' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Badge + counter */}
            <div className="flex items-center justify-between mb-3">
              {tierLabel ? (
                <div
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: tierBg, color: tierColor }}
                >
                  {tierLabel}
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}
                >
                  <svg viewBox="0 0 60 60" width="12" height="12" fill="none" aria-hidden>
                    <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
                    <circle cx="20" cy="22" r="3" fill="currentColor"/>
                    <circle cx="40" cy="22" r="3" fill="currentColor"/>
                    <circle cx="30" cy="40" r="3" fill="currentColor"/>
                  </svg>
                  StudyBuddy Guide
                </div>
              )}
              <span className="text-xs app-muted">{step + 1} / {total}</span>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold app-heading mb-2">{current.title}</h3>

            {/* Description */}
            <p className="text-sm app-muted leading-relaxed whitespace-pre-line">
              {current.description}
            </p>

            {/* Action hint */}
            {current.actionHint && (
              <p className="text-xs italic mt-2" style={{ color: 'var(--primary)' }}>
                {current.actionHint}
              </p>
            )}

            {/* requiresAction pulse */}
            {current.requiresAction && (
              <motion.p
                className="text-xs font-semibold mt-3 text-center"
                style={{ color: 'var(--primary)' }}
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Tap the highlighted button to continue
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {isMobile && (
          <p className="text-[10px] app-muted text-center mt-3">
            ← swipe to navigate →
          </p>
        )}
      </motion.div>

      {/* Nav buttons */}
      <div className="flex items-center gap-2 px-5 pb-5 pt-3">
        {!isFirst && (
          <motion.button
            onClick={onPrev}
            className="flex items-center justify-center text-sm font-bold px-4 py-2.5 rounded-xl app-muted min-h-[44px]"
            style={{ border: '1px solid var(--border)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Previous step"
          >
            ←
          </motion.button>
        )}
        {!current.requiresAction && (
          <motion.button
            onClick={onNext}
            className="flex-1 flex items-center justify-center text-sm font-semibold py-2.5 rounded-xl text-white min-h-[44px]"
            style={{ backgroundColor: btnColor }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLast ? 'Get started!' : 'Next →'}
          </motion.button>
        )}
        {!isLast && (
          <motion.button
            onClick={onSkip}
            className="text-xs app-muted px-3 py-2.5 rounded-xl min-h-[44px]"
            style={{ border: '1px solid var(--border)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Skip
          </motion.button>
        )}
      </div>
    </div>
  )
}

function ConfettiBlast() {
  const particles = useMemo(() => {
    return Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      rotate: (Math.random() - 0.5) * 720,
      duration: 1.2 + Math.random() * 1.2,
      delay: Math.random() * 0.8,
      size: 6 + Math.random() * 6,
      color: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'][i % 6],
      shape: ['square', 'circle', 'diamond'][i % 3],
    }))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, rotate: p.shape === 'diamond' ? 45 : 0, opacity: 1 }}
          animate={{
            y: window.innerHeight + 60,
            rotate: p.rotate,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'fixed',
            left: p.x,
            top: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : 2,
          }}
        />
      ))}
    </div>
  )
}

export default function WalkthroughGuide({ onClose, onNavigate, currentPage }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  // Smart re-entry: start from the first step matching the current page
  useEffect(() => {
    if (currentPage) {
      const idx = STEPS.findIndex(s => s.page === currentPage)
      if (idx > 0) setStep(idx)
    }
  }, [])

  // Window resize
  useEffect(() => {
    function handleResize() {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Cleanup active class on unmount
  useEffect(() => {
    return () => {
      document.querySelectorAll('.guide-target-active').forEach(el => {
        el.classList.remove('guide-target-active')
      })
    }
  }, [])

  // Measure target on step change
  useEffect(() => {
    const current = STEPS[step]
    document.querySelectorAll('.guide-target-active').forEach(el => {
      el.classList.remove('guide-target-active')
    })

    if (!current.targetId) {
      setRect(null)
      setTooltipStyle(computeTooltipStyle(null, 'auto', windowSize.w, windowSize.h))
      return
    }

    const isMobile = windowSize.w < 768
    let targetId = current.targetId
    if (isMobile) {
      if (targetId === 'nav-subjects') targetId = 'bottom-nav-subjects'
      if (targetId === 'nav-history') targetId = 'bottom-nav-history'
      if (targetId === 'nav-notes') targetId = 'bottom-nav-notes'
    }

    const el = document.getElementById(targetId)
    if (!el) {
      setRect(null)
      setTooltipStyle(computeTooltipStyle(null, 'auto', windowSize.w, windowSize.h))
      return
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect(r)
      el.classList.add('guide-target-active')
      setTooltipStyle(computeTooltipStyle(r, current.tooltipPrefer, windowSize.w, windowSize.h))
    }, 500)
  }, [step, windowSize])

  function next() {
    const current = STEPS[step]
    const isLast = step === STEPS.length - 1
    if (isLast) {
      localStorage.setItem('hasSeenWalkthrough', 'true')
      document.querySelectorAll('.guide-target-active').forEach(el => el.classList.remove('guide-target-active'))
      onClose()
      return
    }
    const nextStep = STEPS[step + 1]
    if (nextStep.page && nextStep.page !== current.page) {
      onNavigate(nextStep.page)
    }
    setStep(s => s + 1)
  }

  function prev() {
    if (step === 0) return
    const prevStep = STEPS[step - 1]
    if (prevStep.page) onNavigate(prevStep.page)
    else onNavigate('dashboard')
    setStep(s => s - 1)
  }

  function skip() {
    localStorage.setItem('hasSeenWalkthrough', 'true')
    document.querySelectorAll('.guide-target-active').forEach(el => el.classList.remove('guide-target-active'))
    onNavigate('dashboard')
    onClose()
  }

  // Auto-advance when user taps the action target
  useEffect(() => {
    const current = STEPS[step]
    if (!current.requiresAction || !current.actionTargetId) return
    const el = document.getElementById(current.actionTargetId)
    if (!el) return
    function handleAction() {
      setTimeout(() => next(), 400)
    }
    el.addEventListener('click', handleAction)
    return () => el.removeEventListener('click', handleAction)
  }, [step])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 50 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <SpotlightOverlay rect={rect} onClickOutside={skip} />
        {rect && <PulsingRing rect={rect} />}
        {step === STEPS.length - 1 && <ConfettiBlast />}
        <div style={tooltipStyle}>
          <TooltipCard
            step={step}
            total={STEPS.length}
            current={STEPS[step]}
            onNext={next}
            onPrev={prev}
            onSkip={skip}
            isMobile={windowSize.w < 768}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function WalkthroughButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl app-muted min-h-[44px]"
      style={{ border: '1px solid var(--border)' }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      title="Show app guide"
      aria-label="Open app guide"
    >
      <Lightbulb size={14} style={{ color: 'var(--primary)' }} />
      Guide
    </motion.button>
  )
}
