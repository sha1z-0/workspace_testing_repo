-- TEMPORARY: Disable RLS on notifications table for testing
-- This will allow all operations without restriction
-- Re-enable RLS after testing is complete

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- To re-enable later, run:
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
