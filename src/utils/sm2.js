export function calculateSM2(card, rating) {
  let { interval, ease_factor, repetitions } = card

  if (rating >= 3) {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * ease_factor)
    }
    repetitions += 1
  } else {
    interval = 1
    repetitions = 0
  }

  ease_factor = ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  if (ease_factor < 1.3) ease_factor = 1.3

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)
  const next_review = nextReview.toISOString().split('T')[0]

  return { interval, ease_factor: Math.round(ease_factor * 100) / 100, repetitions, next_review }
}

export function isDueToday(nextReviewDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const review = new Date(nextReviewDate)
  review.setHours(0, 0, 0, 0)
  return review <= today
}