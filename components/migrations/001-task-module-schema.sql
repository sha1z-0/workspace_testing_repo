-- Finova Workspace -- Tasks Module Overhaul
-- Phase 1: Schema Migration

-- ============================================================
-- Add new columns
-- ============================================================
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

-- ============================================================
-- Backfill existing data
-- ============================================================
UPDATE tasks SET due_datetime = (due_date::text || ' 23:59:59+00')::timestamptz WHERE due_date IS NOT NULL AND due_datetime IS NULL;
UPDATE tasks SET assigned_by = created_by, assigned_by_name = created_by_name WHERE assigned_by IS NULL;

-- ============================================================
-- Drop unused attachment columns
-- ============================================================
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_name;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignment_attachment_download_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_name;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_url;
ALTER TABLE tasks DROP COLUMN IF EXISTS submission_attachment_download_url;

-- ============================================================
-- Add indexes
-- ============================================================
DROP INDEX IF EXISTS idx_tasks_due_datetime;
CREATE INDEX idx_tasks_due_datetime ON tasks(due_datetime) WHERE submission_status != 'approved';
DROP INDEX IF EXISTS idx_tasks_assigned_by;
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);

-- ============================================================
-- RLS helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role FROM public.users WHERE uid = user_uid LIMIT 1; $$;
