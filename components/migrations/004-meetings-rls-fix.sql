-- ============================================================
-- FINOVA WORKSPACE — CALENDAR EVENTS RLS FIX
-- Restricts create/update/delete to CEO, C_LEVEL, and LEAD roles
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- Drop the old permissive policies
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events" ON calendar_events;

-- Drop previously-deployed role-restricted policies (in case this is a re-run)
DROP POLICY IF EXISTS "event_insert" ON calendar_events;
DROP POLICY IF EXISTS "event_update" ON calendar_events;
DROP POLICY IF EXISTS "event_delete" ON calendar_events;

-- Only CEO, C_LEVEL, and LEAD can create events
CREATE POLICY "event_insert" ON calendar_events
FOR INSERT
WITH CHECK (
    auth.uid()::text = organizer_id
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL', 'LEAD')
);

-- Only CEO, C_LEVEL, and LEAD can update their own events
CREATE POLICY "event_update" ON calendar_events
FOR UPDATE
USING (
    auth.uid()::text = organizer_id
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL', 'LEAD')
);

-- Only CEO, C_LEVEL, and LEAD can delete their own events
CREATE POLICY "event_delete" ON calendar_events
FOR DELETE
USING (
    auth.uid()::text = organizer_id
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL', 'LEAD')
);

-- ============================================================
-- DONE
-- ============================================================
