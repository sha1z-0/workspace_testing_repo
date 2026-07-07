-- Add missing resolved_at, resolved_by, and resolved_reason columns to warnings table
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS resolved_reason TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'warnings' 
ORDER BY ordinal_position;
