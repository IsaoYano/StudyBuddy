import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  toDateString, getExamsOnDate, hasStreak, getPlansOnDate, getSubjectColorIndex, SUBJECT_COLORS
} from '../../utils/calendarUtils'

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function buildWindow(weekOffset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  // start 1 day before today so today is the 2nd chip (index 1)
  start.setDate(today.getDate() - 1 + weekOffset * 7)
  const days = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

export default function DateStrip({ subjects, plans, streaks, onDateSelect, selectedDate }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [direction, setDirection] = useState(0)
  const todayStr = toDateString(new Date())

  function advance(delta) {
    setDirection(delta)
    setWeekOffset(prev => prev + delta)
  }

  const days = buildWindow(weekOffset)

  return (
    <div className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={weekOffset}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1 py-2"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) advance(1)
            else if (info.offset.x > 50) advance(-1)
          }}
          initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? -80 : 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{ cursor: 'grab' }}
        >
          {days.map(date => {
            const ds = toDateString(date)
            const isToday = ds === todayStr
            const isSelected = ds === selectedDate
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
            const exams = getExamsOnDate(subjects, ds)
            const dayPlans = getPlansOnDate(plans, ds)
            const streak = hasStreak(streaks, ds)

            // build dot list: exam first (red), then subject colours, then streak (green)
            const dots = []
            if (exams.length > 0) dots.push({ key: 'exam', color: 'var(--danger)', shape: '▪' })
            dayPlans.forEach(p => {
              const sub = subjects.find(s => s.id === p.subject_id)
              if (sub) {
                const color = SUBJECT_COLORS[getSubjectColorIndex(sub.id)]
                dots.push({ key: p.subject_id, dotClass: color.dot, shape: '●' })
              }
            })
            if (streak) dots.push({ key: 'streak', color: 'var(--success)', shape: '✓' })

            const visibleDots = dots.slice(0, 3)
            const extra = dots.length - 3

            let chipBg = 'transparent'
            let chipBorder = 'transparent'
            let textColor = isPast ? 'var(--text-muted)' : 'var(--text)'
            let opacity = isPast ? 0.5 : 1

            if (isToday) {
              chipBg = 'var(--primary)'
              textColor = '#fff'
              opacity = 1
            } else if (exams.length > 0) {
              chipBg = 'var(--danger-soft)'
              textColor = 'var(--danger)'
            } else if (isSelected) {
              chipBg = 'var(--primary-light)'
              chipBorder = 'var(--primary)'
            } else if (dayPlans.length > 0) {
              chipBorder = 'var(--border)'
              chipBg = 'var(--surface-2)'
            }

            return (
              <button
                key={ds}
                onClick={() => onDateSelect(ds)}
                aria-label={`${DAY_LABELS[date.getDay()]} ${date.getDate()}`}
                className="flex flex-col items-center flex-shrink-0 rounded-xl py-2 transition-all min-h-[64px] min-w-[44px]"
                style={{
                  width: 44,
                  backgroundColor: chipBg,
                  border: `1px solid ${chipBorder}`,
                  opacity,
                  color: textColor,
                }}
              >
                <span className="text-[9px] font-medium" style={{ color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                  {DAY_LABELS[date.getDay()]}
                </span>
                <span className="text-sm font-bold leading-tight mt-0.5">{date.getDate()}</span>
                <div className="flex items-center gap-0.5 mt-1 h-3">
                  {visibleDots.map(dot => (
                    dot.dotClass
                      ? <span key={dot.key} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot.dotClass}`} />
                      : <span key={dot.key} className="text-[8px] leading-none flex-shrink-0" style={{ color: dot.color }}>{dot.shape}</span>
                  ))}
                  {extra > 0 && <span className="text-[8px] leading-none" style={{ color: 'var(--text-muted)' }}>+{extra}</span>}
                </div>
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
