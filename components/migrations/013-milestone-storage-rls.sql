-- ============================================================
-- FINOVA WORKSPACE — EXTEND STORAGE RLS TO COVER MILESTONE FILES
-- ============================================================
-- Root cause: storage_read_own policy (migration 010) only
-- checks tasks.submission_file_url and tasks.review_assigner_file_url.
-- Milestone files are stored in milestone_reviews.*_file_url —
-- a completely different table the policy never queries.
-- For non-owners, createSignedUrl() fails the RLS EXISTS
-- subqueries against tasks, returning "Bucket not found" 404.
--
-- This adds two new EXISTS blocks that JOIN through
-- milestone_reviews → task_milestones → tasks to check
-- the same assignee_ids/assigned_by visibility rules.
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

        -- Task reviewer file: assignees + assigner can read
        OR EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.review_assigner_file_url IS NOT NULL
            AND tasks.review_assigner_file_url LIKE '%/uploads/' || storage.objects.name
            AND (
                auth.uid()::text = ANY(tasks.assignee_ids)
                OR auth.uid()::text = tasks.assigned_by
            )
        )

        -- Milestone employee file: task assignees + assigner
        OR EXISTS (
            SELECT 1 FROM milestone_reviews mr
            JOIN task_milestones tm ON tm.id = mr.milestone_id
            JOIN tasks t ON t.id = tm.task_id
            WHERE mr.employee_file_url IS NOT NULL
            AND mr.employee_file_url LIKE '%/uploads/' || storage.objects.name
            AND (
                auth.uid()::text = ANY(t.assignee_ids)
                OR auth.uid()::text = t.assigned_by
            )
        )

        -- Milestone reviewer file: task assignees + assigner
        OR EXISTS (
            SELECT 1 FROM milestone_reviews mr
            JOIN task_milestones tm ON tm.id = mr.milestone_id
            JOIN tasks t ON t.id = tm.task_id
            WHERE mr.reviewer_file_url IS NOT NULL
            AND mr.reviewer_file_url LIKE '%/uploads/' || storage.objects.name
            AND (
                auth.uid()::text = ANY(t.assignee_ids)
                OR auth.uid()::text = t.assigned_by
            )
        )
    )
);

-- ============================================================
-- Verify after running:
-- 1. Employee attaches file to milestone submit → opens for both roles
-- 2. Assigner attaches file to milestone approve/reject → opens for both roles
-- 3. Task submission files still open for both roles (no regression)
-- 4. Task reviewer files still open for both roles (no regression)
-- ============================================================
