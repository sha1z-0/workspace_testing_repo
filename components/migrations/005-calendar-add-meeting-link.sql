-- ============================================================
-- FINOVA WORKSPACE — ADD MEETING LINK TO CALENDAR EVENTS
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- ============================================================
-- DONE
-- ============================================================
