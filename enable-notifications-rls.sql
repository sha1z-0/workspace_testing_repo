-- Re-enable RLS with proper policies for notifications table
-- This allows authenticated users to create notifications for any user (needed for invitations/assignments)
-- while keeping read/update/delete restricted to the notification owner

-- Re-enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Allow all authenticated users to create notifications for anyone
-- This is necessary for:
-- - Meeting/event invitations (organizer creates notification for attendees)
-- - Task assignments (assigner creates notification for assignee)
-- - Mentions and comments (commenter creates notification for mentioned user)
CREATE POLICY "Authenticated users can create any notification" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Users can only update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);
