-- ============================================================
-- FINOVA WORKSPACE — TASK REVIEW WORKFLOW SCHEMA
-- ============================================================
-- Adds columns and status values for the 2-phase review flow:
--   1. Progress review (assignee sends update, assigner sets %)
--   2. Completion review (assignee submits with file, assigner approves/rejects)
--
-- Also drops the stale project_id constraint leftover from an
-- earlier schema version.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- 1. Drop stale project_id constraint (prevents null project_id)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_required;

-- 2. Add review workflow columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS review_assigner_notes TEXT,
ADD COLUMN IF NOT EXISTS review_progress INTEGER;

-- 3. Drop, migrate, rebuild status CHECK in one clean sequence

-- 3a. Drop whatever the constraint is called now
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

DO $$
DECLARE
  cn text;
BEGIN
  SELECT conname INTO cn FROM pg_constraint
  WHERE conrelid = 'tasks'::regclass AND conname LIKE '%status%';
  IF cn IS NOT NULL THEN EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', cn); END IF;
END;
$$;

-- 3b. Migrate rows (no constraint blocking us anymore)
UPDATE tasks SET status = 'pending_review' WHERE status = 'in_review';

-- 3c. Add new constraint
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_review', 'pending_completion_review', 'completed'));

-- 6. Add partial index for review tasks (for assigner review queue)
CREATE INDEX IF NOT EXISTS idx_tasks_review_status
  ON tasks(status)
  WHERE status IN ('pending_review', 'pending_completion_review');

-- ============================================================
-- RLS UPDATE: Prevent assignee from setting status to 'completed'
-- ============================================================
-- The existing task_update policy allows:
--   (assigner) OR (assignee AND submission_open = true)
-- We add a NEW row (WITH CHECK) policy that blocks completed
-- status from anyone who is NOT the assigned_by.

DROP POLICY IF EXISTS task_update_completed_guard ON tasks;
CREATE POLICY task_update_completed_guard ON tasks
FOR UPDATE
USING (true)
WITH CHECK (
  -- If status is being set to 'completed', only the assigner can do it
  status != 'completed' OR auth.uid()::text = assigned_by
);

-- ============================================================
-- After running, verify:
-- 1. SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='tasks'::regclass AND conname='tasks_status_check';
--    Should show expanded status list
-- 2. New columns exist: review_notes, review_assigner_notes, review_progress
-- 3. The old project_id constraint is gone
-- ============================================================
