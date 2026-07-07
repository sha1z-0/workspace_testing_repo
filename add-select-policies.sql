-- Add missing SELECT policies for all tables
-- Run this in Supabase SQL Editor
-- Note: Use DROP POLICY IF EXISTS first to avoid conflicts

-- Users table SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
CREATE POLICY "Authenticated users can read users" ON users FOR SELECT USING (auth.uid() IS NOT NULL);

-- Projects SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read projects" ON projects;
CREATE POLICY "Authenticated users can read projects" ON projects FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tasks SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON tasks;
CREATE POLICY "Authenticated users can read tasks" ON tasks FOR SELECT USING (auth.uid() IS NOT NULL);

-- Announcements SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read announcements" ON announcements;
CREATE POLICY "Authenticated users can read announcements" ON announcements FOR SELECT USING (auth.uid() IS NOT NULL);

-- Notifications SELECT policy
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);

-- Chat messages SELECT policy
DROP POLICY IF EXISTS "Users can read their messages" ON chat_messages;
CREATE POLICY "Users can read their messages" ON chat_messages FOR SELECT USING (
  auth.uid()::text = sender_id OR 
  auth.uid()::text = recipient_id OR 
  group_id IS NOT NULL
);

-- Departments SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read departments" ON departments;
CREATE POLICY "Authenticated users can read departments" ON departments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Teams SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read teams" ON teams;
CREATE POLICY "Authenticated users can read teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
