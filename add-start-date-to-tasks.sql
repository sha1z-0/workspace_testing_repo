-- Add start_date column to tasks table
-- This column will store when a task was started (moved to in_progress status)

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the column
COMMENT ON COLUMN tasks.start_date IS 'Timestamp when the task status was first changed to in_progress';
