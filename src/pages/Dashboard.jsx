import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddSubjectPage from './AddSubjectPage'
import OnboardingPage from './OnboardingPage'
import TutorPage from './TutorPage'
import QuizPage from './QuizPage'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exam = new Date(dateStr)
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24))
  return diff
}

function urgencyScore(subject, progress) {
  const days = daysUntil(subject.exam_date)
  if (days <= 0) return 0
  const remaining = progress.total - progress.done
  if (remaining === 0) return 0
  const daysFactor = Math.max(1, 30 - days)
  return Math.round((daysFactor * remaining * 10) / days)
}

function urgencyColor(days) {
  if (days <= 5) return 'bg-red-50 text-red-600 border-red-200'
  if (days <= 14) return 'bg-amber-50 text-amber-600 border-amber-200'
  return 'bg-emerald-50 text-emerald-600 border-emerald-200'
}

function typeIcon(type) {
  const icons = {
    neuroscience: '🧠',
    computational: '💻',
    psychological: '📖',
    social: '🤝',
    research: '🔬',
  }
  return icons[type] || '📚'
}

function Sidebar({ page, setPage, profile, session, handleLogout }) {
  return (
    <div className="w-56 bg-white border-r border-emerald-100 flex flex-col fixed h-full z-10">
      <div className="p-5 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-emerald-50 border border-emerald-200 rounded-xl flex-shrink-0">
            <svg viewBox="0 0 60 60" width="26" height="26" fill="none">
              <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round"/>
              <line x1="30" y1="10" x2="30" y2="50" stroke="#059669" strokeWidth="1.2" strokeDasharray="3,2.5"/>
              <circle cx="20" cy="21" r="2.5" fill="#059669"/>
              <circle cx="40" cy="21" r="2.5" fill="#059669"/>
              <circle cx="25" cy="28" r="2" fill="#059669"/>
              <circle cx="35" cy="28" r="2" fill="#059669"/>
              <circle cx="30" cy="40" r="2" fill="#059669"/>
              <line x1="20" y1="21" x2="25" y2="28" stroke="#059669" strokeWidth="1" opacity="0.6"/>
              <line x1="40" y1="21" x2="35" y2="28" stroke="#059669" strokeWidth="1" opacity="0.6"/>
              <line x1="25" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="1" opacity="0.6"/>
              <line x1="35" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="1" opacity="0.6"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-800">StudyBuddy</div>
            <div className="text-xs text-emerald-400">FSKPM · UNIMAS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {[
          { id: 'dashboard', label: 'Dashboard', emoji: '🏠' },
          { id: 'subjects', label: 'My subjects', emoji: '📚' },
          { id: 'history', label: 'History', emoji: '📊' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
              page === item.id
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-emerald-100">
        <button
          onClick={() => setPage('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left mb-2 ${
            page === 'settings'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span>⚙️</span>
          Settings
        </button>
        <div className="flex items-center gap-3 mt-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
            {profile?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-700 truncate">{profile?.name || 'User'}</div>
            <div className="text-xs text-gray-400 truncate">{session.user.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-xs text-gray-400 hover:text-red-400 transition-colors text-left"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

export default function Dashboard({ session }) {
  const [page, setPage] = useState('dashboard')
  const [subjects, setSubjects] = useState([])
  const [subtopics, setSubtopics] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedSubtopic, setSelectedSubtopic] = useState(null)
  const [studentProfile, setStudentProfile] = useState(null)
  const [quizSubject, setQuizSubject] = useState(null)
  const [quizSubtopic, setQuizSubtopic] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(profileData)

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('exam_date', { ascending: true })
    setSubjects(subjectsData || [])

    const { data: subtopicsData } = await supabase
      .from('subtopics')
      .select('*')
      .eq('user_id', session.user.id)
    setSubtopics(subtopicsData || [])
    setLoading(false)
  }

  async function toggleSubtopic(id, currentStatus) {
    await supabase.from('subtopics').update({ is_done: !currentStatus }).eq('id', id)
    setSubtopics(prev => prev.map(s => s.id === id ? { ...s, is_done: !currentStatus } : s))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function getProgress(subjectId) {
    const total = subtopics.filter(s => s.subject_id === subjectId)
    const done = total.filter(s => s.is_done)
    return { total: total.length, done: done.length }
  }

  function handleStudy(subject, subtopic) {
    setSelectedSubject(subject)
    setSelectedSubtopic(subtopic)
    setPage('onboarding')
  }

  if (page === 'add') {
    return (
      <AddSubjectPage
        session={session}
        onBack={() => setPage('dashboard')}
        onSaved={() => { setPage('dashboard'); fetchData() }}
      />
    )
  }

  if (page === 'onboarding' && selectedSubject && selectedSubtopic) {
    return (
      <OnboardingPage
        subject={selectedSubject}
        subtopic={selectedSubtopic}
        studentName={profile?.name || 'Student'}
        onBack={() => setPage('subjects')}
        onStart={(answers) => {
          setStudentProfile({
            name: profile?.name || 'Student',
            subjectName: selectedSubject.name,
            subjectType: selectedSubject.subject_type,
            currentSubtopic: selectedSubtopic.title,
            priorKnowledge: answers.priorKnowledge,
            depth: answers.depth,
            language: answers.language,
            goal: answers.goal,
          })
          setPage('tutor')
        }}
      />
    )
  }

  if (page === 'tutor' && studentProfile) {
    return (
      <TutorPage
        subject={selectedSubject}
        subtopic={selectedSubtopic}
        studentProfile={studentProfile}
        onBack={() => setPage('onboarding')}
        onComplete={() => {
          setQuizSubject(selectedSubject)
          setQuizSubtopic(selectedSubtopic)
          setPage('quiz')
        }}
      />
    )
  }

  if (page === 'quiz' && quizSubject && quizSubtopic) {
    return (
      <QuizPage
        subject={quizSubject}
        subtopic={quizSubtopic}
        session={session}
        studentLanguage={studentProfile?.language || 'English'}
        onBack={() => setPage('tutor')}
        onComplete={() => { setPage('subjects'); fetchData() }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex">
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        session={session}
        handleLogout={handleLogout}
      />

      <div className="ml-56 flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-gray-400">Loading...</div>
          </div>
        ) : page === 'dashboard' ? (
          <DashboardHome
            subjects={subjects}
            subtopics={subtopics}
            getProgress={getProgress}
            profile={profile}
            onAddSubject={() => setPage('add')}
            onStudy={handleStudy}
          />
        ) : page === 'subjects' ? (
          <SubjectsPage
            subjects={subjects}
            subtopics={subtopics}
            getProgress={getProgress}
            toggleSubtopic={toggleSubtopic}
            onAddSubject={() => setPage('add')}
            onStudy={handleStudy}
          />
        ) : page === 'history' ? (
          <HistoryPage session={session} />
        ) : page === 'settings' ? (
          <SettingsPage session={session} />
        ) : null}
      </div>
    </div>
  )
}

function DashboardHome({ subjects, subtopics, getProgress, profile, onAddSubject, onStudy }) {
  const totalDone = subjects.reduce((acc, s) => acc + getProgress(s.id).done, 0)
  const totalTopics = subjects.reduce((acc, s) => acc + getProgress(s.id).total, 0)

  const scoredSubjects = subjects.map(s => ({
    ...s,
    progress: getProgress(s.id),
    score: urgencyScore(s, getProgress(s.id)),
  })).sort((a, b) => b.score - a.score)

  const topSubject = scoredSubjects.find(s => s.progress.done < s.progress.total && daysUntil(s.exam_date) > 0)
  const topSubtopic = topSubject
    ? subtopics.find(st => st.subject_id === topSubject.id && !st.is_done)
    : null

  const upcoming = subjects.find(s => daysUntil(s.exam_date) > 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">
          Good day, {profile?.name || 'there'} 👋
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {subjects.length === 0
            ? 'Add your first subject to get started.'
            : `You have ${subjects.length} subject${subjects.length > 1 ? 's' : ''} this semester.`}
        </p>
      </div>

      {topSubject && topSubtopic && (
        <div className="bg-emerald-700 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-1">Study this next</div>
            <div className="text-white font-bold text-base">{topSubject.name}</div>
            <div className="text-emerald-300 text-sm mt-0.5">{topSubtopic.title}</div>
            <div className="text-emerald-400 text-xs mt-1">
              {daysUntil(topSubject.exam_date)} days to exam · {topSubject.progress.total - topSubject.progress.done} topics remaining
            </div>
          </div>
          <button
            onClick={() => onStudy(topSubject, topSubtopic)}
            className="bg-white text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex-shrink-0"
          >
            Study now
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Subjects', value: subjects.length, sub: 'This semester' },
          { label: 'Topics done', value: totalDone, sub: `of ${totalTopics} total` },
          {
            label: 'Next exam',
            value: upcoming ? `${daysUntil(upcoming.exam_date)}d` : '—',
            sub: upcoming ? upcoming.name : 'No upcoming exams',
          },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-emerald-100 p-5">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-emerald-800">{stat.value}</div>
            <div className="text-xs text-emerald-500 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No subjects yet</div>
          <div className="text-xs text-gray-400 mb-5">Add your first subject to start tracking your study progress</div>
          <button
            onClick={onAddSubject}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Add your first subject
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Subjects by urgency</h2>
            <button onClick={onAddSubject} className="text-xs text-emerald-600 font-semibold hover:underline">
              + Add subject
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {scoredSubjects.map(subject => {
              const days = daysUntil(subject.exam_date)
              const { done, total } = subject.progress
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={subject.id} className="bg-white rounded-2xl border border-emerald-100 p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {typeIcon(subject.subject_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-gray-800 truncate">{subject.name}</div>
                      {subject.score > 50 && (
                        <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-lg font-medium">
                          High priority
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{done} of {total} subtopics done</div>
                    <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct > 0 ? 'bg-emerald-500' : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex-shrink-0 ${urgencyColor(days)}`}>
                    {days > 0 ? `${days} days` : days === 0 ? 'Exam today' : 'Exam passed'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SubjectsPage({ subjects, subtopics, getProgress, toggleSubtopic, onAddSubject, onStudy }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">My subjects</h1>
          <p className="text-sm text-gray-400 mt-1">Track your subtopics and mark them as done</p>
        </div>
        <button
          onClick={onAddSubject}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          + Add subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No subjects yet</div>
          <div className="text-xs text-gray-400 mb-4">Add your first subject to start tracking your study progress</div>
          <button onClick={onAddSubject} className="bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
            Add your first subject
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {subjects.map(subject => {
            const days = daysUntil(subject.exam_date)
            const { done, total } = getProgress(subject.id)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const subjectSubtopics = subtopics.filter(s => s.subject_id === subject.id)
            return (
              <div key={subject.id} className="bg-white rounded-2xl border border-emerald-100 p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
                    {typeIcon(subject.subject_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-gray-800">{subject.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium ${urgencyColor(days)}`}>
                        {days > 0 ? `${days} days to exam` : days === 0 ? 'Exam today' : 'Exam passed'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 capitalize">
                      {subject.subject_type.replace('_', ' ')}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct > 0 ? 'bg-emerald-500' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${pct > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{pct}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  {subjectSubtopics.map(subtopic => (
                    <div key={subtopic.id} className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSubtopic(subtopic.id, subtopic.is_done)}
                        className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${
                          subtopic.is_done
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          subtopic.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        }`}>
                          {subtopic.is_done && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className={`text-sm ${subtopic.is_done ? 'line-through opacity-60' : ''}`}>
                          {subtopic.title}
                        </span>
                      </button>
                      <button
                        onClick={() => onStudy(subject, subtopic)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
                      >
                        Study
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}