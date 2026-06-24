import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  getDaysInMonth, getFirstDayOfMonth, toDateString,
  getExamsOnDate, hasStreak, getPlansOnDate, getSubjectColorIndex, SUBJECT_COLORS
} from '../../utils/calendarUtils'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['M','T','W','T','F','S','S']

export default function MiniCalendar({ subjects, plans, streaks, selectedDate, onDateSelect }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const todayStr = toDateString(today)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const days = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month) // 0=Mon
  const blanks = Array(firstDay).fill(null)

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function goToday() { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)) }

  return (
    <div className="app-card rounded-2xl p-4 select-none" style={{ minWidth: 200 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors min-h-[44px] min-w-[44px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={goToday}
          className="text-xs font-bold"
          style={{ color: 'var(--text)' }}
        >
          {MONTH_NAMES[month]} {year}
        </button>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors min-h-[44px] min-w-[44px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{l}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(date => {
          const ds = toDateString(date)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const exams = getExamsOnDate(subjects, ds)
          const dayPlans = getPlansOnDate(plans, ds)
          const streak = hasStreak(streaks, ds)

          const dots = []
          if (exams.length > 0) dots.push({ key: 'exam', color: 'var(--danger)' })
          dayPlans.slice(0, 2).forEach(p => {
            const sub = subjects.find(s => s.id === p.subject_id)
            if (sub) dots.push({ key: p.subject_id, dotClass: SUBJECT_COLORS[getSubjectColorIndex(sub.id)].dot })
          })
          if (streak) dots.push({ key: 'streak', color: 'var(--success)' })
          const visibleDots = dots.slice(0, 3)

          let bg = 'transparent'
          let textCol = isPast ? 'var(--text-muted)' : 'var(--text)'
          let fontWeight = 'normal'
          let ring = ''

          if (isToday) { bg = 'var(--primary)'; textCol = '#fff'; fontWeight = 'bold' }
          else if (isSelected) { bg = 'var(--primary-light)'; ring = `0 0 0 1px var(--primary)` }
          else if (exams.length > 0) { bg = 'var(--danger-soft)'; textCol = 'var(--danger)' }

          return (
            <button
              key={ds}
              onClick={() => onDateSelect(ds)}
              aria-label={ds}
              className="flex flex-col items-center justify-center rounded-full transition-colors"
              style={{
                width: 28, height: 28, margin: '0 auto',
                backgroundColor: bg,
                color: textCol,
                fontWeight,
                opacity: isPast && !isToday ? 0.5 : 1,
                boxShadow: ring,
              }}
            >
              <span className="text-[11px] leading-none">{date.getDate()}</span>
              {visibleDots.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {visibleDots.map(dot => (
                    dot.dotClass
                      ? <span key={dot.key} className={`w-1 h-1 rounded-full ${dot.dotClass}`} />
                      : <span key={dot.key} className="w-1 h-1 rounded-full" style={{ backgroundColor: dot.color }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
