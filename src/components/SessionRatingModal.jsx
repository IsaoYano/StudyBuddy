import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { modalBackdrop, modalCard } from '../utils/animations'

export default function SessionRatingModal({ sessionId, userId, onDone }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!rating || submitting) return
    setSubmitting(true)
    await supabase.from('session_ratings').insert({
      session_id: sessionId,
      user_id: userId,
      rating,
      comment: comment.trim() || null,
    })
    onDone()
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      variants={modalBackdrop}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="app-card rounded-2xl shadow-xl p-6 w-full max-w-sm"
        variants={modalCard}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <h3 className="text-base font-bold app-heading text-center mb-1">How was this session?</h3>
        <p className="text-xs app-muted text-center mb-5">Your rating helps Athena improve</p>

        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <motion.button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
              className="w-11 h-11 flex items-center justify-center"
              whileTap={{ scale: 0.85 }}
            >
              <Star
                size={30}
                strokeWidth={1.5}
                fill={(hovered || rating) >= n ? 'var(--primary)' : 'transparent'}
                style={{ color: (hovered || rating) >= n ? 'var(--primary)' : 'var(--text-muted)' }}
              />
            </motion.button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell us more (optional)"
          rows={2}
          className="w-full rounded-xl px-4 py-2.5 text-sm resize-none app-input mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onDone}
            className="flex-1 px-4 py-2.5 rounded-xl app-muted text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--border)' }}
          >
            Skip
          </button>
          <motion.button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? 'Sending...' : 'Submit'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
