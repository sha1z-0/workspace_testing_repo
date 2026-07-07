-- ============================================================
-- FINOVA WORKSPACE — TASKS MODULE OVERHAUL
-- Combined Migration: Phase 1 (Schema) + Phase 2 (RLS)
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- ============================================================
-- PHASE 1: SCHEMA CHANGES
-- ============================================================

-- 1a. Add new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_datetime TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_open BOOLEAN DEFAULT true;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_size INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT false;

-- 1b. Backfill existing data
UPDATE tasks SET due_datetime = (due_date::text || ' 23:59:59+00')::timestamptz WHERE due_date IS NOT NULL AND due_datetime IS NULL;
UPDATE tasks SET assigned_by = created_by, assigned_by_name = created_by_name WHERE assigned_by IS NULL;

-- 1c. Drop 8 unused attachment columns
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_name;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_download_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_name;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_download_url;

-- 1d. Add indexes
DROP INDEX IF EXISTS idx_tasks_due_datetime;
CREATE INDEX idx_tasks_due_datetime ON tasks(due_datetime) WHERE submission_status != 'approved';
DROP INDEX IF EXISTS idx_tasks_assigned_by;
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);

-- 1e. RLS helper function
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role FROM public.users WHERE uid = user_uid LIMIT 1; $$;

-- ============================================================
-- PHASE 2: RLS POLICY REWRITE
-- ============================================================

-- 2a. Enable RLS on tasks (if not already)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 2b. Drop all existing tasks policies
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
DROP POLICY IF EXISTS "Tasks readable by all" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON tasks;

-- 2c. Create new RLS policies

-- Policy 1: Users can read tasks where they are assignee or viewer
CREATE POLICY "task_read_own" ON tasks
FOR SELECT
USING (
    auth.uid()::text = ANY(assignee_ids)
    OR auth.uid()::text = ANY(viewer_ids)
);

-- Policy 2: C-Level/Lead can read tasks they assigned
CREATE POLICY "task_read_assigned" ON tasks
FOR SELECT
USING (
    auth.uid()::text = assigned_by
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL', 'LEAD')
);

-- Policy 3: C-Level/CEO can read tasks assigned TO them by other C-Level
CREATE POLICY "task_read_clevel" ON tasks
FOR SELECT
USING (
    auth.uid()::text = ANY(assignee_ids)
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Policy 4: Only the assigner (C-Level/Lead) can create tasks
CREATE POLICY "task_insert" ON tasks
FOR INSERT
WITH CHECK (
    auth.uid()::text = assigned_by
    AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL', 'LEAD')
);

-- Policy 5: Assigner can always update; Assignee can update only when submission is open
CREATE POLICY "task_update" ON tasks
FOR UPDATE
USING (
    auth.uid()::text = assigned_by
    OR (
        auth.uid()::text = ANY(assignee_ids)
        AND submission_open = true
    )
);

-- Policy 6: Only the assigner can delete tasks
CREATE POLICY "task_delete" ON tasks
FOR DELETE
USING (
    auth.uid()::text = assigned_by
);

-- ============================================================
-- DONE
-- ============================================================
