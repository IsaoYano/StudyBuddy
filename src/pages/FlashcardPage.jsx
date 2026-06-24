import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { generateFlashcards } from '../lib/gemini'
import { calculateSM2, isDueToday } from '../utils/sm2'
import LoadingScreen from '../components/LoadingScreen'
import { fadeUp, cardItem, staggerContainer } from '../utils/animations'

export default function FlashcardPage({ subject, subtopic, session, studentProfile, onBack }) {
  const [cards, setCards] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState('menu')
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, easy: 0, good: 0, hard: 0, again: 0 })

  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [confirmCount, setConfirmCount] = useState(0)
  const [lastRating, setLastRating] = useState(null)
  const [cardLimit, setCardLimit] = useState(10)

  useEffect(() => { loadFlashcards() }, [])

  async function loadFlashcards() {
    setLoading(true)
    const { data: existingCards } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('subtopic_id', subtopic.id)

    if (existingCards && existingCards.length > 0) {
      const { data: progressData } = await supabase
        .from('flashcard_progress')
        .select('*')
        .eq('user_id', session.user.id)
        .in('flashcard_id', existingCards.map(c => c.id))

      const progressMap = {}
      progressData?.forEach(p => { progressMap[p.flashcard_id] = p })
      setCards(existingCards)
      setProgress(progressMap)
    }
    setLoading(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const raw = await generateFlashcards(subtopic.title, subject.name, studentProfile)
      const parsed = parseFlashcards(raw)
      if (parsed.length === 0) { setGenerating(false); return }

      await supabase.from('flashcards').delete()
        .eq('user_id', session.user.id)
        .eq('subtopic_id', subtopic.id)

      const { data: newCards } = await supabase
        .from('flashcards')
        .insert(parsed.map(card => ({
          user_id: session.user.id,
          subject_id: subject.id,
          subtopic_id: subtopic.id,
          front: card.front,
          back: card.back,
        })))
        .select()

      setCards(newCards || [])
      setProgress({})
    } catch (e) {
      console.error('Failed to generate flashcards:', e)
    }
    setGenerating(false)
  }

  function parseFlashcards(raw) {
    const blocks = raw.split('---').map(b => b.trim()).filter(b => b.length > 0)
    return blocks.map(block => {
      const frontMatch = block.match(/FRONT:\s*(.+)/s)
      const backMatch = block.match(/BACK:\s*(.+)/s)
      const front = frontMatch?.[1]?.replace(/BACK:.*/s, '').trim() || ''
      const back = backMatch?.[1]?.trim() || ''
      return { front, back }
    }).filter(c => c.front && c.back)
  }

  function getDueCards() {
    return cards.filter(card => {
      const p = progress[card.id]
      if (!p) return true
      return isDueToday(p.next_review)
    })
  }

  function startStudy(cardSet) {
    const sourceCards = cardSet === 'due' ? getDueCards() : cards
    const q = sourceCards.slice(0, cardLimit).map(card => ({
      ...card,
      confirmNeeded: 1,
      confirmCount: 0,
    }))
    setQueue(q)
    setCurrentIndex(0)
    setFlipped(false)
    setSessionComplete(false)
    setLastRating(null)
    setConfirmCount(0)
    setSessionStats({ reviewed: 0, easy: 0, good: 0, hard: 0, again: 0 })
    setMode(cardSet)
  }

  async function saveProgress(card, rating) {
    const existingProgress = progress[card.id]
    const currentProgress = existingProgress || { interval: 1, ease_factor: 2.5, repetitions: 0 }
    const updated = calculateSM2(currentProgress, rating)
    const newProgress = {
      user_id: session.user.id,
      flashcard_id: card.id,
      ...updated,
      last_reviewed: new Date().toISOString(),
    }
    await supabase.from('flashcard_progress').upsert(newProgress, { onConflict: 'user_id,flashcard_id' })
    setProgress(prev => ({ ...prev, [card.id]: newProgress }))
  }

  async function handleRating(rating) {
    const card = queue[currentIndex]
    if (!card) return

    setLastRating(rating)
    const newConfirmCount = confirmCount + 1

    if (rating === 5) {
      await saveProgress(card, rating)
      setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1, easy: prev.easy + 1 }))
      advanceQueue()
      return
    }

    if (rating === 1) {
      setSessionStats(prev => ({ ...prev, again: prev.again + 1 }))
      const updatedQueue = [...queue]
      updatedQueue.splice(currentIndex + 1, 0, { ...card, confirmCount: 0, confirmNeeded: 99 })
      setQueue(updatedQueue)
      setConfirmCount(0)
      setFlipped(false)
      setTimeout(() => { setLastRating(null); setCurrentIndex(prev => prev + 1) }, 600)
      return
    }

    if (rating === 2) {
      setSessionStats(prev => ({ ...prev, hard: prev.hard + 1 }))
      if (newConfirmCount < 3) {
        setConfirmCount(newConfirmCount)
        const updatedQueue = [...queue]
        updatedQueue.splice(Math.min(currentIndex + 3, updatedQueue.length), 0, { ...card, confirmCount: newConfirmCount, confirmNeeded: 3 })
        setQueue(updatedQueue)
        advanceQueue()
        return
      }
      await saveProgress(card, rating)
      setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }))
      advanceQueue()
      return
    }

    if (rating >= 3 && rating <= 4) {
      setSessionStats(prev => ({ ...prev, good: prev.good + 1 }))
      if (newConfirmCount < 2) {
        setConfirmCount(newConfirmCount)
        const updatedQueue = [...queue]
        updatedQueue.splice(Math.min(currentIndex + 2, updatedQueue.length), 0, { ...card, confirmCount: newConfirmCount, confirmNeeded: 2 })
        setQueue(updatedQueue)
        advanceQueue()
        return
      }
      await saveProgress(card, rating)
      setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }))
      advanceQueue()
      return
    }
  }

  function advanceQueue() {
    setFlipped(false)
    setConfirmCount(0)
    setTimeout(() => {
      setLastRating(null)
      setCurrentIndex(prev => {
        const next = prev + 1
        if (next >= queue.length) {
          setSessionComplete(true)
        }
        return next
      })
    }, 600)
  }

  function getProgressBarColor() {
    if (lastRating === null) return 'var(--primary)'
    if (lastRating === 1) return '#dc2626'
    if (lastRating === 2) return '#d97706'
    if (lastRating >= 3 && lastRating <= 4) return '#059669'
    if (lastRating === 5) return '#10b981'
    return 'var(--primary)'
  }

  if (loading || generating) return <LoadingScreen />

  const dueCards = getDueCards()
  const currentCard = queue[currentIndex]
  const progressPct = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0
  const confirmNeeded = currentCard?.confirmNeeded || 1

  if (mode === 'menu') {
    return (
      <div className="min-h-screen app-bg">
        <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onBack} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold app-heading truncate">{subtopic.title}</div>
            <div className="text-xs app-muted">{subject.name} · Flashcards</div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8">
          <motion.div variants={fadeUp} initial="initial" animate="animate">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🧠</div>
              <h2 className="text-xl font-bold app-heading mb-1">Flashcards</h2>
              <p className="text-sm app-muted">Cards repeat until you truly know them</p>
            </div>

            <motion.div className="flex flex-col gap-4" variants={staggerContainer} initial="initial" animate="animate">
              {cards.length === 0 ? (
                <motion.div className="app-card rounded-2xl p-8 text-center" variants={cardItem}>
                  <div className="text-sm app-muted mb-4">No flashcards yet for this subtopic.</div>
                  <motion.button
                    onClick={handleGenerate}
                    className="text-white text-sm font-semibold px-6 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--primary)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Generate flashcards with Athena
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold app-heading">Cards per session</div>
                        <div className="text-xs app-muted mt-0.5">How many cards to review at once</div>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>{cardLimit}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[5, 10, 15, 20, cards.length].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(n => (
                        <motion.button
                          key={n}
                          onClick={() => setCardLimit(n)}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold min-w-0"
                          style={{
                            backgroundColor: cardLimit === n ? 'var(--primary)' : 'var(--surface-soft)',
                            color: cardLimit === n ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${cardLimit === n ? 'var(--primary)' : 'var(--border)'}`,
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {n === cards.length ? 'All' : n}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold app-heading">Due for review</div>
                        <div className="text-xs app-muted mt-0.5">{dueCards.length} cards due today</div>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: dueCards.length > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {dueCards.length}
                      </div>
                    </div>
                    <motion.button
                      onClick={() => startStudy('due')}
                      disabled={dueCards.length === 0}
                      className="w-full text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40"
                      style={{ backgroundColor: 'var(--primary)' }}
                      whileHover={{ scale: dueCards.length > 0 ? 1.01 : 1 }}
                      whileTap={{ scale: dueCards.length > 0 ? 0.98 : 1 }}
                    >
                      {dueCards.length === 0 ? 'No cards due — come back tomorrow' : 'Start review session'}
                    </motion.button>
                  </motion.div>

                  <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-bold app-heading">Study all cards</div>
                        <div className="text-xs app-muted mt-0.5">{cards.length} total flashcards</div>
                      </div>
                      <div className="text-2xl font-bold app-heading">{cards.length}</div>
                    </div>
                    <motion.button
                      onClick={() => startStudy('all')}
                      className="w-full text-sm font-semibold py-2.5 rounded-xl app-muted"
                      style={{ border: '1px solid var(--border)' }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Study all cards
                    </motion.button>
                  </motion.div>

                  <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
                    <div className="text-xs font-semibold app-heading mb-3">How ratings work</div>
                    <div className="flex flex-col gap-2">
                      {[
                        { label: 'Again', color: '#dc2626', desc: 'Repeats immediately until correct' },
                        { label: 'Hard', color: '#d97706', desc: 'Repeats 3× to confirm' },
                        { label: 'Good', color: '#059669', desc: 'Repeats 2× to confirm' },
                        { label: 'Easy', color: '#10b981', desc: 'Done — scheduled for later' },
                      ].map(r => (
                        <div key={r.label} className="flex items-center gap-3">
                          <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: r.color }}>{r.label}</span>
                          <span className="text-xs app-muted">{r.desc}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div className="app-card rounded-2xl p-5" variants={cardItem}>
                    <div className="text-sm font-bold app-heading mb-1">Regenerate cards</div>
                    <div className="text-xs app-muted mb-3">Replace current cards with new ones from Athena</div>
                    <motion.button
                      onClick={handleGenerate}
                      className="text-sm font-semibold px-4 py-2 rounded-xl"
                      style={{ color: 'var(--primary)', border: '1px solid var(--border)' }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Regenerate
                    </motion.button>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-sm text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-5xl mb-4 font-bold" style={{ color: 'var(--primary)' }}>★</div>
          <h2 className="text-xl font-bold app-heading mb-2">Session complete!</h2>
          <p className="text-sm app-muted mb-6">Great work on your flashcard review.</p>

          <div className="app-card rounded-2xl p-5 mb-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Mastered', value: sessionStats.reviewed, color: 'var(--primary)' },
                { label: 'Again', value: sessionStats.again, color: '#dc2626' },
                { label: 'Hard', value: sessionStats.hard, color: '#d97706' },
                { label: 'Easy', value: sessionStats.easy, color: '#10b981' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs app-muted mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={() => startStudy(mode)}
              className="w-full text-white text-sm font-semibold py-3 rounded-xl"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Study again
            </motion.button>
            <motion.button
              onClick={() => setMode('menu')}
              className="w-full text-sm font-semibold py-3 rounded-xl app-muted"
              style={{ border: '1px solid var(--border)' }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to menu
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg flex flex-col">
      <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMode('menu')} className="text-sm app-muted transition-colors hover:opacity-80">← Exit</button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold app-heading truncate">{subtopic.title}</div>
          <div className="text-xs app-muted">{currentIndex + 1} of {queue.length} cards</div>
        </div>
        <div className="text-xs app-muted">{Math.round(progressPct)}%</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">

        <div className="w-full max-w-lg mb-2">
          <div className="rounded-full h-2 overflow-hidden app-progress-track">
            <motion.div
              className="h-2 rounded-full"
              style={{ backgroundColor: getProgressBarColor() }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {confirmCount > 0 && (
          <div className="w-full max-w-lg mb-3 flex items-center gap-2">
            <span className="text-xs app-muted">Confirming:</span>
            {Array.from({ length: confirmNeeded === 99 ? 1 : confirmNeeded }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full transition-colors"
                style={{ backgroundColor: i < confirmCount ? 'var(--primary)' : 'var(--border)' }}
              />
            ))}
          </div>
        )}

        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {currentCard && !sessionComplete ? (
              <motion.div
                key={`${currentIndex}-${flipped}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => !flipped && setFlipped(true)}
                className="app-card rounded-2xl p-8 min-h-52 flex flex-col items-center justify-center text-center cursor-pointer select-none"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-4 app-muted">
                  {flipped ? 'Answer' : 'Question'}
                </div>
                <p className="text-lg font-semibold app-heading leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>
                {!flipped && <p className="text-xs app-muted mt-4">Tap to reveal answer</p>}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {flipped && currentCard && !sessionComplete && (
            <motion.div
              className="w-full max-w-lg mt-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-xs app-muted text-center mb-3">How well did you know this?</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { rating: 1, label: 'Again', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', desc: 'Repeat now' },
                  { rating: 2, label: 'Hard', color: '#d97706', bg: 'rgba(217,119,6,0.12)', desc: '3× confirm' },
                  { rating: 4, label: 'Good', color: '#059669', bg: 'rgba(5,150,105,0.12)', desc: '2× confirm' },
                  { rating: 5, label: 'Easy', color: '#10b981', bg: 'rgba(16,185,129,0.2)', desc: 'Done!' },
                ].map(btn => (
                  <motion.button
                    key={btn.rating}
                    onClick={() => handleRating(btn.rating)}
                    className="py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-0.5"
                    style={{ backgroundColor: btn.bg, color: btn.color, border: `1px solid ${btn.color}` }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span>{btn.label}</span>
                    <span style={{ fontSize: '10px', opacity: 0.8 }}>{btn.desc}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}