-- ============================================================
-- StudyBuddy — Admin Dashboard & Feedback System (MVP)
-- Run this in the Supabase SQL Editor BEFORE using the new features.
-- Safe to re-run (IF NOT EXISTS everywhere).
-- ============================================================

-- 1. ROLES -----------------------------------------------------
-- student (default) | teacher | admin | institution
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

-- Helper so RLS policies can check the caller's role without
-- recursing into profiles' own RLS.
CREATE OR REPLACE FUNCTION my_role() RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 2. CLASSES (schema now, teacher UI in Phase 2) ---------------
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_members (
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher manages own classes" ON classes;
CREATE POLICY "teacher manages own classes" ON classes
  FOR ALL USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
DROP POLICY IF EXISTS "students read classes by code" ON classes;
CREATE POLICY "students read classes by code" ON classes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin all classes" ON classes;
CREATE POLICY "admin all classes" ON classes
  FOR ALL USING (my_role() = 'admin');

DROP POLICY IF EXISTS "student joins class" ON class_members;
CREATE POLICY "student joins class" ON class_members
  FOR INSERT WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "member reads own membership" ON class_members;
CREATE POLICY "member reads own membership" ON class_members
  FOR SELECT USING (student_id = auth.uid());
DROP POLICY IF EXISTS "teacher reads class members" ON class_members;
CREATE POLICY "teacher reads class members" ON class_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "admin all class members" ON class_members;
CREATE POLICY "admin all class members" ON class_members
  FOR ALL USING (my_role() = 'admin');

-- 3. SESSION COMPLETION TRACKING -------------------------------
-- tutor_sessions already exists (one per user+subtopic, resumable).
-- A session visit is "completed" when the student taps End Session
-- or finishes the subtopic; otherwise it stays in_progress and
-- counts as dropped in analytics.
ALTER TABLE tutor_sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';
ALTER TABLE tutor_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE tutor_sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

-- 4. POST-SESSION RATINGS --------------------------------------
CREATE TABLE IF NOT EXISTS session_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES tutor_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE session_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ratings" ON session_ratings;
CREATE POLICY "own ratings" ON session_ratings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin reads ratings" ON session_ratings;
CREATE POLICY "admin reads ratings" ON session_ratings
  FOR SELECT USING (my_role() = 'admin');

-- 5. FLAGGED AI RESPONSES --------------------------------------
CREATE TABLE IF NOT EXISTS ai_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES tutor_sessions(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES session_messages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flagged_text TEXT NOT NULL,
  reason TEXT NOT NULL,          -- incorrect | confusing | other
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | fixed | dismissed
  admin_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own flags" ON ai_flags;
CREATE POLICY "own flags" ON ai_flags
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin manages flags" ON ai_flags;
CREATE POLICY "admin manages flags" ON ai_flags
  FOR ALL USING (my_role() = 'admin');

-- 6. FEEDBACK FORM ---------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,            -- bug | feature | general | content
  description TEXT NOT NULL,
  screen TEXT,
  device TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own feedback" ON feedback;
CREATE POLICY "own feedback" ON feedback
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin manages feedback" ON feedback;
CREATE POLICY "admin manages feedback" ON feedback
  FOR ALL USING (my_role() = 'admin');

-- 7. ADMIN READ ACCESS TO EXISTING STUDENT DATA ----------------
-- Existing policies stay; these are additive (permissive OR).
DROP POLICY IF EXISTS "admin reads profiles" ON profiles;
CREATE POLICY "admin reads profiles" ON profiles FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads subjects" ON subjects;
CREATE POLICY "admin reads subjects" ON subjects FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads subtopics" ON subtopics;
CREATE POLICY "admin reads subtopics" ON subtopics FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads sessions" ON tutor_sessions;
CREATE POLICY "admin reads sessions" ON tutor_sessions FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads quiz results" ON quiz_results;
CREATE POLICY "admin reads quiz results" ON quiz_results FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads flashcards" ON flashcards;
CREATE POLICY "admin reads flashcards" ON flashcards FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads flashcard progress" ON flashcard_progress;
CREATE POLICY "admin reads flashcard progress" ON flashcard_progress FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads streaks" ON study_streaks;
CREATE POLICY "admin reads streaks" ON study_streaks FOR SELECT USING (my_role() = 'admin');
DROP POLICY IF EXISTS "admin reads study plans" ON study_plans;
CREATE POLICY "admin reads study plans" ON study_plans FOR SELECT USING (my_role() = 'admin');

-- 8. MAKE YOURSELF ADMIN ---------------------------------------
-- Replace the email, then run:
-- UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@email.com');
