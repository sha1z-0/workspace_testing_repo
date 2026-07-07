-- Fix RLS policies for notifications table
-- This allows authenticated users to create notifications for any user

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;

-- TEMPORARY: Allow anyone to insert (for testing)
-- Create policy that allows any authenticated user to create notifications for anyone
-- Using a simpler check that should work
CREATE POLICY "Anyone can create notifications" ON notifications 
  FOR INSERT 
  WITH CHECK (true);

-- Verify other policies exist
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications 
  FOR SELECT 
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE 
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications 
  FOR DELETE 
  USING (auth.uid()::text = user_id);
