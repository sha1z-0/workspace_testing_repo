-- ============================================================
-- FINOVA WORKSPACE — STORAGE RLS + REVIEWER FILE SCHEMA
-- ============================================================
-- Problem 1: Assigner can't read task submission files
--   Fix: Extend storage_read_own to include task assigner
--   and cover both submission_file_url + review_assigner_file_url
--
-- Problem 2: Assigner file attachments on reviews
--   Adds 3 columns for reviewer file reference on tasks
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- ============================================================
-- SCHEMA: Add reviewer file attachment columns
-- ============================================================
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS review_assigner_file_url TEXT,
ADD COLUMN IF NOT EXISTS review_assigner_file_name TEXT,
ADD COLUMN IF NOT EXISTS review_assigner_file_size INTEGER;

-- ============================================================
-- RLS: Fix storage_read_own policy
-- OLD: Only file owner + task assignees could read
-- NEW: Add task assigner, and cover both submission_file_url
--      and review_assigner_file_url columns
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
            AND storage.objects.name = tasks.submission_file_url
            AND (
                auth.uid()::text = ANY(tasks.assignee_ids)
                OR auth.uid()::text = tasks.assigned_by
            )
        )
        -- Reviewer file: assignees + assigner can read
        OR EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.review_assigner_file_url IS NOT NULL
            AND storage.objects.name = tasks.review_assigner_file_url
            AND (
                auth.uid()::text = ANY(tasks.assignee_ids)
                OR auth.uid()::text = tasks.assigned_by
            )
        )
    )
);

-- ============================================================
-- Verify after running:
-- 1. New columns exist on tasks
-- 2. Assigner can open submission files attached by assignees
-- 3. Assignee can open reviewer files attached by assigner
-- ============================================================
