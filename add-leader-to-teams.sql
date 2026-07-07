-- Add leader_id column to teams table
-- This allows associating a team with a lead user
-- Run this in Supabase SQL Editor

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS leader_id TEXT,
ADD COLUMN IF NOT EXISTS leader_name TEXT;

-- Add foreign key constraint to users table
ALTER TABLE teams
ADD CONSTRAINT fk_teams_leader
FOREIGN KEY (leader_id) 
REFERENCES users(uid)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;
