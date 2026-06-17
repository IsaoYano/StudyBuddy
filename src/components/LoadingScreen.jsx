import { motion } from 'framer-motion'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [1, 0.75, 1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-24 h-24 bg-white rounded-3xl border border-emerald-100 shadow-md flex items-center justify-center"
        >
          <svg viewBox="0 0 60 60" width="54" height="54" fill="none">
            <motion.path
              d="M30 8C26 5 19 5 16 10C12 7 7 9 6 15C2 17 1 24 5 29C1 33 1 41 6 44C6 51 12 55 18 53C20 58 26 60 30 57C34 60 40 58 42 53C48 55 54 51 54 44C59 41 59 33 55 29C59 24 58 17 54 15C53 9 48 7 44 10C41 5 34 5 30 8Z"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinejoin="round"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <line x1="30" y1="10" x2="30" y2="50" stroke="#059669" strokeWidth="1.2" strokeDasharray="3,2.5"/>
            <motion.circle cx="20" cy="21" r="2.5" fill="#059669"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0, ease: 'easeInOut' }}
            />
            <motion.circle cx="40" cy="21" r="2.5" fill="#059669"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.2, ease: 'easeInOut' }}
            />
            <motion.circle cx="25" cy="28" r="2" fill="#059669"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.4, ease: 'easeInOut' }}
            />
            <motion.circle cx="35" cy="28" r="2" fill="#059669"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.6, ease: 'easeInOut' }}
            />
            <motion.circle cx="30" cy="40" r="2" fill="#059669"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.8, ease: 'easeInOut' }}
            />
            <motion.line x1="20" y1="21" x2="25" y2="28" stroke="#059669" strokeWidth="1"
              animate={{ opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.1, ease: 'easeInOut' }}
            />
            <motion.line x1="40" y1="21" x2="35" y2="28" stroke="#059669" strokeWidth="1"
              animate={{ opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
            />
            <motion.line x1="25" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="1"
              animate={{ opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
            />
            <motion.line x1="35" y1="28" x2="30" y2="40" stroke="#059669" strokeWidth="1"
              animate={{ opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.7, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>

        <motion.div
          className="text-sm font-semibold text-emerald-700"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          StudyBuddy
        </motion.div>
      </motion.div>
    </div>
  )
}