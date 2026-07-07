-- ============================================================
-- FINOVA WORKSPACE — FIX TASK MILESTONES SCHEMA
-- ============================================================
-- Migration 011 used CREATE TABLE IF NOT EXISTS, but an older
-- task_milestones table already existed on the live DB with
-- incompatible columns (no weight, wrong status CHECK,
-- non-nullable DATE due_date).  This migration surgically
-- patches the live table to match what the code expects.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

BEGIN;

-- 1. Drop broken triggers + functions that referenced the removed
--    milestone_count column on tasks
DROP TRIGGER IF EXISTS trigger_update_milestone_count ON task_milestones;
DROP FUNCTION IF EXISTS update_task_milestone_count;
DROP FUNCTION IF EXISTS calculate_milestone_progress;

-- 2. Drop old-style RLS policies (these predate migration 011
--    and have different rules than the current app expects)
DROP POLICY IF EXISTS "Task assignees can manage milestones" ON task_milestones;
DROP POLICY IF EXISTS "Users can view milestones for accessible tasks" ON task_milestones;

-- 3. Drop the old status CHECK constraint
ALTER TABLE task_milestones DROP CONSTRAINT IF EXISTS task_milestones_status_check;

-- 3a. Migrate old status values to new enum
--     pending     → not_started
--     in_progress → in_progress (unchanged)
--     completed   → approved
UPDATE task_milestones SET status = 'not_started' WHERE status = 'pending';
UPDATE task_milestones SET status = 'approved'    WHERE status = 'completed';

-- 3b. Add the new CHECK constraint
ALTER TABLE task_milestones ADD CONSTRAINT task_milestones_status_check
  CHECK (status IN ('not_started', 'in_progress', 'pending_review', 'needs_revision', 'approved'));

-- 4. Add the missing weight column (INTEGER, 0 by default)
ALTER TABLE task_milestones ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 0;

-- 5. Fix due_date: non-nullable DATE → optional TIMESTAMPTZ
ALTER TABLE task_milestones ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::timestamptz;
ALTER TABLE task_milestones ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE task_milestones ALTER COLUMN due_date SET DEFAULT NULL;

COMMIT;

-- ============================================================
-- Verify after running:
-- 1. SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'task_milestones' ORDER BY ordinal_position;
--    → weight exists (INTEGER, NOT NULL), due_date is TIMESTAMPTZ + nullable
-- 2. SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'task_milestones'::regclass AND conname = 'task_milestones_status_check';
--    → Shows: CHECK (status IN ('not_started','in_progress','pending_review','needs_revision','approved'))
-- 3. SELECT routine_name FROM information_schema.routines WHERE routine_definition ILIKE '%milestone%';
--    → No leftover functions
-- 4. SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'task_milestones';
--    → No leftover triggers
-- 5. Create a task with milestones → should work, no error toast
-- ============================================================
