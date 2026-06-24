/*
  Run this in your Supabase SQL editor before using the calendar feature:

  CREATE TABLE IF NOT EXISTS study_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    planned_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_id, planned_date)
  );
  ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can manage their own study plans"
    ON study_plans FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStudyPlans(userId) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchPlans() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('study_plans')
      .select('id, subject_id, planned_date')
      .eq('user_id', userId)
    setPlans(data || [])
    setLoading(false)
  }

  async function addPlan(subjectId, dateString) {
    const { data } = await supabase
      .from('study_plans')
      .upsert({ user_id: userId, subject_id: subjectId, planned_date: dateString }, { onConflict: 'user_id,subject_id,planned_date', ignoreDuplicates: true })
      .select('id, subject_id, planned_date')
    if (data?.length) setPlans(prev => [...prev, ...data.filter(d => !prev.some(p => p.id === d.id))])
  }

  async function removePlan(subjectId, dateString) {
    await supabase
      .from('study_plans')
      .delete()
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .eq('planned_date', dateString)
    setPlans(prev => prev.filter(p => !(p.subject_id === subjectId && p.planned_date === dateString)))
  }

  async function clearDay(dateString) {
    await supabase
      .from('study_plans')
      .delete()
      .eq('user_id', userId)
      .eq('planned_date', dateString)
    setPlans(prev => prev.filter(p => p.planned_date !== dateString))
  }

  function isPlanned(subjectId, dateString) {
    return plans.some(p => p.subject_id === subjectId && p.planned_date === dateString)
  }

  useEffect(() => { if (userId) fetchPlans() }, [userId])

  return { plans, loading, addPlan, removePlan, clearDay, isPlanned, refetch: fetchPlans }
}
