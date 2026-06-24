import { useState } from 'react'
import { motion } from 'framer-motion'
import { suggestStudyPlan, fromDateString, getSubjectColorIndex, SUBJECT_COLORS } from '../../utils/calendarUtils'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatShort(ds) {
  const d = fromDateString(ds)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
}

export default function StudyPlanSuggester({ subjects, plans, onAddPlan, onClose }) {
  const suggestions = suggestStudyPlan(subjects, plans)
  const [checked, setChecked] = useState(() => Object.fromEntries(suggestions.map((s, i) => [i, true])))
  const [saving, setSaving] = useState(false)

  function toggleCheck(i) { setChecked(prev => ({ ...prev, [i]: !prev[i] })) }

  async function handleApply() {
    setSaving(true)
    for (let i = 0; i < suggestions.length; i++) {
      if (checked[i]) {
        const s = suggestions[i]
        await onAddPlan(s.subject_id, s.planned_date)
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile, centred on desktop */}
      <motion.div
        className="fixed z-50 flex flex-col rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          // mobile: full-width bottom sheet
          bottom: 0, left: 0, right: 0,
          maxHeight: '80vh',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="text-base font-bold" style={{ color: 'var(--text)' }}>Suggested study plan</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Deselect any sessions you don't want</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-sm min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-3 flex flex-col gap-2">
          {suggestions.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
              No suggestions available — all upcoming days are already planned or no subjects have future exams.
            </p>
          ) : (
            suggestions.map((s, i) => {
              const color = SUBJECT_COLORS[getSubjectColorIndex(s.subject_id)]
              return (
                <label key={i} className="flex items-center gap-3 min-h-[44px] cursor-pointer rounded-xl px-3 py-2 transition-colors" style={{ backgroundColor: checked[i] ? 'var(--primary-light)' : 'var(--surface-soft)' }}>
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => toggleCheck(i)}
                    className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                  />
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} aria-hidden />
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-body)' }}>{s.subject_name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatShort(s.planned_date)}</span>
                </label>
              )
            })
          )}
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', minHeight: 44 }}
          >
            Dismiss
          </button>
          <motion.button
            onClick={handleApply}
            disabled={saving || suggestions.length === 0}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--primary)', minHeight: 44 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? 'Saving…' : 'Apply suggestions'}
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
