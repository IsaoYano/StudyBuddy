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

  function isPlanned(subjectId) {
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
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Tap a subject to add it to your study plan
          </div>
          {subjects.map(subject => {
            const color = SUBJECT_COLORS[getSubjectColorIndex(subject.id)]
            const planned = isPlanned(subject.id)
            return (
              <motion.button
                key={subject.id}
                onClick={() => onTogglePlan(subject.id, selectedDate, planned)}
                aria-label={planned ? `Remove ${subject.name} from plan` : `Plan ${subject.name} for this day`}
                className="flex items-center gap-3 px-4 rounded-xl text-left transition-all min-h-[52px]"
                style={{
                  backgroundColor: planned ? 'var(--success-soft)' : 'var(--surface-soft)',
                  border: `1px solid ${planned ? 'var(--success)' : 'var(--border)'}`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} aria-hidden />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-body)' }}>{subject.name}</span>
                <motion.span
                  key={planned ? 'on' : 'off'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-xs font-semibold px-3 py-1 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: planned ? 'var(--success)' : 'transparent',
                    color: planned ? '#fff' : 'var(--text-muted)',
                    border: planned ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {planned ? '✓ Planned' : '+ Plan'}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      )}

      {isToday && urgentSubject && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--border)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>Most urgent right now</div>
          <button
            onClick={() => onNavigateToSubject(urgentSubject.id)}
            className="text-sm font-semibold hover:underline text-left"
            style={{ color: 'var(--primary)' }}
          >
            Start studying {urgentSubject.name} →
          </button>
        </div>
      )}
    </motion.div>
  )
}
