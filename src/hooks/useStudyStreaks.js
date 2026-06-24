import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStudyStreaks(userId) {
  const [streaks, setStreaks] = useState([])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('study_streaks')
      .select('study_date')
      .eq('user_id', userId)
      .then(({ data }) => setStreaks(data || []))
  }, [userId])

  return { streaks }
}
