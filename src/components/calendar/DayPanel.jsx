import { useState } from 'react'
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

export default function DayPanel({ selectedDate, subjects, plans, onTogglePlan, onNavigateToSubject }) {
  const todayStr = toDateString(new Date())
  const isToday = selectedDate === todayStr
  const exams = getExamsOnDate(subjects, selectedDate)
  const dayPlans = getPlansOnDate(plans, selectedDate)
  const urgentSubject = isToday ? getMostUrgentSubject(subjects) : null

  const [pending, setPending] = useState({})

  function toggle(subjectId) {
    const currently = dayPlans.some(p => p.subject_id === subjectId) || pending[subjectId] === true
    const wasRemoved = pending[subjectId] === false
    if (currently && !wasRemoved) {
      setPending(p => ({ ...p, [subjectId]: false }))
    } else {
      setPending(p => ({ ...p, [subjectId]: true }))
    }
  }

  async function handleSave() {
    for (const [subjectId, shouldAdd] of Object.entries(pending)) {
      const currently = dayPlans.some(p => p.subject_id === subjectId)
      if (shouldAdd !== currently) {
        await onTogglePlan(subjectId, selectedDate, currently)
      }
    }
    setPending({})
  }

  function isOn(subjectId) {
    if (pending[subjectId] !== undefined) return pending[subjectId]
    return dayPlans.some(p => p.subject_id === subjectId)
  }

  if (!selectedDate) return (
    <div className="app-card rounded-2xl p-8 text-center h-full flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a date to see details</p>
    </div>
  )

  return (
    <motion.div
      key={selectedDate}
      className="app-card rounded-2xl p-5 flex flex-col gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {isToday ? 'Today' : 'Selected date'}
        </div>
        <div className="text-base font-bold" style={{ color: 'var(--text)' }}>{formatDate(selectedDate)}</div>
      </div>

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
              <div key={subject.id} className="flex items-center gap-3 py-1">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} aria-hidden />
                <span className="flex-1 text-sm" style={{ color: 'var(--text-body)' }}>{subject.name}</span>
                <button
                  onClick={() => toggle(subject.id)}
                  aria-label={`${on ? 'Remove' : 'Add'} ${subject.name} study session`}
                  className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: on ? 'var(--primary)' : 'var(--surface-soft)',
                    border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                    minWidth: 44, minHeight: 24,
                  }}
                >
                  <motion.span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                    animate={{ left: on ? '22px' : '2px' }}
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
            onClick={() => onNavigateToSubject(urgentSubject.id)}
            className="text-sm font-semibold hover:underline text-left"
            style={{ color: 'var(--primary)' }}
          >
            Start studying {urgentSubject.name} →
          </button>
        </div>
      )}

      {Object.keys(pending).length > 0 && (
        <motion.button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--primary)' }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Save changes
        </motion.button>
      )}
    </motion.div>
  )
}
