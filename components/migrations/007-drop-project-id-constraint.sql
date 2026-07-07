-- ============================================================
-- FINOVA WORKSPACE — DROP tasks_project_id_required CONSTRAINT
-- ============================================================
-- Bug: Task creation fails with error code 23514:
--   "new row violates check constraint tasks_project_id_required"
-- Root cause: A CHECK constraint on tasks.project_id prevents NULL,
-- but the app code explicitly passes null when no project is selected.
-- Tasks don't require a project — this constraint is incorrect.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_required;

-- ============================================================
-- Verify: create a task without selecting a project — should succeed
-- ============================================================
