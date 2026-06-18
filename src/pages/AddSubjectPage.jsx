import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { extractSubtopicsFromText, readPDFText } from '../lib/slideReader'
import { Brain, Laptop, BookOpenText, Handshake, Microscope } from 'lucide-react'

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

  function addSubtopicField() { setSubtopics([...subtopics, '']) }
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
    if (!name) { setError('Please enter a subject name first.'); return }
    setUploadLoading(true)
    setError('')
    setUploadSuccess(false)
    try {
      let text = ''
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await readPDFText(file)
      } else {
        setError('Please upload a PDF file.')
        setUploadLoading(false)
        return
      }
      if (!text || text.trim().length < 50) {
        setError('Could not read enough text from this PDF. Try a PDF with selectable text.')
        setUploadLoading(false)
        return
      }
      const extracted = await extractSubtopicsFromText(text, name)
      if (extracted.length > 0) {
        setSubtopics(extracted)
        setUploadSuccess(true)
      } else {
        setError('Could not extract subtopics. You can still add them manually below.')
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
    if (!subjectType) { setError('Please select a subject type.'); setLoading(false); return }
    if (filledSubtopics.length === 0) { setError('Please add at least one subtopic.'); setLoading(false); return }

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, name, subject_type: subjectType, exam_date: examDate })
      .select()
      .single()
    if (subjectError) { setError(subjectError.message); setLoading(false); return }

    const { error: subtopicError } = await supabase.from('subtopics').insert(
      filledSubtopics.map(title => ({ subject_id: subject.id, user_id: session.user.id, title }))
    )
    if (subtopicError) { setError(subtopicError.message); setLoading(false); return }

    setLoading(false)
    onSaved()
  }

  return (
    <div className="min-h-screen app-bg">
      <div className="max-w-2xl mx-auto p-6">

        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="text-sm app-muted transition-colors hover:opacity-80">← Back</button>
          <div>
            <h1 className="text-xl font-bold app-heading">Add subject</h1>
            <p className="text-xs app-muted">Fill in the details for your subject</p>
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
                  placeholder="e.g. Introduction to Cognitive Sciences"
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold app-heading">Subtopics</h2>
              <button type="button" onClick={addSubtopicField} className="text-xs font-medium hover:underline" style={{ color: 'var(--primary)' }}>
                + Add more
              </button>
            </div>

            <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>
                Upload lecture slides to auto-extract subtopics
              </div>
              <div className="text-xs app-muted mb-3">
                Upload a PDF of your lecture slides and the AI will suggest subtopics automatically.
                Make sure you enter the subject name first.
              </div>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {uploadLoading ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Extracting subtopics...
                  </>
                ) : 'Upload PDF slides'}
              </button>
              {uploadLoading && <p className="text-xs app-muted mt-2">StudyBuddy is reading your lecture slides. This may take a moment.</p>}
              {uploadSuccess && <p className="text-xs font-medium mt-2" style={{ color: 'var(--primary)' }}>✓ Subtopics extracted successfully. Edit them below if needed.</p>}
            </div>

            <div className="flex flex-col gap-2">
              {subtopics.map((subtopic, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-xs app-muted w-5 text-right flex-shrink-0">{index + 1}</span>
                  <input
                    type="text"
                    value={subtopic}
                    onChange={e => updateSubtopic(index, e.target.value)}
                    placeholder="e.g. Neurons and synapses"
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm transition-all app-input"
                  />
                  {subtopics.length > 1 && (
                    <button type="button" onClick={() => removeSubtopic(index)} className="text-lg transition-colors app-muted hover:text-red-400">×</button>
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
            {loading ? 'Saving...' : 'Save subject'}
          </button>

        </form>
      </div>
    </div>
  )
}