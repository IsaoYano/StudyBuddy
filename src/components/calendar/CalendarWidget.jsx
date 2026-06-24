import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toDateString } from '../../utils/calendarUtils'
import { useStudyPlans } from '../../hooks/useStudyPlans'
import { useStudyStreaks } from '../../hooks/useStudyStreaks'
import DateStrip from './DateStrip'
import MiniCalendar from './MiniCalendar'
import BottomSheet from './BottomSheet'
import DayPanel from './DayPanel'
import StudyPlanSuggester from './StudyPlanSuggester'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarWidget({ user, subjects, onNavigateToSubject }) {
  const userId = user?.id
  const { plans, addPlan, removePlan } = useStudyPlans(userId)
  const { streaks } = useStudyStreaks(userId)

  const todayStr = toDateString(new Date())
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [showSuggester, setShowSuggester] = useState(false)
  const [showFullCalendar, setShowFullCalendar] = useState(false)

  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  async function handleTogglePlan(subjectId, dateString, currentlyPlanned) {
    if (currentlyPlanned) await removePlan(subjectId, dateString)
    else await addPlan(subjectId, dateString)
  }

  return (
    <div className="mb-6">
      {/* ── MOBILE layout ── */}
      <div className="block md:hidden">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{monthLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFullCalendar(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg min-h-[36px]"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Full calendar →
            </button>
            <button
              onClick={() => setShowSuggester(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg min-h-[36px]"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--border)' }}
            >
              ✨ Plan week
            </button>
          </div>
        </div>

        <DateStrip
          subjects={subjects}
          plans={plans}
          streaks={streaks}
          selectedDate={selectedDate}
          onDateSelect={ds => { setSelectedDate(ds); setShowBottomSheet(true) }}
        />

        <AnimatePresence>
          {showBottomSheet && (
            <BottomSheet
              isOpen={showBottomSheet}
              onClose={() => setShowBottomSheet(false)}
              selectedDate={selectedDate}
              subjects={subjects}
              plans={plans}
              streaks={streaks}
              onTogglePlan={handleTogglePlan}
              onNavigateToSubject={onNavigateToSubject}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── TABLET / DESKTOP layout ── */}
      <div className="hidden md:grid md:grid-cols-[220px_1fr] gap-4">
        <div className="flex flex-col gap-3">
          <MiniCalendar
            subjects={subjects}
            plans={plans}
            streaks={streaks}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          <motion.button
            onClick={() => setShowSuggester(true)}
            className="w-full py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--border)', minHeight: 44 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            ✨ Plan my week
          </motion.button>
        </div>
        <DayPanel
          selectedDate={selectedDate}
          subjects={subjects}
          plans={plans}
          onTogglePlan={handleTogglePlan}
          onNavigateToSubject={onNavigateToSubject}
        />
      </div>

      {/* ── Mobile full-calendar overlay ── */}
      <AnimatePresence>
        {showFullCalendar && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'var(--background)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowFullCalendar(false)}
                className="text-sm font-medium min-h-[44px] px-2"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Back"
              >
                ← Back
              </button>
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Calendar</span>
              <button
                onClick={() => setShowSuggester(true)}
                className="text-sm font-medium min-h-[44px] px-2"
                style={{ color: 'var(--primary)' }}
              >
                ✨ Plan
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <MiniCalendar
                subjects={subjects}
                plans={plans}
                streaks={streaks}
                selectedDate={selectedDate}
                onDateSelect={ds => { setSelectedDate(ds) }}
              />
              {selectedDate && (
                <DayPanel
                  selectedDate={selectedDate}
                  subjects={subjects}
                  plans={plans}
                  onTogglePlan={handleTogglePlan}
                  onNavigateToSubject={id => { onNavigateToSubject(id); setShowFullCalendar(false) }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Suggester overlay (both breakpoints) ── */}
      <AnimatePresence>
        {showSuggester && (
          <StudyPlanSuggester
            subjects={subjects}
            plans={plans}
            onAddPlan={addPlan}
            onClose={() => setShowSuggester(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
