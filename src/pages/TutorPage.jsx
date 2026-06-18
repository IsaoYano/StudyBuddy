import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import { BrainCircuit } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { sendMessage } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { chatMessage, fadeUp } from '../utils/animations'

export default function TutorPage({ subject, subtopic, studentProfile, session, onBack, onComplete }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [quizReady, setQuizReady] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadOrCreateSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadOrCreateSession() {
    console.log('SESSION USER ID:', session?.user?.id)
    console.log('SUBTOPIC ID:', subtopic?.id)
    console.log('SUBJECT ID:', subject?.id)
    setLoadingSession(true)

    const { data: existingSession } = await supabase
      .from('tutor_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('subtopic_id', subtopic.id)
      .maybeSingle()

    if (existingSession) {
      const { data: previousMessages } = await supabase
        .from('session_messages')
        .select('*')
        .eq('session_id', existingSession.id)
        .order('created_at', { ascending: true })

      if (previousMessages && previousMessages.length > 0) {
        const visibleMessages = previousMessages.filter(
          m => !m.content.startsWith('Start teaching me about:')
        )

        const loadedMessages = visibleMessages.map(m => ({
          role: m.role === 'model' ? 'ai' : 'user',
          text: m.content
        }))

        const loadedHistory = previousMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))

        setMessages(loadedMessages)
        setHistory(loadedHistory)
        setSessionId(existingSession.id)
        setLoadingSession(false)
        return
      }

      setSessionId(existingSession.id)
      setLoadingSession(false)
      startSession(existingSession.id)
      return
    }

    const { data: newSession, error: sessionCreateError } = await supabase
      .from('tutor_sessions')
      .insert({
        user_id: session.user.id,
        subject_id: subject.id,
        subtopic_id: subtopic.id,
      }, {onConflict: 'user_id,subtopic_id'})
      .select()
      .maybeSingle()
    if (sessionCreateError) console.error('createSession error:', sessionCreateError)

    setSessionId(newSession.id)
    setLoadingSession(false)
    startSession(newSession.id)
  }

  async function saveMessage(sid, role, content) {
    const { error: msgError } = await supabase.from('session_messages').insert({
      session_id: sid,
      role,
      content,
    })
    if (msgError) console.error('saveMessage error:', msgError)

    const { error: sessionError } = await supabase
      .from('tutor_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sid)
    if (sessionError) console.error('updateSession error:', sessionError)
  }

  async function startSession(sid) {
    setLoading(true)
    setError('')
    try {
      const openingPrompt = `Start teaching me about: ${subtopic.title}. Remember my profile and begin with your diagnostic question.`
      const firstHistory = [{ role: 'user', parts: [{ text: openingPrompt }] }]
      const reply = await sendMessage(firstHistory, studentProfile)

      await saveMessage(sid, 'user', openingPrompt)
      await saveMessage(sid, 'model', reply)

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

      if (sessionId) {
        await saveMessage(sessionId, 'user', userText)
        await saveMessage(sessionId, 'model', reply)
      }

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

  if (loadingSession) {
    return (
      <div className="h-screen bg-emerald-50 flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [1, 0.75, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 bg-white rounded-2xl border border-emerald-100 shadow-md flex items-center justify-center"
        >
          <BrainCircuit size={28} strokeWidth={1.5} className="text-emerald-600" />
        </motion.div>
        <div className="text-sm text-emerald-600 font-medium">Athena is getting ready...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-emerald-50 flex flex-col overflow-hidden">

      <div className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-emerald-600 transition-colors">
          ← Exit
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-emerald-900 truncate">{subtopic.title}</div>
          <div className="text-xs text-gray-400">{subject.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Athena active</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">

        <motion.div
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
          variants={fadeUp}
          initial="initial"
          animate="animate"
        >
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
            <div className="text-xs font-semibold text-emerald-700 mb-1">Athena — AI Tutor</div>
            <div className="text-xs text-emerald-600">
              {messages.length > 1
                ? `Welcome back! Continuing your session on ${subtopic.title}.`
                : 'Your personal tutor, adapted to your learning style. Ask anything freely.'}
            </div>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              variants={chatMessage}
              initial="initial"
              animate="animate"
            >
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                  <BrainCircuit size={14} strokeWidth={2} className="text-white" />
                </div>
              )}
              <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-sm'
                  : 'bg-white border border-emerald-100 text-gray-700 rounded-tl-sm'
              }`}>
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 flex flex-col gap-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 flex flex-col gap-1">{children}</ol>,
                      li: ({ children }) => <li className="text-sm">{children}</li>,
                      h1: ({ children }) => <h1 className="font-bold text-base mb-1">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-bold text-sm mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
                      code: ({ children }) => <code className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-300 pl-3 text-gray-500 italic my-2">{children}</blockquote>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div
              className="flex justify-start mb-4"
              variants={chatMessage}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <BrainCircuit size={14} strokeWidth={2} className="text-white" />
              </div>
              <div className="bg-white border border-emerald-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4"
            variants={fadeUp}
            initial="initial"
            animate="animate"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {quizReady && (
            <motion.div
              className="bg-emerald-50 border border-emerald-500 rounded-2xl p-5 mb-4 flex items-center justify-between gap-4"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <div className="text-sm font-bold text-emerald-800">Subtopic complete!</div>
                <div className="text-xs text-emerald-600 mt-0.5">Ready to test what you have learned?</div>
              </div>
              <motion.button
                onClick={onComplete}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Take quiz
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

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
          <motion.button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 transition-colors flex-shrink-0"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Send
          </motion.button>
        </div>
      </div>

    </div>
  )
}