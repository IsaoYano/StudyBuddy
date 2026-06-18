import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Brain, Laptop, BookOpenText, Handshake, Microscope } from 'lucide-react'

const SUBJECT_TYPES = [
  { value: 'neuroscience', label: 'Neuroscience / Biological', icon: <Brain size={20} strokeWidth={2} className="text-violet-500" /> },
  { value: 'computational', label: 'Computational / Programming', icon: <Laptop size={20} strokeWidth={2} className="text-blue-500" /> },
  { value: 'psychological', label: 'Psychological / Theoretical', icon: <BookOpenText size={20} strokeWidth={2} className="text-amber-500" /> },
  { value: 'social', label: 'Social / Applied', icon: <Handshake size={20} strokeWidth={2} className="text-pink-500" /> },
  { value: 'research', label: 'Research Methods', icon: <Microscope size={20} strokeWidth={2} className="text-teal-500" /> },
]

export default function EditSubjectPage({ session, subject, onBack, onSaved }) {
  const [name, setName] = useState(subject.name)
  const [subjectType, setSubjectType] = useState(subject.subject_type)
  const [examDate, setExamDate] = useState(subject.exam_date)
  const [subtopics, setSubtopics] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchSubtopics() }, [])

  async function fetchSubtopics() {
    const { data } = await supabase.from('subtopics').select('*').eq('subject_id', subject.id).order('created_at', { ascending: true })
    setSubtopics(data || [])
    setFetching(false)
  }

  function addSubtopicField() {
    setSubtopics([...subtopics, { id: `new_${Date.now()}`, title: '', is_done: false, isNew: true }])
  }

  function updateSubtopic(id, value) {
    setSubtopics(prev => prev.map(s => s.id === id ? { ...s, title: value } : s))
  }

  function removeSubtopic(id) {
    if (subtopics.length === 1) return
    setSubtopics(prev => prev.filter(s => s.id !== id))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const filledSubtopics = subtopics.filter(s => s.title.trim() !== '')
    if (!subjectType) { setError('Please select a subject type.'); setLoading(false); return }
    if (filledSubtopics.length === 0) { setError('Please add at least one subtopic.'); setLoading(false); return }

    const { error: subjectError } = await supabase.from('subjects').update({ name, subject_type: subjectType, exam_date: examDate }).eq('id', subject.id)
    if (subjectError) { setError(subjectError.message); setLoading(false); return }

    const newSubtopics = filledSubtopics.filter(s => s.isNew)
    const existingSubtopics = filledSubtopics.filter(s => !s.isNew)
    const originalIds = (await supabase.from('subtopics').select('id').eq('subject_id', subject.id)).data?.map(s => s.id) || []
    const keepIds = existingSubtopics.map(s => s.id)
    const deleteIds = originalIds.filter(id => !keepIds.includes(id))

    if (deleteIds.length > 0) await supabase.from('subtopics').delete().in('id', deleteIds)
    for (const sub of existingSubtopics) await supabase.from('subtopics').update({ title: sub.title }).eq('id', sub.id)
    if (newSubtopics.length > 0) await supabase.from('subtopics').insert(newSubtopics.map(s => ({ subject_id: subject.id, user_id: session.user.id, title: s.title })))

    setLoading(false)
    onSaved()
  }

  if (fetching) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-sm app-muted">Loading subject...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-bg">
      <div className="max-w-2xl mx-auto p-6">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-sm app-muted transition-colors hover:opacity-80">← Back</button>
          <div>
            <h1 className="text-xl font-bold app-heading">Edit subject</h1>
            <p className="text-xs app-muted">Update the details for this subject</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <div className="app-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold app-heading mb-4">Subject details</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium app-muted mb-1.5 block">Subject name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all app-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium app-muted mb-1.5 block">Exam date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-2.5 text-sm transition-all app-input"
                />
              </div>
            </div>
          </div>

          <div className="app-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold app-heading mb-4">Subject type</h2>
            <div className="grid grid-cols-1 gap-2">
              {SUBJECT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSubjectType(type.value)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    border: `1px solid ${subjectType === type.value ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: subjectType === type.value ? 'var(--primary-soft)' : 'var(--surface-soft)',
                  }}
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: 'var(--surface)' }}>
                    {type.icon}
                  </span>
                  <span className="text-sm flex-1 font-medium app-heading">{type.label}</span>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      borderColor: subjectType === type.value ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: subjectType === type.value ? 'var(--primary)' : 'transparent',
                    }}
                  >
                    {subjectType === type.value && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="app-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold app-heading">Subtopics</h2>
              <button type="button" onClick={addSubtopicField} className="text-xs font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                + Add more
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {subtopics.map((subtopic, index) => (
                <div key={subtopic.id} className="flex gap-2 items-center">
                  <span className="text-xs app-muted w-5 text-right flex-shrink-0">{index + 1}</span>
                  <input
                    type="text"
                    value={subtopic.title}
                    onChange={e => updateSubtopic(subtopic.id, e.target.value)}
                    placeholder="Subtopic title"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all app-input"
                  />
                  {subtopics.length > 1 && (
                    <button type="button" onClick={() => removeSubtopic(subtopic.id)} className="text-lg transition-colors app-muted hover:text-red-400">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>

        </form>
      </div>
    </div>
  )
}