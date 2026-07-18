import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, cardItem } from '../../utils/animations'
import { buildAlerts } from '../../lib/adminData'
import { AlertTriangle, Clock, TrendingDown, UserX } from 'lucide-react'

const TYPE_ICONS = {
  'Not active': <UserX size={16} strokeWidth={2} />,
  'Going quiet': <Clock size={16} strokeWidth={2} />,
  'Low quiz score': <TrendingDown size={16} strokeWidth={2} />,
  'Never active': <AlertTriangle size={16} strokeWidth={2} />,
}

function fmtDate(d) {
  if (!d) return 'never'
  return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

export default function AdminAlerts({ data }) {
  const alerts = buildAlerts(data.students)

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate">
      {alerts.length === 0 ? (
        <div className="app-card rounded-2xl p-10 text-center" style={{ borderStyle: 'dashed' }}>
          <div className="text-sm font-semibold app-heading mb-1">No alerts</div>
          <div className="text-xs app-muted">Every student is active and performing well.</div>
        </div>
      ) : (
        <motion.div className="flex flex-col gap-2" variants={staggerContainer} initial="initial" animate="animate">
          {alerts.map((a, i) => (
            <motion.div key={`${a.student.id}-${a.type}-${i}`} className="app-card rounded-xl px-4 py-3 flex items-center gap-4" variants={cardItem}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                {TYPE_ICONS[a.type] || <AlertTriangle size={16} strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold app-heading truncate">{a.student.name}</div>
                <div className="text-xs app-muted">{a.type} — {a.detail}</div>
              </div>
              <div className="text-[10px] app-muted flex-shrink-0">Last active {fmtDate(a.student.lastActive)}</div>
            </motion.div>
          ))}
        </motion.div>
      )}
      <p className="text-[10px] app-muted mt-3">
        "Send Reminder" push notifications arrive in Phase 2 together with the notification system.
      </p>
    </motion.div>
  )
}
