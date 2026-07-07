-- Add comprehensive RLS policies for all operations
-- Run this in Supabase SQL Editor after the main schema

-- Users table policies
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = uid);
CREATE POLICY "Users can delete own profile" ON users FOR DELETE USING (auth.uid()::text = uid);

-- Projects policies  
CREATE POLICY "Authenticated users can create projects" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update projects" ON projects FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete projects" ON projects FOR DELETE USING (auth.uid() IS NOT NULL);

-- Tasks policies
CREATE POLICY "Authenticated users can create tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tasks" ON tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tasks" ON tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- Announcements policies
CREATE POLICY "Authenticated users can create announcements" ON announcements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update announcements" ON announcements FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete announcements" ON announcements FOR DELETE USING (auth.uid() IS NOT NULL);

-- Notifications policies
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid()::text = user_id);

-- Chat messages policies
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
CREATE POLICY "Users can update their messages" ON chat_messages FOR UPDATE USING (auth.uid()::text = sender_id);
CREATE POLICY "Users can delete their messages" ON chat_messages FOR DELETE USING (auth.uid()::text = sender_id);

-- Chat groups policies
CREATE POLICY "Authenticated users can read groups" ON chat_groups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create groups" ON chat_groups FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "Group creators can update groups" ON chat_groups FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "Group creators can delete groups" ON chat_groups FOR DELETE USING (auth.uid()::text = created_by);

-- Calendar events policies
CREATE POLICY "Authenticated users can read events" ON calendar_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update events" ON calendar_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete events" ON calendar_events FOR DELETE USING (auth.uid() IS NOT NULL);

-- Warnings policies
CREATE POLICY "Authenticated users can read warnings" ON warnings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create warnings" ON warnings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update warnings" ON warnings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete warnings" ON warnings FOR DELETE USING (auth.uid() IS NOT NULL);

-- Time tracking policies
CREATE POLICY "Authenticated users can read time tracking" ON time_tracking FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create own time entries" ON time_tracking FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own time entries" ON time_tracking FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own time entries" ON time_tracking FOR DELETE USING (auth.uid()::text = user_id);

-- Departments policies
CREATE POLICY "Authenticated users can read departments" ON departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create departments" ON departments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update departments" ON departments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete departments" ON departments FOR DELETE USING (auth.uid() IS NOT NULL);

-- Teams policies
CREATE POLICY "Authenticated users can read teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update teams" ON teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete teams" ON teams FOR DELETE USING (auth.uid() IS NOT NULL);
