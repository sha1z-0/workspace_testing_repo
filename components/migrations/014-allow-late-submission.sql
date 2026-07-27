-- Add allow_late_submission to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT false;

-- Add allow_late_submission to task_milestones
ALTER TABLE task_milestones ADD COLUMN IF NOT EXISTS allow_late_submission BOOLEAN NOT NULL DEFAULT false;

-- Drop cache/force schema reload if necessary in PostgREST
NOTIFY pgrst, 'reload schema';
