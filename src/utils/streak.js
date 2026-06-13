export function calculateStreak(dates) {
  if (!dates || dates.length === 0) return 0

  const sorted = [...new Set(dates)]
    .map(d => new Date(d))
    .sort((a, b) => b - a)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const mostRecent = new Date(sorted[0])
  mostRecent.setHours(0, 0, 0, 0)

  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i])
    current.setHours(0, 0, 0, 0)
    const prev = new Date(sorted[i - 1])
    prev.setHours(0, 0, 0, 0)
    const diffDays = Math.round((prev - current) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}