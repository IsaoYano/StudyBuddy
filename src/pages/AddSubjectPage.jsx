import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { extractSubtopicsFromText, readPDFText, readDOCXText, readPPTXText, readImageText } from '../lib/slideReader'
import { Brain, Laptop, BookOpenText, Handshake, Microscope, Upload } from 'lucide-react'

const SUBJECT_TYPES = [
  { value: 'neuroscience', label: 'Neuroscience / Biological', icon: <Brain size={20} strokeWidth={2} className="text-violet-500" /> },
  { value: 'computational', label: 'Computational / Programming', icon: <Laptop size={20} strokeWidth={2} className="text-blue-500" /> },
  { value: 'psychological', label: 'Psychological / Theoretical', icon: <BookOpenText size={20} strokeWidth={2} className="text-amber-500" /> },
  { value: 'social', label: 'Social / Applied', icon: <Handshake size={20} strokeWidth={2} className="text-pink-500" /> },
  { value: 'research', label: 'Research Methods', icon: <Microscope size={20} strokeWidth={2} className="text-teal-500" /> },
]

const ACCEPTED_FORMATS = '.pdf,.pptx,.docx,.jpg,.jpeg,.png'
const FORMAT_LABELS = 'PDF, PPTX, DOCX, JPG, PNG'

export default function AddSubjectPage({ session, onBack, onSaved }) {
  const [name, setName] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [subtopics, setSubtopics] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
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

  function getFileType(file) {
    const name = file.name.toLowerCase()
    if (name.endsWith('.pdf')) return 'pdf'
    if (name.endsWith('.pptx')) return 'pptx'
    if (name.endsWith('.docx')) return 'docx'
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpg'
    if (name.endsWith('.png')) return 'png'
    return null
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (!name) {
      setError('Please enter a subject name first.')
      return
    }
    setUploadLoading(true)
    setError('')
    setUploadSuccess(false)

    const GROQ_KEYS = [
      import.meta.env.VITE_GROQ_KEY,
      import.meta.env.VITE_GROQ_KEY_2,
      import.meta.env.VITE_GROQ_KEY_3,
    ].filter(Boolean)

    let combinedText = ''

    for (const file of files) {
      const type = getFileType(file)
      if (!type) {
        setError(`Unsupported file: ${file.name}. Use ${FORMAT_LABELS}.`)
        setUploadLoading(false)
        return
      }

      try {
        let text = ''
        if (type === 'pdf') text = await readPDFText(file)
        else if (type === 'docx') text = await readDOCXText(file)
        else if (type === 'pptx') text = await readPPTXText(file)
        else if (type === 'jpg' || type === 'png') text = await readImageText(file, GROQ_KEYS)
        combinedText += text + '\n'
      } catch (err) {
        console.error(`Failed to read ${file.name}:`, err)
      }
    }

    if (!combinedText.trim() || combinedText.trim().length < 50) {
      setError('Could not read enough text from the uploaded files. Try a different format.')
      setUploadLoading(false)
      return
    }

    const extracted = await extractSubtopicsFromText(combinedText, name)
    if (extracted.length > 0) {
      setSubtopics(extracted)
      setUploadedFiles(files.map(f => f.name))
      setUploadSuccess(true)
    } else {
      setError('Could not extract subtopics. Add them manually below.')
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

            {/* Upload section */}
            <div className="rounded-xl px-4 py-4 mb-4" style={{ backgroundColor: 'var(--primary-soft)', border: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>
                Upload lecture files to auto-extract subtopics
              </div>
              <div className="text-xs app-muted mb-3">
                Supports {FORMAT_LABELS}. You can upload multiple files at once. Enter subject name first.
              </div>

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="flex items-center gap-2 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {uploadLoading ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Reading files...
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    Upload files
                  </>
                )}
              </button>

              {uploadLoading && (
                <p className="text-xs app-muted mt-2">Athena is reading your files. This may take a moment.</p>
              )}

              {uploadSuccess && (
                <div className="mt-2">
                  <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                    ✓ Subtopics extracted from {uploadedFiles.join(', ')}
                  </p>
                  <p className="text-xs app-muted mt-0.5">Edit them below if needed.</p>
                </div>
              )}
            </div>

            {/* Subtopic fields */}
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