import { useState, useEffect, useRef } from 'react'
import { useCallback } from 'react'
import { sendMessage } from '../lib/gemini'

export default function TutorPage({ subject, subtopic, studentProfile, onBack, onComplete }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [quizReady, setQuizReady] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    startSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startSession() {
    setLoading(true)
    setError('')
    try {
      const openingPrompt = `Start teaching me about: ${subtopic.title}. Remember my profile and begin with your diagnostic question.`
      const firstHistory = [{ role: 'user', parts: [{ text: openingPrompt }] }]
      const reply = await sendMessage(firstHistory, studentProfile)

      setHistory([
        ...firstHistory,
        { role: 'model', parts: [{ text: reply }] }
      ])
      setMessages([{ role: 'ai', text: reply }])
    } catch (e) {
      setError('Error: ' + e.message)
    }
    setLoading(false)
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setInput('')
    setError('')

    const newMessages = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)

    const newHistory = [...history, { role: 'user', parts: [{ text: userText }] }]
    setLoading(true)

    try {
      const reply = await sendMessage(newHistory, studentProfile)
      const updatedHistory = [...newHistory, { role: 'model', parts: [{ text: reply }] }]
      setHistory(updatedHistory)
      setMessages([...newMessages, { role: 'ai', text: reply }])

      if (reply.includes('You have completed this subtopic')) {
        setQuizReady(true)
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col">

      <div className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">
          ← Exit
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-emerald-900 truncate">{subtopic.title}</div>
          <div className="text-xs text-gray-400">{subject.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">AI Tutor active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 60 60" width="20" height="20" fill="none">
              <path d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z" stroke="#6ee7b7" strokeWidth="2.5" strokeLinejoin="round"/>
              <line x1="30" y1="10" x2="30" y2="50" stroke="#6ee7b7" strokeWidth="1.2" strokeDasharray="3,2.5"/>
              <circle cx="20" cy="21" r="2" fill="#6ee7b7"/>
              <circle cx="40" cy="21" r="2" fill="#6ee7b7"/>
              <circle cx="25" cy="28" r="1.8" fill="#6ee7b7"/>
              <circle cx="35" cy="28" r="1.8" fill="#6ee7b7"/>
              <circle cx="30" cy="40" r="1.8" fill="#6ee7b7"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-700 mb-1">StudyBuddy AI Tutor</div>
            <div className="text-xs text-emerald-600">
              Teaching style personalised to your preferences. Type your answers or questions freely.
            </div>
          </div>
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            )}
            <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-tr-sm'
                : 'bg-white border border-emerald-100 text-gray-700 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white border border-emerald-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {quizReady && (
          <div className="bg-emerald-50 border border-emerald-500 rounded-2xl p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-emerald-800">Subtopic complete!</div>
              <div className="text-xs text-emerald-600 mt-0.5">Ready to test what you have learned?</div>
            </div>
            <button
              onClick={onComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              Take quiz
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-emerald-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer or question... (Enter to send)"
            rows={2}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  )
}