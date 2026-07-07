-- Migration: Add viewer/observer access to tasks
-- Run this in your Supabase SQL Editor

-- Add columns for users who can view task progress (read-only access)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS viewer_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS viewer_names TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_viewer_ids ON tasks USING GIN(viewer_ids);

-- Update the visibility function to include viewers
CREATE OR REPLACE FUNCTION is_user_assigned_to_task(task_assignees TEXT[], task_viewers TEXT[], user_uid TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_uid = ANY(task_assignees) OR user_uid = ANY(task_viewers);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the view for role-based visibility to include viewers
DROP VIEW IF EXISTS tasks_with_visibility;
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

COMMENT ON VIEW tasks_with_visibility IS 'Tasks with role-based visibility: CEO, C_LEVEL, and LEAD can see all tasks; assignees and viewers can see specific tasks';
COMMENT ON COLUMN tasks.viewer_ids IS 'User IDs who have read-only access to view task progress';
COMMENT ON COLUMN tasks.viewer_names IS 'Names of users who have read-only access to view task progress';
