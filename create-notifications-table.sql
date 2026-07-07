-- Create notifications table
-- This table stores in-app notifications for users (appears in notification bell)

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_to TEXT,
  related_item_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Create index for faster queries on unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can read their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications 
  FOR SELECT 
  USING (auth.uid()::text = user_id);

-- Anyone authenticated can create notifications for any user (for invitations, assignments, etc.)
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications 
  FOR UPDATE 
  USING (auth.uid()::text = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications 
  FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Add comment to explain the table
COMMENT ON TABLE notifications IS 'Stores in-app notifications that appear in the notification bell dropdown';
