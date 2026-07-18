import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp } from '../../utils/animations'
import { supabase } from '../../lib/supabase'
import { Flag, MessageSquare } from 'lucide-react'

const FLAG_STATUS = {
  pending: { label: 'Pending Review', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  fixed: { label: 'Fixed', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  dismissed: { label: 'Dismissed', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const REASON_LABELS = {
  incorrect: 'Incorrect information',
  confusing: 'Confusing explanation',
  other: 'Other',
}

const TYPE_LABELS = { bug: 'Bug Report', feature: 'Feature Request', general: 'General', content: 'Content Issue' }

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FlagRow({ flag, onChanged }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const s = FLAG_STATUS[flag.status] || FLAG_STATUS.pending

  async function resolve(status) {
    setBusy(true)
    await supabase.from('ai_flags').update({
      status,
      admin_note: note.trim() || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', flag.id)
    setBusy(false)
    onChanged()
  }

  return (
    <div className="app-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-sm font-semibold app-heading">{flag.studentName}</div>
          <div className="text-xs app-muted">{REASON_LABELS[flag.reason] || flag.reason} · {fmtDate(flag.created_at)}</div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ backgroundColor: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-xs app-muted rounded-xl px-3 py-2.5 mb-2"
        style={{ backgroundColor: 'var(--surface-soft)', border: '1px solid var(--border)' }}
      >
        <span className={expanded ? '' : 'line-clamp-2'} style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {flag.flagged_text}
        </span>
      </button>

      {flag.detail && <div className="text-xs app-muted mb-2">Student note: {flag.detail}</div>}
      {flag.admin_note && <div className="text-xs mb-2" style={{ color: 'var(--primary)' }}>Admin note: {flag.admin_note}</div>}

      {flag.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a review note (optional)"
            className="flex-1 rounded-xl px-3 py-2 text-xs app-input"
          />
          <div className="flex gap-2">
            <button
              onClick={() => resolve('fixed')}
              disabled={busy}
              className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Mark Fixed
            </button>
            <button
              onClick={() => resolve('dismissed')}
              disabled={busy}
              className="text-xs font-semibold px-4 py-2 rounded-xl app-muted transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border)' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminFeedback({ data, onChanged }) {
  const [tab, setTab] = useState('flags')
  const pendingCount = data.flags.filter(f => f.status === 'pending').length

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('flags')}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            border: `1px solid ${tab === 'flags' ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: tab === 'flags' ? 'var(--primary-soft)' : 'var(--surface-soft)',
            color: tab === 'flags' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          <Flag size={13} strokeWidth={2} />
          Flagged responses {pendingCount > 0 && `(${pendingCount})`}
        </button>
        <button
          onClick={() => setTab('feedback')}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
          style={{
            border: `1px solid ${tab === 'feedback' ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: tab === 'feedback' ? 'var(--primary-soft)' : 'var(--surface-soft)',
            color: tab === 'feedback' ? 'var(--primary)' : 'var(--text-muted)',
          }}
        >
          <MessageSquare size={13} strokeWidth={2} />
          Form submissions
        </button>
      </div>

      {tab === 'flags' && (
        <div className="flex flex-col gap-3">
          {data.flags.length === 0 && (
            <div className="app-card rounded-2xl p-10 text-center" style={{ borderStyle: 'dashed' }}>
              <div className="text-sm font-semibold app-heading mb-1">No flagged responses</div>
              <div className="text-xs app-muted">When students report an Athena response, it appears here.</div>
            </div>
          )}
          {data.flags.map(f => <FlagRow key={f.id} flag={f} onChanged={onChanged} />)}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="flex flex-col gap-2">
          {data.feedback.length === 0 && (
            <div className="app-card rounded-2xl p-10 text-center" style={{ borderStyle: 'dashed' }}>
              <div className="text-sm font-semibold app-heading mb-1">No feedback yet</div>
              <div className="text-xs app-muted">Submissions from Settings &gt; Help &amp; feedback appear here.</div>
            </div>
          )}
          {data.feedback.map(f => (
            <div key={f.id} className="app-card rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="text-xs font-semibold app-heading">{f.studentName}</div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                    {TYPE_LABELS[f.type] || f.type}
                  </span>
                  <span className="text-[10px] app-muted">{fmtDate(f.created_at)}</span>
                </div>
              </div>
              <div className="text-xs app-muted">{f.description}</div>
              {f.screen && <div className="text-[10px] app-muted mt-1">Screen: {f.screen}</div>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
