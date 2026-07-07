-- ============================================================
-- FINOVA WORKSPACE — MULTI-ASSIGNEE SCHEMA MIGRATION
-- ============================================================
-- Bug: Task creation fails with error code 42703 (undefined column)
-- Root cause: The 'assignee_ids', 'assignee_names', and 'viewer_ids',
-- 'viewer_names' array columns don't exist in the tasks table yet.
-- The application code, RLS policies, and TypeScript types all
-- expect these columns. This migration adds them.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- 1. Add multi-assignee array columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assignee_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS assignee_names TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Add viewer/observer array columns
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS viewer_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS viewer_names TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Backfill: populate new array columns from existing single-assignee data
UPDATE tasks
SET assignee_ids = ARRAY[assignee_id]::TEXT[],
    assignee_names = CASE
      WHEN assignee_name IS NOT NULL THEN ARRAY[assignee_name]::TEXT[]
      ELSE NULL
    END
WHERE assignee_ids IS NULL
  AND assignee_id IS NOT NULL;

-- 4. Make the original singular columns nullable (they're now derived from arrays)
ALTER TABLE tasks ALTER COLUMN assignee_id DROP NOT NULL;

-- 5. Add indexes for the new array columns
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids ON tasks USING GIN(assignee_ids);
CREATE INDEX IF NOT EXISTS idx_tasks_viewer_ids ON tasks USING GIN(viewer_ids);

-- 6. Create the get_user_role helper function (REQUIRED by RLS policies)
-- If you already ran 001-task-module-overhaul.sql, this is a no-op.
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role FROM public.users WHERE uid = user_uid LIMIT 1; $$;

-- 7. Update the RLS helper function for task visibility
CREATE OR REPLACE FUNCTION public.is_user_assigned_to_task(
  task_assignees TEXT[],
  task_viewers TEXT[],
  user_uid TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_uid = ANY(task_assignees) OR user_uid = ANY(task_viewers);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Create or replace the visibility view
Error creating task: {}

lib\api.ts (745:17) @ Object.createTask


  743 |           throw new Error("Task creation blocked by RLS. Ensure you are logged in as CEO, C_LEVEL, or LEAD, and that the get_user_role() database function exists.")
  744 |         }
> 745 |         console.error("Error creating task:", {
      |                 ^
  746 |           message: error.message,
  747 |           details: error.details,
  748 |           hint: error.hint,
Call Stack
5

Show 3 ignore-listed frame(s)
Object.createTask
lib\api.ts (745:17)
async handleCreateTask
app\(workspace)\tasks\page.tsx (134:7)
-- ============================================================
-- After running this migration, verify:
-- 1. Existing tasks have their assignee_id backfilled into assignee_ids[0]
-- 2. Task creation via the UI works (assignee + optional viewers)
-- 3. assignee and viewer see the task in their task lists
-- 4. The assignor sees the task as well (RLS: task_read_assigned)
-- ============================================================
