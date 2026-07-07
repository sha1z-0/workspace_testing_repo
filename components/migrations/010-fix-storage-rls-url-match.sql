-- ============================================================
-- FINOVA WORKSPACE — FIX STORAGE RLS URL/PATH MISMATCH
-- ============================================================
-- Root cause: storage_read_own RLS policy compares objects.name
-- (just the file path like "submissions/uid/task/file.pdf")
-- against tasks.*_file_url (the FULL public URL like
-- "https://hudqmaxudupvxpfkmfna.supabase.co/storage/v1/object/...
--  /public/uploads/submissions/uid/task/file.pdf").
-- These never match for non-owners, so createSignedUrl fails
-- with "Bucket not found" 404.
--
-- Fix: Use LIKE suffix matching:
--   tasks.column_url LIKE '%/uploads/' || storage.objects.name
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

DROP POLICY IF EXISTS "storage_read_own" ON storage.objects;

CREATE POLICY "storage_read_own" ON storage.objects
FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND (
        -- File owner always has access
        owner_id = auth.uid()::text
        -- Task submission file: assignees + assigner can read
        OR EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.submission_file_url IS NOT NULL
            AND tasks.submission_file_url LIKE '%/uploads/' || storage.objects.name
            AND (
                auth.uid()::text = ANY(tasks.assignee_ids)
                OR auth.uid()::text = tasks.assigned_by
            )
        )
        -- Reviewer file: assignees + assigner can read
        OR EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.review_assigner_file_url IS NOT NULL
            AND tasks.review_assigner_file_url LIKE '%/uploads/' || storage.objects.name
            AND (
                auth.uid()::text = ANY(tasks.assignee_ids)
                OR auth.uid()::text = tasks.assigned_by
            )
        )
    )
);

-- ============================================================
-- Verify after running:
-- 1. Employee opens their own completion file → works
-- 2. Assigner opens employee's completion file → works
-- 3. Employee opens reviewer file attached by assigner → works
-- 4. Assigner opens reviewer file they attached → works
-- ============================================================
