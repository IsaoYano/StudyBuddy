import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { modalBackdrop, modalCard } from '../utils/animations'

const REASONS = [
  { value: 'incorrect', label: 'The information is incorrect' },
  { value: 'confusing', label: 'The explanation is confusing' },
  { value: 'other', label: 'Other' },
]

export default function FlagResponseModal({ sessionId, messageId, messageText, userId, onClose }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason || submitting) return
    setSubmitting(true)
    await supabase.from('ai_flags').insert({
      session_id: sessionId,
      message_id: messageId || null,
      user_id: userId,
      flagged_text: messageText.slice(0, 2000),
      reason,
      detail: detail.trim() || null,
    })
    setDone(true)
    setTimeout(onClose, 900)
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      variants={modalBackdrop}
      initial="initial"
      animate="animate"
      exit="exit"
      onClick={onClose}
    >
      <motion.div
        className="app-card rounded-2xl shadow-xl p-6 w-full max-w-sm"
        variants={modalCard}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="text-sm font-semibold app-heading">Thanks for reporting</div>
            <div className="text-xs app-muted mt-1">Our team will review this response.</div>
          </div>
        ) : (
          <>
            <h3 className="text-base font-bold app-heading mb-4">What is wrong with this response?</h3>

            <div className="flex flex-col gap-2 mb-4">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    border: `1px solid ${reason === r.value ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: reason === r.value ? 'var(--primary-soft)' : 'var(--surface-soft)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all"
                    style={{
                      borderColor: reason === r.value ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: reason === r.value ? 'var(--primary)' : 'transparent',
                    }}
                  />
                  <span className="text-sm font-medium app-heading">{r.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={detail}
              onChange={e => setDetail(e.target.value)}
              placeholder="Add details (optional)"
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm resize-none app-input mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl app-muted text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'var(--primary)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting ? 'Sending...' : 'Submit'}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
