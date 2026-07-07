-- ============================================================
-- PHASE 3: Storage Security Fixes
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- NOTE: You must ALSO manually make the 'uploads' bucket PRIVATE
-- in the Supabase Dashboard: Storage -> uploads -> Settings -> Private

-- ============================================================
-- Storage RLS Policies for the 'uploads' bucket
-- ============================================================

-- Policy 1: Authenticated users can read files they uploaded
-- or files for tasks where they are assignee
DROP POLICY IF EXISTS "storage_read_own" ON storage.objects;
CREATE POLICY "storage_read_own" ON storage.objects
FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND (
        owner_id = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.submission_file_url IS NOT NULL
            AND auth.uid()::text = ANY(tasks.assignee_ids)
            AND storage.objects.name = tasks.submission_file_url
        )
    )
);

-- Policy 2: Authenticated users can upload files
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND owner_id = auth.uid()::text
);

-- Policy 3: Users can update their own files
DROP POLICY IF EXISTS "storage_update_own" ON storage.objects;
CREATE POLICY "storage_update_own" ON storage.objects
FOR UPDATE
USING (owner_id = auth.uid()::text);

-- Policy 4: Users can delete their own files
DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own" ON storage.objects
FOR DELETE
USING (owner_id = auth.uid()::text);

-- ============================================================
-- Manual Dashboard Actions Required:
-- 1. Make uploads bucket PRIVATE
-- 2. Set MIME type restrictions to:
--    application/pdf, application/msword,
--    application/vnd.openxmlformats-officedocument.*,
--    image/png, image/jpeg, image/gif
-- 3. Set max file size: 10MB
-- ============================================================
