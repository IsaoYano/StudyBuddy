import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { fromDateString, toDateString, getExamsOnDate, getPlansOnDate, getSubjectColorIndex, SUBJECT_COLORS } from '../../utils/calendarUtils'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function formatDate(ds) {
  const d = fromDateString(ds)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function getMostUrgentSubject(subjects) {
  const today = new Date(); today.setHours(0,0,0,0)
  return subjects
    .filter(s => s.exam_date && fromDateString(s.exam_date) > today)
    .sort((a, b) => fromDateString(a.exam_date) - fromDateString(b.exam_date))[0] || null
}

export default function BottomSheet({ isOpen, onClose, selectedDate, subjects, plans, onTogglePlan, onNavigateToSubject }) {
  const todayStr = toDateString(new Date())
  const isToday = selectedDate === todayStr
  const exams = getExamsOnDate(subjects, selectedDate || '')
  const dayPlans = getPlansOnDate(plans, selectedDate || '')
  const urgentSubject = isToday ? getMostUrgentSubject(subjects) : null

  const [pending, setPending] = useState({})

  function toggle(subjectId) {
    const currently = dayPlans.some(p => p.subject_id === subjectId)
    const pendingState = pending[subjectId]
    const effectiveOn = pendingState !== undefined ? pendingState : currently
    setPending(p => ({ ...p, [subjectId]: !effectiveOn }))
  }

  async function handleSave() {
    for (const [subjectId, shouldBe] of Object.entries(pending)) {
      const currently = dayPlans.some(p => p.subject_id === subjectId)
      if (shouldBe !== currently) {
        await onTogglePlan(subjectId, selectedDate, currently)
      }
    }
    setPending({})
    onClose()
  }

  function isOn(subjectId) {
    const currently = dayPlans.some(p => p.subject_id === subjectId)
    return pending[subjectId] !== undefined ? pending[subjectId] : currently
  }

  if (!isOpen || !selectedDate) return null

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
        aria-label="Close"
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '80vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => { if (info.offset.y > 80) onClose() }}
      >
        {/* Drag handle — also tappable to close */}
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="flex justify-center pt-3 pb-2 w-full"
        >
          <div className="w-8 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </button>

        <div className="overflow-y-auto flex-1 px-5 pb-6 flex flex-col gap-4">
          <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{formatDate(selectedDate)}</div>

          {exams.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>
              <span>📅</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                {exams.map(e => e.name).join(', ')} exam{exams.length > 1 ? 's' : ''} today!
              </span>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Plan study sessions</div>
              {subjects.map(subject => {
                const color = SUBJECT_COLORS[getSubjectColorIndex(subject.id)]
                const on = isOn(subject.id)
                return (
                  <div key={subject.id} className="flex items-center gap-3 min-h-[44px]">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} aria-hidden />
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-body)' }}>{subject.name}</span>
                    <button
                      onClick={() => toggle(subject.id)}
                      aria-label={`${on ? 'Remove' : 'Add'} ${subject.name} study session`}
                      className="relative rounded-full transition-colors focus:outline-none focus:ring-2"
                      style={{
                        width: 44, height: 26,
                        backgroundColor: on ? 'var(--primary)' : 'var(--surface-soft)',
                        border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                        minWidth: 44, minHeight: 44,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <motion.span
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ left: on ? '20px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {isToday && urgentSubject && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--primary)' }}>Study now</div>
              <button
                onClick={() => { onNavigateToSubject(urgentSubject.id); onClose() }}
                className="text-sm font-semibold text-left"
                style={{ color: 'var(--primary)', minHeight: 44 }}
              >
                Start studying {urgentSubject.name} →
              </button>
            </div>
          )}

          <motion.button
            onClick={handleSave}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2"
            style={{ backgroundColor: 'var(--primary)', minHeight: 44 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Save
          </motion.button>
        </div>
      </motion.div>
    </>
  )
}
