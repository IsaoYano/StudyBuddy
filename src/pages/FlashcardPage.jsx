/*
  -- Run in Supabase SQL editor before deploying this update:
  ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS hint TEXT;
  ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai';
  -- Backfill existing cards as AI-generated:
  UPDATE flashcards SET source = 'ai' WHERE source IS NULL;
*/

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { generateFlashcards, generateLifelineOptions } from '../lib/gemini'
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

  // New state
  const [editingCard, setEditingCard] = useState(null)
  const [formFront, setFormFront] = useState('')
  const [formBack, setFormBack] = useState('')
  const [formHint, setFormHint] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [lifelineOptions, setLifelineOptions] = useState(null)
  const [lifelineLoading, setLifelineLoading] = useState(false)
  const [lifelineSelected, setLifelineSelected] = useState(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [deletingCardId, setDeletingCardId] = useState(null)

  useEffect(() => { loadFlashcards() }, [])

  async function loadFlashcards() {
    setLoading(true)
    const { data: existingCards } = await supabase
      .from('flashcards')
      .select('id, user_id, subject_id, subtopic_id, front, back, hint, source, created_at')
      .eq('user_id', session.user.id)
      .eq('subtopic_id', subtopic.id)
      .order('created_at', { ascending: true })

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
        .eq('source', 'ai')

      const { data: newCards } = await supabase
        .from('flashcards')
        .insert(parsed.map(card => ({
          user_id: session.user.id,
          subject_id: subject.id,
          subtopic_id: subtopic.id,
          front: card.front,
          back: card.back,
          hint: null,
          source: 'ai',
        })))
        .select()

      setCards(prev => {
        const manualCards = prev.filter(c => c.source === 'manual')
        return [...(newCards || []), ...manualCards]
      })
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
    setHintVisible(false)
    setLifelineOptions(null)
    setLifelineSelected(null)
    setLifelineLoading(false)
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
    setHintVisible(false)
    setLifelineOptions(null)
    setLifelineSelected(null)
    setLifelineLoading(false)
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

  function getMasteryStatus(cardId) {
    const p = progress[cardId]
    if (!p || p.repetitions === 0) return 'new'
    if (p.repetitions < 3) return 'learning'
    return 'mastered'
  }

  function getMasteryLabel(cardId) {
    const s = getMasteryStatus(cardId)
    if (s === 'new') return { label: 'New', color: 'var(--text-muted)', bg: 'var(--surface-soft)' }
    if (s === 'learning') return { label: 'Learning', color: '#d97706', bg: 'rgba(217,119,6,0.1)' }
    return { label: 'Mastered', color: '#059669', bg: 'rgba(5,150,105,0.1)' }
  }

  async function handleSaveCard() {
    if (!formFront.trim() || !formBack.trim()) return
    setFormSaving(true)
    const { data: newCard } = await supabase
      .from('flashcards')
      .insert({
        user_id: session.user.id,
        subject_id: subject.id,
        subtopic_id: subtopic.id,
        front: formFront.trim(),
        back: formBack.trim(),
        hint: formHint.trim() || null,
        source: 'manual',
      })
      .select()
      .single()
    if (newCard) setCards(prev => [...prev, newCard])
    setFormFront(''); setFormBack(''); setFormHint('')
    setFormSaving(false)
    setMode('manage')
  }

  async function handleUpdateCard() {
    if (!formFront.trim() || !formBack.trim() || !editingCard) return
    setFormSaving(true)
    const { data: updated } = await supabase
      .from('flashcards')
      .update({ front: formFront.trim(), back: formBack.trim(), hint: formHint.trim() || null })
      .eq('id', editingCard.id)
      .select()
      .single()
    if (updated) setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditingCard(null)
    setFormFront(''); setFormBack(''); setFormHint('')
    setFormSaving(false)
    setMode('manage')
  }

  function openEditCard(card) {
    setEditingCard(card)
    setFormFront(card.front)
    setFormBack(card.back)
    setFormHint(card.hint || '')
    setMode('edit')
  }

  async function handleDeleteCard(cardId) {
    await supabase.from('flashcards').delete().eq('id', cardId)
    await supabase.from('flashcard_progress').delete()
      .eq('user_id', session.user.id)
      .eq('flashcard_id', cardId)
    setCards(prev => prev.filter(c => c.id !== cardId))
    setProgress(prev => { const p = { ...prev }; delete p[cardId]; return p })
    setDeletingCardId(null)
  }

  async function handleLifeline() {
    const card = queue[currentIndex]
    if (!card || lifelineLoading || lifelineOptions) return
    setLifelineLoading(true)
    try {
      const options = await generateLifelineOptions(card.front, card.back)
      setLifelineOptions(options)
    } catch (e) {
      console.error('Lifeline failed:', e)
    }
    setLifelineLoading(false)
  }

  if (loading || generating) return <LoadingScreen />

  const dueCards = getDueCards()
  const currentCard = queue[currentIndex]
  const progressPct = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0
  const confirmNeeded = currentCard?.confirmNeeded || 1
  const masteredCount = cards.filter(c => getMasteryStatus(c.id) === 'mastered').length

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (mode === 'menu') {
    return (
      <div className="min-h-screen app-bg">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onBack} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold app-heading truncate">{subtopic.title}</div>
            <div className="text-xs app-muted">{subject.name} · Flashcards</div>
          </div>
        </div>

        <motion.div variants={fadeUp} initial="initial" animate="animate">
          {/* Desktop: sidebar + main */}
          <div className="hidden md:flex min-h-[calc(100vh-65px)]">
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 p-4 flex flex-col gap-1" style={{ borderRight: '1px solid var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide app-muted px-3 mb-2">Study</p>
              {[
                { label: `Review due (${dueCards.length})`, action: () => dueCards.length > 0 && startStudy('due'), disabled: dueCards.length === 0 },
                { label: `Study all (${cards.length})`, action: () => cards.length > 0 && startStudy('all'), disabled: cards.length === 0 },
                { label: 'Manage cards', action: () => setMode('manage'), disabled: false },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  disabled={item.disabled}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all app-muted hover:opacity-80 disabled:opacity-40"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {item.label}
                </button>
              ))}
              <div className="my-2" style={{ borderTop: '1px solid var(--border)' }} />
              <button
                onClick={() => { setFormFront(''); setFormBack(''); setFormHint(''); setMode('create') }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                + Add manually
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all app-muted hover:opacity-80"
                style={{ border: '1px solid var(--border)' }}
              >
                Regenerate (Athena)
              </button>
            </div>

            {/* Main area */}
            <div className="flex-1 p-8">
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="text-sm app-muted">No flashcards yet for this subtopic.</p>
                  <button
                    onClick={handleGenerate}
                    className="text-white text-sm font-semibold px-6 py-3 rounded-xl"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    Generate with Athena
                  </button>
                </div>
              ) : (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { label: 'Total cards', value: cards.length },
                      { label: 'Due today', value: dueCards.length },
                      { label: 'Mastered', value: masteredCount },
                    ].map(stat => (
                      <div key={stat.label} className="app-card rounded-2xl p-4">
                        <div className="text-2xl font-bold app-heading">{stat.value}</div>
                        <div className="text-xs app-muted mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Card limit */}
                  <div className="app-card rounded-2xl p-5 mb-6">
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
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        >
                          {n === cards.length ? 'All' : n}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* How ratings work */}
                  <div className="app-card rounded-2xl p-5">
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
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile: stacked menu */}
          <div className="md:hidden px-4 py-6 flex flex-col gap-3">
            {/* Primary action */}
            <motion.button
              onClick={() => { setFormFront(''); setFormBack(''); setFormHint(''); setMode('create') }}
              className="w-full text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            >
              + Add card manually
            </motion.button>

            {cards.length === 0 ? (
              <div className="app-card rounded-2xl p-8 text-center">
                <div className="text-sm app-muted mb-4">No flashcards yet for this subtopic.</div>
                <motion.button
                  onClick={handleGenerate}
                  className="text-white text-sm font-semibold px-6 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--primary)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  Generate with Athena
                </motion.button>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total', value: cards.length },
                    { label: 'Due', value: dueCards.length },
                    { label: 'Mastered', value: masteredCount },
                  ].map(stat => (
                    <div key={stat.label} className="app-card rounded-2xl p-3 text-center">
                      <div className="text-xl font-bold app-heading">{stat.value}</div>
                      <div className="text-[10px] app-muted mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Card limit */}
                <div className="app-card rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold app-heading">Cards per session</div>
                    <div className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{cardLimit}</div>
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
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      >
                        {n === cards.length ? 'All' : n}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Menu items */}
                {[
                  { label: 'Due for review', count: dueCards.length, action: () => dueCards.length > 0 && startStudy('due'), disabled: dueCards.length === 0 },
                  { label: 'Study all cards', count: cards.length, action: () => startStudy('all'), disabled: false },
                  { label: 'Manage cards', count: null, action: () => setMode('manage'), disabled: false },
                ].map(item => (
                  <motion.button
                    key={item.label}
                    onClick={item.action}
                    disabled={item.disabled}
                    className="app-card rounded-2xl p-4 flex items-center gap-3 w-full text-left disabled:opacity-40"
                    whileHover={{ scale: item.disabled ? 1 : 1.01 }}
                    whileTap={{ scale: item.disabled ? 1 : 0.98 }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold app-heading">{item.label}</div>
                    </div>
                    {item.count !== null && (
                      <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{item.count}</div>
                    )}
                    <span className="text-sm app-muted">›</span>
                  </motion.button>
                ))}

                <motion.button
                  onClick={handleGenerate}
                  className="app-card rounded-2xl p-4 flex items-center gap-3 w-full text-left"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold app-heading">Regenerate (Athena)</div>
                    <div className="text-xs app-muted mt-0.5">Replace AI cards with new ones</div>
                  </div>
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── CREATE / EDIT FORM ─────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    const isEdit = mode === 'edit'
    const canSave = formFront.trim().length > 0 && formBack.trim().length > 0

    return (
      <div className="min-h-screen app-bg">
        <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => { setMode(isEdit ? 'manage' : 'menu'); setEditingCard(null) }}
            aria-label="Go back"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0"
            style={{ border: '1px solid var(--border)' }}
          >←</button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold app-heading">{isEdit ? 'Edit card' : 'New card'}</div>
            <div className="text-xs app-muted">{subtopic.title}</div>
          </div>
        </div>

        <motion.div variants={fadeUp} initial="initial" animate="animate" className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
          {/* Front */}
          <div className="app-card rounded-2xl p-5">
            <label className="text-xs font-semibold app-muted uppercase tracking-wide mb-2 block">Question (front)</label>
            <textarea
              value={formFront}
              onChange={e => setFormFront(e.target.value)}
              rows={3}
              placeholder="What is the question?"
              className="w-full text-sm app-heading bg-transparent outline-none resize-none leading-relaxed"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Back */}
          <div className="app-card rounded-2xl p-5">
            <label className="text-xs font-semibold app-muted uppercase tracking-wide mb-2 block">Answer (back)</label>
            <textarea
              value={formBack}
              onChange={e => setFormBack(e.target.value)}
              rows={3}
              placeholder="What is the answer?"
              className="w-full text-sm app-heading bg-transparent outline-none resize-none leading-relaxed"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Hint */}
          <div className="app-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-xs font-semibold app-muted uppercase tracking-wide">Hint</label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg app-muted" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface-soft)' }}>optional</span>
            </div>
            <textarea
              value={formHint}
              onChange={e => setFormHint(e.target.value)}
              rows={2}
              placeholder="A clue shown before revealing the answer..."
              className="w-full text-sm bg-transparent outline-none resize-none leading-relaxed app-muted"
            />
            <p className="text-[10px] app-muted mt-2">Shown to student on request before the answer</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={isEdit ? handleUpdateCard : handleSaveCard}
              disabled={!canSave || formSaving}
              className="flex-1 text-white text-sm font-semibold py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--primary)' }}
              whileHover={{ scale: canSave && !formSaving ? 1.01 : 1 }}
              whileTap={{ scale: canSave && !formSaving ? 0.98 : 1 }}
            >
              {formSaving ? '...' : (isEdit ? 'Save changes' : 'Save card')}
            </motion.button>
            <motion.button
              onClick={() => { setMode(isEdit ? 'manage' : 'menu'); setEditingCard(null) }}
              className="px-5 text-sm font-semibold py-3.5 rounded-xl app-muted"
              style={{ border: '1px solid var(--border)' }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── MANAGE ─────────────────────────────────────────────────────────────────
  if (mode === 'manage') {
    return (
      <div className="min-h-screen app-bg">
        <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setMode('menu')} aria-label="Go back" className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0" style={{ border: '1px solid var(--border)' }}>←</button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold app-heading">All cards ({cards.length})</div>
            <div className="text-xs app-muted">{subtopic.title}</div>
          </div>
          <motion.button
            onClick={() => { setFormFront(''); setFormBack(''); setFormHint(''); setMode('create') }}
            className="text-xs font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            + Add
          </motion.button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {cards.length === 0 ? (
            <motion.div variants={fadeUp} initial="initial" animate="animate" className="app-card rounded-2xl p-12 text-center">
              <div className="text-sm app-muted mb-4">No cards yet.</div>
              <div className="flex flex-col gap-3 items-center">
                <motion.button
                  onClick={handleGenerate}
                  className="text-white text-sm font-semibold px-6 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--primary)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  Generate with Athena
                </motion.button>
                <motion.button
                  onClick={() => { setFormFront(''); setFormBack(''); setFormHint(''); setMode('create') }}
                  className="text-sm font-semibold px-6 py-3 rounded-xl app-muted"
                  style={{ border: '1px solid var(--border)' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  Add manually
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-3">
              {cards.map(card => {
                const mastery = getMasteryLabel(card.id)
                const isDeleting = deletingCardId === card.id
                return (
                  <motion.div key={card.id} variants={cardItem} className="app-card rounded-2xl p-4 flex items-start gap-3">
                    {/* Source badge */}
                    <div className="flex-shrink-0 mt-0.5">
                      {card.source === 'manual' ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border" style={{ backgroundColor: 'rgba(139,92,246,0.08)', color: '#7c3aed', borderColor: 'rgba(139,92,246,0.3)' }}>Mine</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#2563eb', borderColor: 'rgba(59,130,246,0.3)' }}>AI</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold app-heading truncate">{card.front}</p>
                      <p className="text-xs app-muted truncate mt-0.5">{card.back}</p>
                      <div className="mt-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: mastery.bg, color: mastery.color }}>{mastery.label}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        onClick={() => openEditCard(card)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg app-muted hover:opacity-80"
                        style={{ border: '1px solid var(--border)' }}
                        whileTap={{ scale: 0.93 }}
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </motion.button>
                      {isDeleting ? (
                        <motion.button
                          onClick={() => handleDeleteCard(card.id)}
                          className="h-8 px-2 flex items-center justify-center rounded-lg text-[10px] font-bold"
                          style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileTap={{ scale: 0.93 }}
                        >
                          Confirm?
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => setDeletingCardId(card.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg app-muted hover:text-red-400"
                          style={{ border: '1px solid var(--border)' }}
                          whileTap={{ scale: 0.93 }}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  // ── SESSION COMPLETE ───────────────────────────────────────────────────────
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
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            >
              Study again
            </motion.button>
            <motion.button
              onClick={() => setMode('menu')}
              className="w-full text-sm font-semibold py-3 rounded-xl app-muted"
              style={{ border: '1px solid var(--border)' }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            >
              Back to menu
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── REVIEW SESSION (due / all) ─────────────────────────────────────────────
  return (
    <div className="min-h-screen app-bg flex flex-col">
      <div className="px-6 py-4 flex items-center gap-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setMode('menu')}
          aria-label="Go back"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-base font-bold app-muted hover:opacity-80 transition-colors flex-shrink-0"
          style={{ border: '1px solid var(--border)' }}
        >←</button>
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
                className="app-card rounded-2xl p-8 flex flex-col items-center text-center select-none"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', cursor: !flipped ? 'pointer' : 'default' }}
                onClick={() => { if (!flipped && !lifelineOptions) setFlipped(true) }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-4 app-muted">
                  {flipped ? 'Answer' : 'Question'}
                </div>
                <p className="text-lg font-semibold app-heading leading-relaxed">
                  {flipped ? currentCard.back : currentCard.front}
                </p>

                {!flipped && (
                  <>
                    {!lifelineOptions && (
                      <p className="text-xs app-muted mt-4">Tap to reveal answer</p>
                    )}

                    <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
                      {currentCard.hint && !hintVisible && (
                        <motion.button
                          onClick={e => { e.stopPropagation(); setHintVisible(true) }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full app-muted"
                          style={{ border: '1px solid var(--border)' }}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        >
                          Show hint
                        </motion.button>
                      )}
                      {!lifelineOptions && (
                        <motion.button
                          onClick={e => { e.stopPropagation(); handleLifeline() }}
                          disabled={lifelineLoading}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                          style={{
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            opacity: lifelineLoading ? 0.6 : 1,
                          }}
                          whileHover={{ scale: lifelineLoading ? 1 : 1.03 }}
                          whileTap={{ scale: lifelineLoading ? 1 : 0.97 }}
                        >
                          {lifelineLoading ? '...' : 'Help me (4 options)'}
                        </motion.button>
                      )}
                    </div>

                    {hintVisible && currentCard.hint && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 w-full rounded-xl p-3 text-sm text-left"
                        style={{ backgroundColor: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', color: '#d97706' }}
                      >
                        {currentCard.hint}
                      </motion.div>
                    )}

                    {lifelineOptions && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 w-full"
                        onClick={e => e.stopPropagation()}
                      >
                        <p className="text-xs app-muted text-center mb-2">Choose the correct answer:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {lifelineOptions.map((option, i) => {
                            const isCorrect = option === currentCard.back
                            const isSelected = lifelineSelected === option
                            let bg = 'var(--surface-soft)'
                            let border = 'var(--border)'
                            let color = 'var(--text-body)'
                            if (isSelected && isCorrect) { bg = 'rgba(5,150,105,0.12)'; border = '#059669'; color = '#059669' }
                            if (isSelected && !isCorrect) { bg = 'rgba(220,38,38,0.1)'; border = '#dc2626'; color = '#dc2626' }
                            if (!isSelected && lifelineSelected && isCorrect) { bg = 'rgba(5,150,105,0.12)'; border = '#059669'; color = '#059669' }
                            return (
                              <motion.button
                                key={i}
                                onClick={() => {
                                  if (lifelineSelected) return
                                  setLifelineSelected(option)
                                  setTimeout(() => setFlipped(true), 800)
                                }}
                                className="text-xs font-medium p-3 rounded-xl text-left transition-all"
                                style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
                                whileHover={{ scale: lifelineSelected ? 1 : 1.02 }}
                                whileTap={{ scale: lifelineSelected ? 1 : 0.97 }}
                              >
                                {String.fromCharCode(65 + i)}) {option}
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { rating: 1, label: 'Again', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', desc: 'Repeat now' },
                  { rating: 2, label: 'Hard', color: '#d97706', bg: 'rgba(217,119,6,0.12)', desc: '3× confirm' },
                  { rating: 4, label: 'Good', color: '#059669', bg: 'rgba(5,150,105,0.12)', desc: '2× confirm' },
                  { rating: 5, label: 'Easy', color: '#10b981', bg: 'rgba(16,185,129,0.2)', desc: 'Done!' },
                ].map(btn => (
                  <motion.button
                    key={btn.rating}
                    onClick={() => handleRating(btn.rating)}
                    className="py-3 rounded-xl text-sm font-semibold flex flex-col items-center gap-0.5 min-h-[44px]"
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
