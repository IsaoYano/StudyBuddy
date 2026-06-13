import {
  Brain,
  Laptop,
  BookOpenText,
  Handshake,
  Microscope,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { extractSubtopicsFromText, readPDFText } from '../lib/slideReader'

const SUBJECT_TYPES = [
  { value: 'neuroscience', label: 'Neuroscience / Biological', icon: <Brain size={20} strokeWidth={2} className="text-violet-500" /> },
  { value: 'computational', label: 'Computational / Programming', icon: <Laptop size={20} strokeWidth={2} className="text-blue-500" /> },
  { value: 'psychological', label: 'Psychological / Theoretical', icon: <BookOpenText size={20} strokeWidth={2} className="text-amber-500" /> },
  { value: 'social', label: 'Social / Applied', icon: <Handshake size={20} strokeWidth={2} className="text-pink-500" /> },
  { value: 'research', label: 'Research Methods', icon: <Microscope size={20} strokeWidth={2} className="text-teal-500" /> },
]

export default function AddSubjectPage({ session, onBack, onSaved }) {
  const [name, setName] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [subtopics, setSubtopics] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileRef = useRef(null)

  function addSubtopicField() {
    setSubtopics([...subtopics, ''])
  }

  function updateSubtopic(index, value) {
    const updated = [...subtopics]
    updated[index] = value
    setSubtopics(updated)
  }

  function removeSubtopic(index) {
    if (subtopics.length === 1) return
    setSubtopics(subtopics.filter((_, i) => i !== index))
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!name) {
      setError('Please enter a subject name first so the AI knows what subject the slides are for.')
      return
    }
    setUploadLoading(true)
    setError('')
    setUploadSuccess(false)
    try {
      let text = ''
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await readPDFText(file)
      } else {
        setError('Please upload a PDF file. Image slides are not yet supported.')
        setUploadLoading(false)
        return
      }
      if (!text || text.trim().length < 50) {
        setError('Could not read enough text from the PDF. Try a PDF with selectable text, not a scanned image.')
        setUploadLoading(false)
        return
      }
      const extracted = await extractSubtopicsFromText(text, name)
      if (extracted.length > 0) {
        setSubtopics(extracted)
        setUploadSuccess(true)
      } else {
        setError('Could not extract subtopics from this file. You can still add them manually.')
      }
    } catch (err) {
      setError('File reading failed. Please try again or add subtopics manually.')
    }
    setUploadLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const filledSubtopics = subtopics.filter(s => s.trim() !== '')
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

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, name, subject_type: subjectType, exam_date: examDate })
      .select()
      .single()

    if (subjectError) {
      setError(subjectError.message)
      setLoading(false)
      return
    }

    const subtopicRows = filledSubtopics.map(title => ({
      subject_id: subject.id,
      user_id: session.user.id,
      title,
    }))

    const { error: subtopicError } = await supabase.from('subtopics').insert(subtopicRows)
    if (subtopicError) {
      setError(subtopicError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <div className="max-w-2xl mx-auto p-6">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-emerald-900">Add subject</h1>
            <p className="text-xs text-gray-400">Fill in the details for your subject</p>
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
                  placeholder="e.g. Introduction to Cognitive Sciences"
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
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:border-emerald-200 text-gray-600'
                  }`}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50">
                    {type.icon}
                  </span>
                  <span className="text-sm font-medium">{type.label}</span>
                  {subjectType === type.value && (
                    <span className="ml-auto text-emerald-500 text-xs font-semibold">Selected</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Subtopics</h2>
              <button
                type="button"
                onClick={addSubtopicField}
                className="text-xs text-emerald-600 font-medium hover:underline"
              >
                + Add more
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
              <div className="text-xs font-semibold text-emerald-700 mb-1">
                Upload lecture slides to auto-extract subtopics
              </div>
              <div className="text-xs text-emerald-600 mb-3">
                Upload a PDF of your lecture slides and the AI will suggest subtopics automatically.
                Make sure you enter the subject name first.
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploadLoading ? 'Reading slides...' : 'Upload PDF slides'}
              </button>
              {uploadSuccess && (
                <span className="ml-3 text-xs text-emerald-600 font-medium">
                  ✓ Subtopics extracted from slides
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {subtopics.map((subtopic, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{index + 1}</span>
                  <input
                    type="text"
                    value={subtopic}
                    onChange={e => updateSubtopic(index, e.target.value)}
                    placeholder="e.g. Neurons and synapses"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                  {subtopics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubtopic(index)}
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
            {loading ? 'Saving...' : 'Save subject'}
          </button>

        </form>
      </div>
    </div>
  )
}