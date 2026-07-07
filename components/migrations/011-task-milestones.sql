-- ============================================================
-- FINOVA WORKSPACE — TASK MILESTONES
-- ============================================================
-- Adds sequential, assigner-approved milestone support to tasks.
-- Milestones are opt-in per task (is_phased = true).
-- Each milestone goes through its own review cycle.
-- Task completion is gated behind all milestones being approved.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- 1. CREATE task_milestones TABLE
CREATE TABLE IF NOT EXISTS task_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  order_index INTEGER NOT NULL,
  weight INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','pending_review','needs_revision','approved')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CREATE milestone_reviews TABLE
CREATE TABLE IF NOT EXISTS milestone_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES task_milestones(id) ON DELETE CASCADE,
  comment TEXT DEFAULT '',
  decision TEXT CHECK (decision IN ('approved','rejected')),
  employee_file_url TEXT,
  employee_file_name TEXT,
  employee_file_size INTEGER,
  reviewer_file_url TEXT,
  reviewer_file_name TEXT,
  reviewer_file_size INTEGER,
  reviewer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_task_milestones_task_id
  ON task_milestones(task_id);
CREATE INDEX IF NOT EXISTS idx_task_milestones_order
  ON task_milestones(task_id, order_index);
CREATE INDEX IF NOT EXISTS idx_milestone_reviews_milestone
  ON milestone_reviews(milestone_id, created_at DESC);

-- 4. RLS: Enable on both tables
ALTER TABLE task_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES — piggyback on parent task visibility
-- Read: any user who can see the parent task can see its milestones + reviews

CREATE POLICY "milestones_select" ON task_milestones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND (
      auth.uid()::text = ANY(tasks.assignee_ids)
      OR auth.uid()::text = ANY(tasks.viewer_ids)
      OR auth.uid()::text = tasks.assigned_by
    )
  )
);

CREATE POLICY "reviews_select" ON milestone_reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM task_milestones
    JOIN tasks ON tasks.id = task_milestones.task_id
    WHERE task_milestones.id = milestone_reviews.milestone_id
    AND (
      auth.uid()::text = ANY(tasks.assignee_ids)
      OR auth.uid()::text = ANY(tasks.viewer_ids)
      OR auth.uid()::text = tasks.assigned_by
    )
  )
);

-- Insert/Update/Delete milestones: only the task assigner (manager)
CREATE POLICY "milestones_insert" ON task_milestones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND tasks.assigned_by = auth.uid()::text
  )
);

CREATE POLICY "milestones_update" ON task_milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND tasks.assigned_by = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND tasks.assigned_by = auth.uid()::text
  )
);

CREATE POLICY "milestones_delete" ON task_milestones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND tasks.assigned_by = auth.uid()::text
  )
);

-- Reviews: insert by anyone who can see the milestone (assignee submits, assigner reviews)
CREATE POLICY "reviews_insert" ON milestone_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_milestones
    JOIN tasks ON tasks.id = task_milestones.task_id
    WHERE task_milestones.id = milestone_reviews.milestone_id
    AND (
      auth.uid()::text = ANY(tasks.assignee_ids)
      OR auth.uid()::text = tasks.assigned_by
    )
  )
);

-- Reviews: update by the reviewer (assigner)
CREATE POLICY "reviews_update" ON milestone_reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM task_milestones
    JOIN tasks ON tasks.id = task_milestones.task_id
    WHERE task_milestones.id = milestone_reviews.milestone_id
    AND tasks.assigned_by = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM task_milestones
    JOIN tasks ON tasks.id = task_milestones.task_id
    WHERE task_milestones.id = milestone_reviews.milestone_id
    AND tasks.assigned_by = auth.uid()::text
  )
);

-- 6. DROP milestone_count from tasks (auto-derived now)
-- Must drop the dependent view first
DROP VIEW IF EXISTS tasks_with_visibility;

ALTER TABLE tasks DROP COLUMN IF EXISTS milestone_count;

-- Recreate the view without the dropped column
CREATE OR REPLACE VIEW tasks_with_visibility AS
SELECT 
  t.*,
  CASE 
    WHEN u.role IN ('CEO', 'C_LEVEL', 'LEAD') THEN true
    WHEN u.uid = ANY(t.assignee_ids) THEN true
    WHEN u.uid = ANY(t.viewer_ids) THEN true
    ELSE false
  END AS is_visible_to_user
FROM tasks t
CROSS JOIN users u;

-- ============================================================
-- Verify after running:
-- 1. task_milestones and milestone_reviews tables exist
-- 2. RLS policies exist on both tables
-- 3. milestone_count column removed from tasks
-- 4. Create a task with is_phased=true + milestones, verify visibility
-- ============================================================
