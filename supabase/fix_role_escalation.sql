-- ============================================================
-- SECURITY FIX — run this in the Supabase SQL Editor ASAP.
--
-- Found during QA (2026-07-18): the existing "users can update
-- their own profile" policy lets ANY student run
--   UPDATE profiles SET role = 'admin' WHERE id = auth.uid()
-- from the browser console and gain full admin access to every
-- student's data. Verified working before this fix.
--
-- This trigger blocks role changes unless the caller is already
-- an admin. Updates made from the SQL Editor / service role
-- (auth.uid() IS NULL) are still allowed, so you can keep
-- promoting admins from the dashboard.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_role_self_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_change ON profiles;
CREATE TRIGGER trg_prevent_role_self_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_change();
