import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Brain,
  Laptop,
  BookOpenText,
  Handshake,
  Microscope,
} from 'lucide-react'

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

  useEffect(() => {
    fetchSubtopics()
  }, [])

  async function fetchSubtopics() {
    const { data } = await supabase
      .from('subtopics')
      .select('*')
      .eq('subject_id', subject.id)
      .order('created_at', { ascending: true })
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
    if (!subjectType) {
      setError('Please select a subject type.')
      setLoading(false)
      return
    }
    if (filledSubtopics.length === 0) {
      setError('Please add at least one subtopic.')
      setLoading(false)
      return
    }

    const { error: subjectError } = await supabase
      .from('subjects')
      .update({ name, subject_type: subjectType, exam_date: examDate })
      .eq('id', subject.id)

    if (subjectError) {
      setError(subjectError.message)
      setLoading(false)
      return
    }

    const newSubtopics = filledSubtopics.filter(s => s.isNew)
    const existingSubtopics = filledSubtopics.filter(s => !s.isNew)
    const originalIds = (await supabase.from('subtopics').select('id').eq('subject_id', subject.id)).data?.map(s => s.id) || []
    const keepIds = existingSubtopics.map(s => s.id)
    const deleteIds = originalIds.filter(id => !keepIds.includes(id))

    if (deleteIds.length > 0) {
      await supabase.from('subtopics').delete().in('id', deleteIds)
    }

    for (const sub of existingSubtopics) {
      await supabase.from('subtopics').update({ title: sub.title }).eq('id', sub.id)
    }

    if (newSubtopics.length > 0) {
      await supabase.from('subtopics').insert(
        newSubtopics.map(s => ({
          subject_id: subject.id,
          user_id: session.user.id,
          title: s.title,
        }))
      )
    }

    setLoading(false)
    onSaved()
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading subject...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="max-w-2xl mx-auto p-6">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-emerald-900">Edit subject</h1>
            <p className="text-xs text-gray-400">Update the details for this subject</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <div className="bg-white rounded-2xl border border-emerald-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Subject details</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Subject name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Exam date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Subject type</h2>
            <div className="grid grid-cols-1 gap-2">
              {SUBJECT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSubjectType(type.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    subjectType === type.value
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                    subjectType === type.value ? 'bg-emerald-100' : 'bg-gray-50'
                  }`}>
                    {type.icon}
                  </span>
                  <span className={`text-sm flex-1 ${
                    subjectType === type.value ? 'font-semibold text-emerald-800' : 'font-medium text-gray-600'
                  }`}>
                    {type.label}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    subjectType === type.value ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}>
                    {subjectType === type.value && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Subtopics</h2>
              <button
                type="button"
                onClick={addSubtopicField}
                className="text-xs text-emerald-600 font-medium hover:underline"
              >
                + Add more
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {subtopics.map((subtopic, index) => (
                <div key={subtopic.id} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{index + 1}</span>
                  <input
                    type="text"
                    value={subtopic.title}
                    onChange={e => updateSubtopic(subtopic.id, e.target.value)}
                    placeholder="Subtopic title"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                  {subtopics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubtopic(subtopic.id)}
                      className="text-gray-300 hover:text-red-400 text-lg transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>

        </form>
      </div>
    </div>
  )
}