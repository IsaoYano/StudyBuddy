import { supabase } from './supabase'
import { calculateStreak } from '../utils/streak'

const DAY_MS = 24 * 60 * 60 * 1000

function avgQuizPct(quizzes) {
  const scored = quizzes.filter(q => q.score !== null && q.total > 0)
  if (scored.length === 0) return null
  return Math.round(scored.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / scored.length)
}

// NOTE: Supabase does not expose auth.users.last_sign_in_at to the client,
// so "last login" is approximated by last study ACTIVITY (streak entry,
// session update, or quiz submission). Status rules below use that.
export function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS)
}

export function statusOf(student) {
  const d = daysSince(student.lastActive)
  if (d > 7) return 'inactive'
  if (d > 3 || (student.avgScore !== null && student.avgScore < 50)) return 'at-risk'
  return 'active'
}

export async function fetchAdminData() {
  const [
    profilesRes, subjectsRes, subtopicsRes, sessionsRes, quizzesRes,
    streaksRes, cardsRes, progressRes, plansRes, ratingsRes, flagsRes,
    feedbackRes, classesRes, membersRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id, name, role'),
    supabase.from('subjects').select('id, user_id, name, exam_date'),
    supabase.from('subtopics').select('id, user_id, subject_id, title, is_done'),
    supabase.from('tutor_sessions').select('id, user_id, subject_id, subtopic_id, status, updated_at, ended_at, duration_seconds'),
    supabase.from('quiz_results').select('id, user_id, subject_id, subtopic_id, quiz_type, score, total, created_at'),
    supabase.from('study_streaks').select('user_id, study_date'),
    supabase.from('flashcards').select('id, user_id, subject_id, subtopic_id'),
    supabase.from('flashcard_progress').select('user_id, flashcard_id, repetitions'),
    supabase.from('study_plans').select('user_id, planned_date'),
    supabase.from('session_ratings').select('id, user_id, session_id, rating, comment, created_at'),
    supabase.from('ai_flags').select('*').order('created_at', { ascending: false }),
    supabase.from('feedback').select('*').order('created_at', { ascending: false }),
    supabase.from('classes').select('id, code, name'),
    supabase.from('class_members').select('class_id, student_id'),
  ])

  const profiles = profilesRes.data || []
  const subjects = subjectsRes.data || []
  const subtopics = subtopicsRes.data || []
  const sessions = sessionsRes.data || []
  const quizzes = quizzesRes.data || []
  const streaks = streaksRes.data || []
  const cards = cardsRes.data || []
  const progress = progressRes.data || []
  const plans = plansRes.data || []
  const ratings = ratingsRes.data || []
  const flags = flagsRes.data || []
  const feedback = feedbackRes.data || []
  const classes = classesRes.data || []
  const members = membersRes.data || []

  const classById = Object.fromEntries(classes.map(c => [c.id, c]))
  const classOfStudent = {}
  members.forEach(m => { classOfStudent[m.student_id] = classById[m.class_id]?.code || null })

  const masteredIds = new Set(progress.filter(p => p.repetitions >= 3).map(p => p.flashcard_id))
  const weekAgo = Date.now() - 7 * DAY_MS
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const todayStr = now.toISOString().split('T')[0]

  const students = profiles.filter(p => !p.role || p.role === 'student').map(p => {
    const mySubjects = subjects.filter(s => s.user_id === p.id)
    const mySessions = sessions.filter(s => s.user_id === p.id)
    const myQuizzes = quizzes.filter(q => q.user_id === p.id)
    const myStreakDates = streaks.filter(s => s.user_id === p.id).map(s => s.study_date)
    const myCards = cards.filter(c => c.user_id === p.id)
    const myMastered = myCards.filter(c => masteredIds.has(c.id))
    const myPlans = plans.filter(pl => pl.user_id === p.id)
    const myRatings = ratings.filter(r => r.user_id === p.id)

    const activityDates = [
      ...myStreakDates,
      ...mySessions.map(s => s.updated_at),
      ...myQuizzes.map(q => q.created_at),
    ].filter(Boolean).sort()
    const lastActive = activityDates.length > 0 ? activityDates[activityDates.length - 1] : null

    const studiedSet = new Set(myStreakDates)
    const duePlans = myPlans.filter(pl => pl.planned_date.startsWith(monthPrefix) && pl.planned_date <= todayStr)
    const keptPlans = duePlans.filter(pl => studiedSet.has(pl.planned_date))

    const student = {
      id: p.id,
      name: p.name || 'Unnamed student',
      classCode: classOfStudent[p.id] || null,
      lastActive,
      sessionsThisWeek: mySessions.filter(s => s.status === 'completed' && s.ended_at && new Date(s.ended_at).getTime() >= weekAgo).length,
      sessionsCompleted: mySessions.filter(s => s.status === 'completed').length,
      sessionsTotal: mySessions.length,
      avgScore: avgQuizPct(myQuizzes),
      mastery: myCards.length > 0 ? Math.round((myMastered.length / myCards.length) * 100) : null,
      streak: calculateStreak(myStreakDates),
      adherence: duePlans.length > 0 ? Math.round((keptPlans.length / duePlans.length) * 100) : null,
      subjects: mySubjects,
      quizzes: myQuizzes,
      sessions: mySessions,
      cards: myCards,
      masteredCount: myMastered.length,
      ratings: myRatings,
    }
    student.status = statusOf(student)
    return student
  })

  // Daily active users, last 30 days (distinct students with a streak entry)
  const dau = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS)
    const dateStr = d.toISOString().split('T')[0]
    dau.push({
      date: dateStr,
      count: new Set(streaks.filter(s => s.study_date === dateStr).map(s => s.user_id)).size,
    })
  }

  // Sessions per subject name (subjects are per-student; group by name)
  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]))
  const perSubject = {}
  sessions.forEach(s => {
    const name = subjectById[s.subject_id]?.name || 'Unknown'
    perSubject[name] = (perSubject[name] || 0) + 1
  })
  const sessionsPerSubject = Object.entries(perSubject)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const scoredThisWeek = quizzes.filter(q => q.score !== null && q.total > 0 && new Date(q.created_at).getTime() >= weekAgo)
  const nameById = Object.fromEntries(profiles.map(p => [p.id, p.name || 'Unnamed student']))

  return {
    students,
    dau,
    sessionsPerSubject,
    flags: flags.map(f => ({ ...f, studentName: nameById[f.user_id] || 'Unknown' })),
    feedback: feedback.map(f => ({ ...f, studentName: nameById[f.user_id] || 'Unknown' })),
    ratings: ratings.map(r => ({ ...r, studentName: nameById[r.user_id] || 'Unknown' })),
    subjectById,
    subtopics,
    overview: {
      totalStudents: students.length,
      activeToday: students.filter(s => daysSince(s.lastActive) === 0).length,
      activeThisWeek: students.filter(s => daysSince(s.lastActive) <= 7).length,
      sessionsThisWeek: students.reduce((acc, s) => acc + s.sessionsThisWeek, 0),
      avgScoreThisWeek: scoredThisWeek.length > 0
        ? Math.round(scoredThisWeek.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / scoredThisWeek.length)
        : null,
      avgMastery: (() => {
        const withCards = students.filter(s => s.mastery !== null)
        return withCards.length > 0 ? Math.round(withCards.reduce((acc, s) => acc + s.mastery, 0) / withCards.length) : null
      })(),
    },
  }
}

export function buildAlerts(students) {
  const alerts = []
  students.forEach(s => {
    const d = daysSince(s.lastActive)
    if (d > 7 && d !== Infinity) {
      alerts.push({ student: s, type: 'Not active', detail: `No activity for ${d} days`, severity: d })
    } else if (d > 3 && d <= 7) {
      alerts.push({ student: s, type: 'Going quiet', detail: `No activity for ${d} days`, severity: d })
    }
    if (s.avgScore !== null && s.avgScore < 50) {
      alerts.push({ student: s, type: 'Low quiz score', detail: `Average quiz score is ${s.avgScore}%`, severity: 10 + (50 - s.avgScore) / 10 })
    }
    if (d === Infinity) {
      alerts.push({ student: s, type: 'Never active', detail: 'Has not studied yet', severity: 5 })
    }
  })
  return alerts.sort((a, b) => b.severity - a.severity)
}

export function exportStudentsCSV(students) {
  const header = ['Name', 'Class', 'Last Active', 'Sessions This Week', 'Total Sessions', 'Avg Quiz Score', 'Mastery %', 'Streak', 'Adherence %', 'Status']
  const rows = students.map(s => [
    s.name,
    s.classCode || '',
    s.lastActive ? new Date(s.lastActive).toLocaleDateString('en-MY') : '',
    s.sessionsThisWeek,
    s.sessionsCompleted,
    s.avgScore ?? '',
    s.mastery ?? '',
    s.streak,
    s.adherence ?? '',
    s.status,
  ])
  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `studybuddy-report-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
