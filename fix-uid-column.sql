-- Fix existing users table by altering uid column from UUID to TEXT
-- Run this BEFORE running supabase-schema.sql

-- Step 1: Drop policies that reference the uid column
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 2: Alter the uid column type from UUID to TEXT
ALTER TABLE users ALTER COLUMN uid TYPE TEXT USING uid::TEXT;

-- Step 3: Recreate the policy with correct type
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = uid);

-- Confirm the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'uid';
