export const SUBJECT_COLORS = [
  { dot: 'bg-violet-500',  text: 'text-violet-600',  light: 'bg-violet-100'  },
  { dot: 'bg-blue-500',    text: 'text-blue-600',    light: 'bg-blue-100'    },
  { dot: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' },
  { dot: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-100'   },
  { dot: 'bg-rose-500',    text: 'text-rose-600',    light: 'bg-rose-100'    },
  { dot: 'bg-cyan-500',    text: 'text-cyan-600',    light: 'bg-cyan-100'    },
  { dot: 'bg-fuchsia-500', text: 'text-fuchsia-600', light: 'bg-fuchsia-100' },
  { dot: 'bg-orange-500',  text: 'text-orange-600',  light: 'bg-orange-100'  },
]

export function getDaysInMonth(year, month) {
  const days = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

// 0 = Monday … 6 = Sunday
export function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function toDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateString(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getExamsOnDate(subjects, dateString) {
  return subjects.filter(s => s.exam_date === dateString)
}

// streaks rows have .study_date (actual Supabase column name)
export function hasStreak(streaks, dateString) {
  return streaks.some(s => (s.study_date ?? s.date) === dateString)
}

export function getPlansOnDate(plans, dateString) {
  return plans.filter(p => p.planned_date === dateString)
}

export function getSubjectColorIndex(subjectId) {
  if (!subjectId) return 0
  return parseInt(subjectId.replace(/-/g, '').substring(0, 8), 16) % 8
}

export function daysUntil(dateString) {
  if (!dateString) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = fromDateString(dateString)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1) return `In ${diff} days`
  return `${Math.abs(diff)} days ago`
}

export function suggestStudyPlan(subjects, existingPlans) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // count existing plans per date
  const planCountByDate = {}
  existingPlans.forEach(p => {
    planCountByDate[p.planned_date] = (planCountByDate[p.planned_date] || 0) + 1
  })

  const suggestions = []

  const futureSubjects = subjects.filter(s => {
    if (!s.exam_date) return false
    const exam = fromDateString(s.exam_date)
    exam.setHours(0, 0, 0, 0)
    return exam > today
  })

  for (const subject of futureSubjects) {
    const exam = fromDateString(subject.exam_date)
    exam.setHours(0, 0, 0, 0)

    // available days = today … exam_date - 1
    const available = []
    const cursor = new Date(today)
    while (cursor < exam) {
      const ds = toDateString(cursor)
      if ((planCountByDate[ds] || 0) < 2) available.push(ds)
      cursor.setDate(cursor.getDate() + 1)
    }

    if (available.length === 0) continue

    // already planned dates for this subject
    const alreadyPlanned = new Set(
      existingPlans.filter(p => p.subject_id === subject.id).map(p => p.planned_date)
    )

    // pick evenly spaced sessions (aim for 1 per every 2 days, max available)
    const totalDays = available.length
    const sessions = Math.max(1, Math.min(Math.ceil(totalDays / 2), totalDays))
    const step = totalDays / sessions

    for (let i = 0; i < sessions; i++) {
      const idx = Math.min(Math.round(i * step), totalDays - 1)
      const ds = available[idx]
      if (alreadyPlanned.has(ds)) continue
      suggestions.push({ subject_id: subject.id, subject_name: subject.name, planned_date: ds })
      planCountByDate[ds] = (planCountByDate[ds] || 0) + 1
    }
  }

  return suggestions
}
