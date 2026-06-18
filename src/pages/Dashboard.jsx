import LoadingScreen from '../components/LoadingScreen'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AddSubjectPage from './AddSubjectPage'
import OnboardingPage from './OnboardingPage'
import TutorPage from './TutorPage'
import QuizPage from './QuizPage'
import HistoryPage from './HistoryPage'
import SettingsPage from './SettingsPage'
import EditSubjectPage from './EditSubjectPage'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem, modalBackdrop, modalCard } from '../utils/animations'
import { calculateStreak } from '../utils/streak'
import {
  LayoutDashboard,
  BookOpen,
  History,
  Settings,
  LogOut,
  Brain,
  Laptop,
  BookOpenText,
  Handshake,
  Microscope,
  BookMarked,
} from 'lucide-react'

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
  const props = { size: 18, strokeWidth: 2 }
  const icons = {
    neuroscience: <Brain {...props} className="text-violet-500" />,
    computational: <Laptop {...props} className="text-blue-500" />,
    psychological: <BookOpenText {...props} className="text-amber-500" />,
    social: <Handshake {...props} className="text-pink-500" />,
    research: <Microscope {...props} className="text-teal-500" />,
  }
  return icons[type] || <BookMarked {...props} className="text-gray-400" />
}

function DeleteModal({ onCancel, onConfirm }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      variants={modalBackdrop}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-sm"
        variants={modalCard}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Delete subject?</h3>
        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
          This will permanently delete the subject along with all its subtopics and quiz results. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Yes, delete
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
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
          { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
          { id: 'subjects', label: 'My subjects', icon: <BookOpen size={18} strokeWidth={2} /> },
          { id: 'history', label: 'History', icon: <History size={18} strokeWidth={2} /> },
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
            <span className={page === item.id ? 'text-emerald-600' : 'text-gray-400'}>
              {item.icon}
            </span>
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
          <span className={page === 'settings' ? 'text-emerald-600' : 'text-gray-400'}>
            <Settings size={18} strokeWidth={2} />
          </span>
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
          className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 transition-colors text-left mt-1"
        >
          <LogOut size={14} strokeWidth={2} />
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
  const [editingSubject, setEditingSubject] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [retrySubject, setRetrySubject] = useState(null)
  const [retrySubtopic, setRetrySubtopic] = useState(null)
  const [streak, setStreak] = useState(0)

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

    const { data: streakData } = await supabase
      .from('study_streaks')
      .select('study_date')
      .eq('user_id', session.user.id)
    setStreak(calculateStreak(streakData?.map(s => s.study_date) || []))

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

  function handleDirectQuiz(subject, subtopic) {
    setQuizSubject(subject)
    setQuizSubtopic(subtopic)
    setPage('directquiz')
  }

  if (page === 'directquiz' && quizSubject && quizSubtopic) {
    return (
      <QuizPage
        subject={quizSubject}
        subtopic={quizSubtopic}
        session={session}
        studentLanguage="English"
        onBack={() => setPage('subjects')}
        onComplete={() => { setPage('subjects'); fetchData() }}
      />
    )
  }

  function handleEditSubject(subject) {
    setEditingSubject(subject)
    setPage('edit')
  }

  function handleDeleteSubject(subjectId) {
    setDeleteConfirm(subjectId)
  }

  async function confirmDelete() {
    await supabase.from('subjects').delete().eq('id', deleteConfirm)
    setDeleteConfirm(null)
    fetchData()
  }

  async function handleRetryQuiz(subjectId, subtopicId) {
    let subject = subjects.find(s => s.id === subjectId)
    let subtopic = subtopics.find(s => s.id === subtopicId)

    if (!subject) {
      const { data } = await supabase.from('subjects').select('*').eq('id', subjectId).single()
      subject = data
    }
    if (!subtopic) {
      const { data } = await supabase.from('subtopics').select('*').eq('id', subtopicId).single()
      subtopic = data
    }
    if (!subject || !subtopic) return

    setRetrySubject(subject)
    setRetrySubtopic(subtopic)
    setPage('retry')
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

  if (page === 'edit' && editingSubject) {
    return (
      <EditSubjectPage
        session={session}
        subject={editingSubject}
        onBack={() => setPage('subjects')}
        onSaved={() => { setPage('subjects'); fetchData() }}
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

  if (page === 'retry' && retrySubject && retrySubtopic) {
    return (
      <QuizPage
        subject={retrySubject}
        subtopic={retrySubtopic}
        session={session}
        studentLanguage="English"
        onBack={() => { setRetrySubject(null); setRetrySubtopic(null); setPage('history') }}
        onComplete={() => { setRetrySubject(null); setRetrySubtopic(null); setPage('history'); fetchData() }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex">
      <AnimatePresence>
        {deleteConfirm && (
          <DeleteModal
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

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
              <LoadingScreen message="Loading your subjects..." />
          </div>
        ) : page === 'dashboard' ? (
          <DashboardHome
            subjects={subjects}
            subtopics={subtopics}
            getProgress={getProgress}
            profile={profile}
            streak={streak}
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
            onDirectQuiz={handleDirectQuiz}
            onEdit={handleEditSubject}
            onDelete={handleDeleteSubject}
          />
        ) : page === 'history' ? (
          <HistoryPage session={session} onRetryQuiz={handleRetryQuiz} />
        ) : page === 'settings' ? (
          <SettingsPage session
          session={session}
          onNameUpdate={(newName) => setProfile(prev => ({ ...prev, name: newName }))}
          />
        ) : null}
      </div>
    </div>
  )
}

function DashboardHome({ subjects, subtopics, getProgress, profile, streak, onAddSubject, onStudy }) {
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
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-900">
          Good day, {profile?.name || 'there'}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {subjects.length === 0
            ? 'Add your first subject to get started.'
            : `You have ${subjects.length} subject${subjects.length > 1 ? 's' : ''} this semester.`}
        </p>
      </div>

      {topSubject && topSubtopic && (
        <motion.div
          className="bg-emerald-700 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div>
            <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wide mb-1">Study this next</div>
            <div className="text-white font-bold text-base">{topSubject.name}</div>
            <div className="text-emerald-300 text-sm mt-0.5">{topSubtopic.title}</div>
            <div className="text-emerald-400 text-xs mt-1">
              {daysUntil(topSubject.exam_date)} days to exam · {topSubject.progress.total - topSubject.progress.done} topics remaining
            </div>
          </div>
          <motion.button
            onClick={() => onStudy(topSubject, topSubtopic)}
            className="bg-white text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex-shrink-0"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Study now
          </motion.button>
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-3 gap-4 mb-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {[
          { label: 'Subjects', value: subjects.length, sub: 'This semester' },
          { label: 'Topics done', value: totalDone, sub: `of ${totalTopics} total` },
          {
            label: 'Study streak',
            value: streak > 0 ? `${streak} 🔥` : '0',
            sub: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} in a row` : 'Complete a quiz to start',
          },
        ].map(stat => (
          <motion.div key={stat.label} className="bg-white rounded-2xl border border-emerald-100 p-5" variants={cardItem}>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-emerald-800">{stat.value}</div>
            <div className="text-xs text-emerald-500 mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {subjects.length === 0 ? (
        <motion.div
          className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center"
          variants={cardItem}
          initial="initial"
          animate="animate"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1">No subjects yet</div>
          <div className="text-xs text-gray-400 mb-5">Add your first subject to start tracking your study progress</div>
          <motion.button
            onClick={onAddSubject}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Add your first subject
          </motion.button>
        </motion.div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Subjects by urgency</h2>
            <button onClick={onAddSubject} className="text-xs text-emerald-600 font-semibold hover:underline">
              + Add subject
            </button>
          </div>
          <motion.div
            className="flex flex-col gap-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {scoredSubjects.map(subject => {
              const days = daysUntil(subject.exam_date)
              const { done, total } = subject.progress
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <motion.div
                  key={subject.id}
                  className="bg-white rounded-2xl border border-emerald-100 p-5 flex items-center gap-4"
                  variants={cardItem}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
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
                      <motion.div
                        className={`h-1.5 rounded-full ${pct > 0 ? 'bg-emerald-500' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex-shrink-0 ${urgencyColor(days)}`}>
                    {days > 0 ? `${days} days` : days === 0 ? 'Exam today' : 'Exam passed'}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

function SubjectsPage({ subjects, subtopics, getProgress, toggleSubtopic, onAddSubject, onStudy, onDirectQuiz, onEdit, onDelete }) {
  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">My subjects</h1>
          <p className="text-sm text-gray-400 mt-1">Track your subtopics and mark them as done</p>
        </div>
        <motion.button
          onClick={onAddSubject}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          + Add subject
        </motion.button>
      </div>

      {subjects.length === 0 ? (
        <motion.div
          className="bg-white rounded-2xl border border-dashed border-emerald-200 p-12 text-center"
          variants={cardItem}
          initial="initial"
          animate="animate"
        >
          <div className="text-sm font-semibold text-gray-600 mb-1">No subjects yet</div>
          <div className="text-xs text-gray-400 mb-4">Add your first subject to start tracking your study progress</div>
          <button onClick={onAddSubject} className="bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">
            Add your first subject
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {subjects.map(subject => {
            const days = daysUntil(subject.exam_date)
            const { done, total } = getProgress(subject.id)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const subjectSubtopics = subtopics.filter(s => s.subject_id === subject.id)
            return (
              <motion.div
                key={subject.id}
                className="bg-white rounded-2xl border border-emerald-100 p-6"
                variants={cardItem}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
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
                        <motion.div
                          className={`h-1.5 rounded-full ${pct > 0 ? 'bg-emerald-500' : ''}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${pct > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onEdit(subject)}
                      className="text-xs text-gray-400 hover:text-emerald-600 border border-gray-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(subject.id)}
                      className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
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
                      <motion.button
                        onClick={() => onDirectQuiz(subject, subtopic)}
                        className="bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        Quiz
                      </motion.button>
                      <motion.button
                        onClick={() => onStudy(subject, subtopic)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors flex-shrink-0"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        Study
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}