# Changes Log — Finova Workspace

## [2026-07-07] File Upload Consolidation + Milestone File RLS + Auto-Download

### Status: Completed (RLS fix SQL must be run manually)

### Root Cause
**Recurring RLS gap.** The `storage_read_own` policy (migration 010) only checked `tasks.submission_file_url` and `tasks.review_assigner_file_url`. Milestone files are stored in `milestone_reviews.employee_file_url` and `milestone_reviews.reviewer_file_url` — a completely different table the policy never queries. When `getSignedFileUrl()` called `createSignedUrl()` for a milestone file, RLS ran its EXISTS subqueries against `tasks`, found no match for non-owners, and returned the "Bucket not found" 404.

**Why it recurred:** 7 separate inline upload implementations existed across `lib/api.ts` — task completion, task progress review, assigner reviewer upload, milestone submit, milestone approve, milestone reject, and vault upload. Every one repeated the same 25-line block (validate type, validate size, timestamp, sanitize name, build path, `storage.from("uploads").upload()`, `getPublicUrl()`). The RLS policy was written when only `tasks` had file columns, and when milestones added `milestone_reviews`, no one extended it. Each fix to one upload path (like the `uploadReviewerFile` return-shape fix) had to be manually replicated — a textbook consequence of parallel implementations.

### Actual Changes Made

**Consolidation — `lib/file-utils.ts` (new):**
- `uploadFile(bucket, folder, entityId, file, userId)` — single function for all file uploads. Handles type validation, size validation, path generation, upload, and public URL retrieval. Returns `{ url, name, size }`.
- `getSignedFileUrl(fileUrl, bucket)` — shared signed URL generation with PostgREST-aware error logging. Auto-detects bucket from URL.
- `downloadFile(fileUrl, fileName, bucket)` — blob-based forced download via `fetch` + `createObjectURL` + `<a download>`. Preserves original filename. Works reliably across browsers for cross-origin storage URLs.

**Refactored — `lib/api.ts`:**
- All 7 upload functions now delegate to `uploadFile()` — eliminated ~120 lines of duplicated validation/upload/URL code
- `getSignedFileUrl` now delegates to the shared `getSignedFileUrl()`
- Removed duplicated ALLOWED_TYPES, MAX_SIZE, timestamp/path-generation boilerplate from every function

**Refactored — `app/(workspace)/tasks/page.tsx`:**
- All 4 file-open buttons replaced `window.open(signedUrl, "_blank")` with `downloadFile(url, filename)` — blob-based auto-download
- Covers: milestone employee files, milestone reviewer files, task submission files, task reviewer files

**Refactored — `app/(workspace)/vault/page.tsx`:**
- `handleDownload` replaced `window.open(signedUrl, "_blank")` with `downloadFile(url, filename, "vault")` — vault files now auto-download instead of opening in-browser

**RLS Fix SQL (must be run manually):**
- Extends `storage_read_own` policy to also check `milestone_reviews.employee_file_url` and `milestone_reviews.reviewer_file_url` columns via JOIN through `task_milestones` → `tasks`

### Files Touched
- `lib/file-utils.ts` (new) — shared upload/signed-URL/download utilities
- `lib/api.ts` — refactored all 7 upload sites + `getSignedFileUrl` to use shared utilities
- `app/(workspace)/tasks/page.tsx` — 4 file buttons now use `downloadFile()` for blob-based download
- `app/(workspace)/vault/page.tsx` — vault download now uses `downloadFile()`
- `supabase/CHANGES.md` — this entry

### RLS Fix SQL (Run Manually)
```sql
-- ============================================================
-- EXTEND STORAGE RLS TO COVER MILESTONE FILES
-- ============================================================
-- Milestone files are stored in milestone_reviews, not tasks.
-- The existing storage_read_own only checks tasks columns,
-- so createSignedUrl RLS fails for milestone files.
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

        -- Milestone employee file: task assignees + assigner can read
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

        -- Milestone reviewer file: task assignees + assigner can read
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
```

### Regression Verification
- [ ] Task progress review file attach → uploads to `uploads/reviews/` via shared `uploadFile`
- [ ] Task completion review mandatory file → uploads correctly, assigner can view
- [ ] Assigner optional review file → uploads correctly, employee can view
- [ ] Milestone submit file (employee) → uploads correctly, open triggers auto-download
- [ ] Milestone approve/reject file (assigner) → uploads correctly, open triggers auto-download
- [ ] Vault file download → triggers auto-download with correct filename
- [ ] All file surfaces use blob-based download (not `window.open`)
- [ ] Original filenames preserved in downloads
- [ ] Non-milestone task lifecycle: start → review → complete — all unchanged
- [ ] Milestone lifecycle: start → submit → approve/reject → sequential locking — all unaffected
- [ ] Only assigner can complete a task — unchanged

---

## [2026-07-07] Milestone Start Actions — RLS + Half-Start Fix

### Root Cause
**RLS blocked the employee from updating milestone status.** Migration 011's `milestones_update` policy restricted UPDATE to only `tasks.assigned_by = auth.uid()::text` — the task assigner/manager. When the employee clicked "Start" on a milestone, `startMilestone()` ran a SELECT (passes `milestones_select` — assignees allowed), validated sequential order, then attempted `UPDATE task_milestones SET status = 'in_progress'` — which RLS silently rejected. The `.single()` call returned 0 rows with an error, and the handler showed a generic toast.

**Secondary: `handleStartTask` half-started phased tasks.** The bottom "Start First Milestone" button called `startTask(taskId)` first (succeeds: task enters `in_progress` in DB), then `startMilestone(first.id)` second (failed from RLS). When the milestone start failed, the task was already `in_progress` but no milestone was started — and the error toast was surfaced while the dialog stayed open in a broken state.

**Tertiary: Silent error diagnostics.** The `startMilestone` API function had no PostgREST-aware error logging — if RLS or another DB error occurred, the real error code/message/details were invisible in the console.

### Actual Changes Made

**RLS Fix (SQL — requires manual run):**
- Drop the assigner-only `milestones_update` policy from migration 011
- Replace with a policy that allows UPDATE by **both** task assignees (employee starting/submitting milestones) **and** the task assigner (manager approving/rejecting/managing milestones)

**Code Fix — `handleStartTask` (`app/(workspace)/tasks/page.tsx`):**
- For phased tasks: now calls `startMilestone(firstMilestone.id)` **before** `startTask(taskId)` — if the milestone start fails (RLS, validation, anything), the task is still `todo` and nothing is left half-done
- For non-phased tasks: unchanged behavior (`startTask` sets 15%)

**Code Fix — `handleStartMilestone` (`app/(workspace)/tasks/page.tsx`):**
- Added success toast ("Milestone started — Work on this milestone can now begin")
- Added `console.error("Failed to start milestone:", error)` for diagnostic visibility

**Code Fix — `startMilestone` API (`lib/api.ts`):**
- Added PostgREST-aware error logging: `console.error("startMilestone update error:", JSON.stringify(error, Object.getOwnPropertyNames(error)))` — same pattern used in `createTask` milestone insert

### Files Touched
- `app/(workspace)/tasks/page.tsx` — `handleStartMilestone` success toast + error logging; `handleStartTask` reordered for phased tasks
- `lib/api.ts` — `startMilestone` PostgREST error logging
- `supabase/CHANGES.md` — this entry

### RLS Fix SQL (Run Manually)
```sql
-- ============================================================
-- FIX MILESTONE UPDATE RLS — Allow assignees to update statuses
-- ============================================================
DROP POLICY IF EXISTS "milestones_update" ON task_milestones;

CREATE POLICY "milestones_update" ON task_milestones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND (
      auth.uid()::text = ANY(tasks.assignee_ids)
      OR auth.uid()::text = tasks.assigned_by
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_milestones.task_id
    AND (
      auth.uid()::text = ANY(tasks.assignee_ids)
      OR auth.uid()::text = tasks.assigned_by
    )
  )
);
```

### Regression Verification
- [ ] Non-milestone task: Start Task → sets 15% progress, status in_progress
- [ ] Non-milestone task: Progress review (no file) → goes to pending_review
- [ ] Non-milestone task: Progress review (with file) → file attached, assigner sees it
- [ ] Non-milestone task: Completion review → requires file, goes to pending_completion_review
- [ ] Non-milestone task: Assigner approves → marks completed, progress 100%
- [ ] Non-milestone task: Assigner rejects → returns to in_progress
- [ ] Non-milestone task: Assignee cannot self-complete
- [ ] Non-milestone task: File viewing works for both roles
- [ ] Milestone task: Inline "Start" button → milestone status → in_progress, UI updates immediately
- [ ] Milestone task: Bottom "Start First Milestone" button → milestone status → in_progress, dialog closes
- [ ] Milestone task: Both triggers use same handler, no diverging code paths (confirmed: both call `startMilestone` API)
- [ ] Milestone task: Sequential enforcement — cannot start Milestone 2 before Milestone 1 approved
- [ ] Milestone task: Milestone 2 remains locked until Milestone 1 approved
- [ ] Milestone task: Submit for Review appears on started milestone
- [ ] Milestone task: Progress stays 0 until milestone approved

---

## [2026-07-07] Milestone Schema Fix — Patched Live DB Incompatibilities

### Root Cause
Migration 011 used `CREATE TABLE IF NOT EXISTS` for `task_milestones`. The table already existed on the live DB from an older schema version with incompatible columns: no `weight`, wrong `status` CHECK (`pending/in_progress/completed` vs the expected `not_started/in_progress/pending_review/needs_revision/approved`), and non-nullable `DATE` type for `due_date` instead of nullable `TIMESTAMPTZ`. The IF NOT EXISTS silently skipped table creation, so all milestone API calls failed — the `createTask` milestone insert errored on the missing `weight` column, and every subsequent milestone operation broke on the wrong status enum. Two orphaned triggers (`trigger_update_milestone_count` and function `update_task_milestone_count`) also remained from the old schema, referencing the now-deleted `milestone_count` column.

### Actual Changes Made

**Migration (`components/migrations/012-fix-milestone-schema.sql`):**
- Drops orphaned triggers + functions (`trigger_update_milestone_count`, `update_task_milestone_count`, `calculate_milestone_progress`) that reference the removed `milestone_count` column
- Drops old RLS policies (`Task assignees can manage milestones`, `Users can view milestones for accessible tasks`) that conflict with the new policy set from migration 011
- Drops the old `task_milestones_status_check` constraint + migrates old status values: `pending→not_started`, `completed→approved`, `in_progress` stays
- Adds the correct CHECK constraint: `status IN ('not_started','in_progress','pending_review','needs_revision','approved')`
- Adds the missing `weight` column (INTEGER NOT NULL DEFAULT 0)
- Alters `due_date` from non-nullable `DATE` to nullable `TIMESTAMPTZ`

**Code — None required. All code is correct; only the database needed fixing.**

### Files Touched
- `components/migrations/012-fix-milestone-schema.sql` (new) — surgical ALTER migration
- `supabase/CHANGES.md` — updated entry

### Migration File
- `components/migrations/012-fix-milestone-schema.sql` — run in Supabase SQL Editor to patch live `task_milestones` schema

### Verification Queries
See queries embedded in migration file comments.

---

## [2026-07-06] Task Milestones — Fixed & Fully Built [SCHEMA MISMATCH — FIXED BY 012]

### Status: Code Complete, DB fixed by migration 012 above

### Root Cause
The original milestone implementation (entry below) was marked "Completed" but was broken at creation time. The milestone insert silently failed (`{}` logged instead of real error properties from PostgREST's non-enumerable error object) and the error was swallowed rather than thrown — the task was created without milestones and the user saw a "Task created successfully" toast. Additionally: no sequential ordering enforcement existed at the API level, mid-task management UI was missing, creation UI lacked description/due date fields, milestone progress indicators on task cards were absent, and the `startTask` function set 15% progress unconditionally even for milestone tasks.

**Additional root cause discovered 2026-07-07**: The live `task_milestones` table had an old incompatible schema (no `weight` column, wrong status enum, wrong `due_date` type). Migration 011's `CREATE TABLE IF NOT EXISTS` silently skipped the table because it already existed. See migration 012 above for the fix.

### Actual Changes Made

**Bug Fixes:**
- `createTask` (`lib/api.ts`): Now uses `JSON.stringify(error, Object.getOwnPropertyNames(error))` for milestone insert errors to surface the real PostgREST error code/message/details/hint. Now throws on milestone creation failure instead of silently swallowing it.
- `startTask` (`lib/api.ts`): Now checks `is_phased` — skips the flat 15% progress jump for milestone-based tasks (progress stays 0 until milestones are approved). Non-milestone tasks unchanged at 15%.

**Backend — Sequential Ordering Enforcement:**
- `startMilestone` (`lib/api.ts`): Now validates the milestone is `not_started` and no earlier milestone is unapproved. Throws clear errors if out of order.
- `submitMilestoneReview` (`lib/api.ts`): Now validates the milestone is `in_progress` and no earlier milestone is unapproved. Throws if out of order.
- Both enforcements work at the API level — not just UI hiding.

**Backend — Mid-Task Milestone Management:**
- `addMilestone` (new, `lib/api.ts`): Adds a milestone mid-task with even weight redistribution across all milestones. Picks up `description`, `dueDate`, `weight` from the payload. Recalculates task progress after insertion.
- `deleteMilestone` (`lib/api.ts`): Rewritten weight redistribution: approved milestones retain their weight (progress already credited isn't retroactively reduced). If the deleted milestone was approved, its weight is folded back into the task's progress permanently. Unapproved deletion redistributes weight only among remaining unapproved milestones. When no milestones remain, resets task progress to 0.
- `updateMilestone` (`lib/api.ts`): Already existed, unchanged. Supports updating title, description, weight, status, due_date.
- `reorderMilestones` (`lib/api.ts`): Already existed, unchanged. Validates that approved milestones always come before unapproved ones in the new order.

**Backend — Milestone Summaries:**
- `getMilestoneSummaries` (new, `lib/api.ts`): Batch query — accepts array of taskIds, returns `Record<taskId, { total, approved }>`. Used by task card for "N/M approved" display without N+1 queries.

**Frontend — Task Cards:**
- `app/(workspace)/tasks/page.tsx`: Milestone summaries fetched after task load (`fetchTasks` updates `milestoneSummaries` state). Cards now show "2/5" instead of generic "Phased" when a summary exists. Falls back to "Phased" if the milestone table isn't live yet.

**Frontend — Create Task Milestone Inputs:**
- Added description textarea per milestone (optional). Layout expanded to `space-y-3` to accommodate both title and description fields. Each milestone row now has: number → title input → description input → remove button.

**Frontend — Mid-Task Management (Assigner):**
- "Manage" button in the View Details milestone section header (visible only to the task's assigner).
- Manage Milestones dialog: lists all milestones with status badges, up/down reorder arrows, Edit button, and Delete (X) button. Reorder triggers `reorderMilestones` via `moveMilestone` helper. Edit opens a separate dialog with title, description, and weight fields.
- Add new milestone inline: input + "Add" button at the bottom of the list.
- Edit Milestone dialog: title, description (textarea), weight (number input).

**Frontend — Milestone File Display:**
- Reviewer file attachment now shown alongside employee file in the milestone stepper — both as compact `FileText` icon buttons with distinct colors (blue for employee, amber for reviewer).

### Files Touched
- `lib/api.ts` — `createTask` milestone error handling fix; `startMilestone` + `submitMilestoneReview` sequential enforcement; `startTask` phased-awareness; `addMilestone` (new); `deleteMilestone` rewritten; `getMilestoneSummaries` (new)
- `app/(workspace)/tasks/page.tsx` — milestone summaries fetch + task card display; create milestone description inputs; Manage Milestones dialog; Edit Milestone dialog; reviewer file display in stepper; `milestoneSummaries` + `milestoneListForManage` state; `openManageMilestones`, `handleAddMilestoneMidTask`, `handleEditMilestone`, `handleDeleteMilestone`, `handleReorderMilestones`, `moveMilestone` handlers

### Migration File
- `components/migrations/011-task-milestones.sql` — creates `milestone_reviews` table + RLS policies, drops `milestone_count`, recreates `tasks_with_visibility` view. NOTE: table-altering portion fixed by 012.

### Regression Verification
- [ ] Non-milestone task: Start Task → sets 15% progress, status in_progress
- [ ] Non-milestone task: Progress review (no file) → goes to pending_review
- [ ] Non-milestone task: Progress review (with file) → file attached, assigner sees it
- [ ] Non-milestone task: Completion review → requires file, goes to pending_completion_review
- [ ] Non-milestone task: Assigner approves → marks completed, progress 100%
- [ ] Non-milestone task: Assigner rejects → returns to in_progress
- [ ] Non-milestone task: Assignee cannot self-complete
- [ ] Non-milestone task: File viewing works for both roles
- [ ] Milestone task: Create with milestones → task created, milestones persisted, no error toast
- [ ] Milestone task: Start Task → first milestone auto-started, progress stays 0
- [ ] Milestone task: Sequential enforcement — cannot start milestone 2 before 1 approved
- [ ] Milestone task: Submit milestone for review (with optional file) → assigner sees it
- [ ] Milestone task: Assigner approve milestone → milestone approved, progress recalculated
- [ ] Milestone task: Assigner reject milestone → needs_revision, assignee can resubmit
- [ ] Milestone task: All milestones approved → completion review unlocked
- [ ] Milestone task: Completion gating — submit blocked if any milestone not approved
- [ ] Milestone task: File attachments on milestones optional
- [ ] Milestone task: Manage Milestones dialog → add/edit/reorder/remove works
- [ ] Milestone task: Delete approved milestone → weight folded into progress, not lost
- [ ] Milestone task: Task card shows "N/M approved" indicator

### Notes / Follow-ups
- The root cause of the original `{}` error was most likely the `task_milestones` table not existing on the live database (migration 011 never run). The improved error logging will surface the real PostgREST error (likely `42P01: relation "task_milestones" does not exist`) so this can be confirmed.
- Editing milestone weight in the mid-task dialog does not automatically rebalance other milestones — the assigner must manually ensure weights sum to 100. Adding/removing milestones does auto-rebalance.

---

## [2026-07-06] Task Milestones — Sequential, Assigner-Approved [SUPERSEDED]

### Status: Superseded by entry above

**Note:** This entry was previously marked "Completed" but the implementation had a critical bug (milestone insert silently failed, error swallowed) and was missing key features (sequential enforcement, mid-task management UI, milestone progress indicators on cards, description fields in creation). See the entry directly above for the actual completed implementation.

### Summary
Added optional milestone support to tasks. When creating a task, the assigner can toggle "Break this task into milestones?" and define an ordered list. Milestones must be worked in order — each goes through its own Start → Submit → Approve/Reject cycle. The task's completion review is gated behind all milestones being approved. Non-milestone tasks are completely unaffected.

### Schema
- Created `task_milestones` table: id, task_id (FK), title, description, order_index, weight (percentage), status (not_started/in_progress/pending_review/needs_revision/approved), due_date, timestamps
- Created `milestone_reviews` table: id, milestone_id (FK), comment, decision (approved/rejected), employee_file_url/name/size, reviewer_file_url/name/size, reviewer_id, created_at
- RLS policies on both tables piggyback on parent task visibility (EXISTS on tasks checking assignee_ids/assigned_by/viewer_ids)
- Insert/Update/Delete milestone policies restricted to task assigner
- Review insert allowed by both assignee and assigner
- Dropped unused `milestone_count` column from tasks; `is_phased` flag now indicates milestone-based tasks
- `milestones_select/insert/update/delete` + `reviews_select/insert/update` policies

### Edge-Case Decisions
- **Weight redistribution on add:** Evenly recalculated across new count. Custom-weight tasks prompt assigner to adjust manually (not implemented in this round — future enhancement).
- **Weight on remove unapproved:** Evenly redistributed across remaining.
- **Weight on remove approved:** Weight redistributed proportionally among remaining; approved progress preserved.
- **Reordering rules:** Approved milestones stay before unapproved ones. API rejects reorders that place an unapproved milestone before an approved one.
- **Start Task behavior:** For milestone tasks, skipping the flat 15% jump. Instead, the first milestone is started automatically.
- **Progress calculation:** Sum of weights of all approved milestones. Updated atomically on each milestone approve/reject.
- **Completion gating:** Backend rejects `submitCompletionReview` if any milestone is not approved. UI shows a locked completion button.
- **File attachments on milestones:** Optional on both employee submission and assigner decision. The mandatory-file gate stays only on the final task completion review.

### Files Touched
- `components/migrations/011-task-milestones.sql` (new) — schema + RLS policies
- `lib/types.ts` — added `task_milestones` + `milestone_reviews` table types; added `is_phased` to Insert/Update; removed `milestone_count` from Row
- `lib/firebase-types.ts` — added `isPhased` alias to FirebaseTask
- `lib/api.ts` — added `isPhased` to all task mappings; added milestone field to `createTask`; added 10 milestone API functions; added completion gating check to `submitCompletionReview`
- `app/(workspace)/tasks/page.tsx` — milestone UI: task creation toggle + list, View Details stepper with status badges/actions, milestone review dialog, card "Phased" indicator, completion gating in review dialog, milestone-aware Start Task

### API Functions Added
- `getTaskMilestones(taskId)` — returns milestones with latest review
- `getNextActionableMilestone(taskId)` — finds first not_started
- `startMilestone(id)` — sets in_progress
- `submitMilestoneReview(id, comment, file?, userId?)` — sets pending_review, stores optional employee file
- `approveMilestone(id, comment, reviewerId, file?, userId?)` — sets approved, recalculates task progress
- `rejectMilestone(id, comment, reviewerId, file?, userId?)` — sets needs_revision
- `recalculateMilestoneProgress(taskId)` — updates task.progress from approved milestone weights
- `allMilestonesApproved(taskId)` — boolean gate check
- `updateMilestone(id, data)` — edit single milestone
- `deleteMilestone(id)` — removes with weight redistribution
- `reorderMilestones(taskId, orderedIds[])` — reorders with zone validation

### Migration File
- `components/migrations/011-task-milestones.sql` — creates both tables, indexes, and 7 RLS policies

### Verification
See regression checks below.

---

## [2026-07-06] Optional File Attachment on Employee Progress Reviews

### Status: Completed

### Root Cause
This is an additive feature, not a bug fix. Progress review submissions had no file attachment capability — only completion reviews (mandatory) and assigner reviews (optional) supported files. The `review_assigner_file_*` columns on the tasks table were already in place from migration 009, but only the assigner-populated code path used them.

### Actual Changes Made
- **`submitProgressReview` API** (`lib/api.ts`): Now accepts optional `file: File` and `userId: string` parameters. If a file is provided, it uploads to `uploads/reviews/` (same path as the assigner file uploader) and stores the URL/name/size in `review_assigner_file_url/name/size` — the same columns the assigner review flow uses.
- **Progress review handler** (`page.tsx` — `handleSubmitProgressReview`): Passes `reviewFile` and `user.id` to the updated API. File is optional — submission succeeds with no file.
- **Progress review UI** (`page.tsx` — submit dialog): Added an optional file upload section when `reviewType === "progress"`, blue-themed to match the progress update style. Uses the same compact file-item display pattern as the completion review's file field. No asterisk or red warning text.
- **View Details** (`page.tsx`): Changed fallback label from "Reviewer file" to "Attached file" — more accurate now that either employee or assigner can populate it.
- **No schema changes required**: The `review_assigner_file_url/name/size` columns (added by migration 009) already exist and are reused here. The employee's optional file goes into the same column group. If the assigner later reviews that progress and attaches their own file, it intentionally overwrites — the assigner's file supersedes, which is correct behavior.

### Files Touched
- `lib/api.ts` — `submitProgressReview()` now accepts optional file + uploads to `reviews/` path
- `app/(workspace)/tasks/page.tsx` — `handleSubmitProgressReview` passes file; added optional file upload UI in shared dialog; updated description text + label

### Verification
- Employee can submit progress review with no file attached (optional works)
- Employee can submit progress review with a file attached (file persists to DB)
- Attached file appears in employee's View Details (amber-themed row, "Attached file" label)
- Attached file appears in assigner's View Details
- Completion review mandatory file requirement unaffected (still requires file, still red warning)
- Assigner optional file attachment on reviews unaffected
- File opens for both roles (RLS policy from migration 010 handles this)

---

## [2026-07-06] Fix Reviewer File Persistence + Storage RLS URL/Path Mismatch

### Status: Completed

### Root Cause
**Two bugs, no database schema issues (columns and bucket exist and are correct):**

- **Issue 1 (Reviewer file never persisted):** `uploadReviewerFile()` returned `{ fileUrl, fileName, fileSize }` but all three consumers (`reviewProgress`, `approveCompletion`, `rejectCompletion`) destructured `reviewerFile.url`, `.name`, `.size`. Because the Supabase JS client filters out `undefined` values from UPDATE payloads, the file URL/name/size were silently dropped — the file uploaded to storage but the reference was never saved to the tasks row.

- **Issue 2 (Bucket not found 404 on file open):** The `storage_read_own` RLS EXISTS subquery compared `storage.objects.name` (raw file path: `submissions/uid/task/file.pdf`) against `tasks.*_file_url` (full public URL: `https://.../storage/v1/object/public/uploads/submissions/uid/task/file.pdf`). These strings never match for non-owners, so `createSignedUrl()` fails the RLS check and returns "Bucket not found" 404. File owners were unaffected because the `owner_id = auth.uid()` check passes independently.

### Actual Changes Made
- Changed `uploadReviewerFile()` return shape from `{ fileUrl, fileName, fileSize }` to `{ url, name, size }` to match the parameter shape expected by `reviewProgress`, `approveCompletion`, and `rejectCompletion`.
- Created `components/migrations/010-fix-storage-rls-url-match.sql` — drops and rebuilds `storage_read_own` with `LIKE '%/uploads/' || storage.objects.name` suffix matching instead of `=` equality comparison.

### Files Touched
- `lib/api.ts` — `uploadReviewerFile()` return property names
- `components/migrations/010-fix-storage-rls-url-match.sql` (new) — RLS policy fix

### Migration File
- `components/migrations/010-fix-storage-rls-url-match.sql` — drops and rebuilds `storage_read_own` RLS policy with LIKE-based URL/path matching

### Verification
- Confirm reviewer file appears in employee's View Details after assigner attaches one
- Confirm employee's completion file opens for both employee and assigner
- Confirm reviewer file opens for both assigner and assignee
- Re-verify full task lifecycle (see regression checks below)

---

## [2026-07-04] Fix Reviewer File Display + "Bucket not found" Error

### Status: Completed

### Root Cause
- **Issue 1 (Reviewer file not showing):** `tasksAPI.getAll()` was missing `reviewAssignerFileUrl/Name/Size` camelCase aliases. Only `getUserTasks()` had them. The kanban board and any view using `getAll()` couldn't see reviewer files.
- **Issue 2 (Bucket not found):** `window.open(publicUrl, "_blank")` on a PRIVATE Supabase bucket sends a GET without auth headers. Supabase RLS rejects the request and returns a misleading "Bucket not found" 404. Fix: all file downloads now first generate a signed URL via `createSignedUrl(filePath, 3600)`.

### Actual Changes Made
- Added `reviewAssignerFileUrl/Name/Size` camelCase aliases to `tasksAPI.getAll()` mapping
- Added `tasksAPI.getSignedFileUrl()` utility that extracts the file path from a public URL and generates a 1-hour signed URL via `supabase.storage.from("uploads").createSignedUrl()`
- Updated both "Open" buttons in View Details (submission file + reviewer file) to call `getSignedFileUrl()` and then `window.open(signedUrl, "_blank")`

### Files Touched
- `lib/api.ts` — added `reviewAssignerFile*` aliases to `getAll()`; added `getSignedFileUrl()` utility
- `app/(workspace)/tasks/page.tsx` — replaced direct `window.open(publicUrl)` with `async getSignedFileUrl() → window.open(signedUrl)`

### Verification
- Confirm employee's completion file opens for both employee and assigner
- Confirm reviewer file appears in View Details and opens correctly
- Re-verify that 009 migration was run (columns `review_assigner_file_*` exist)

---

## [2026-07-04] Review File Access Fix + Reviewer Attachments + UI Overflow Fix

### Status: Completed

### Actual Changes Made
- **Problem 1 (RLS):** Rebuilt `storage_read_own` policy in `009-reviewer-file-rls-fix.sql` — now checks BOTH `tasks.submission_file_url` AND `tasks.review_assigner_file_url` columns, and allows access to file owner + task assignees (`ANY(assignee_ids)`) + task assigner (`assigned_by`). Scoped per-task via EXISTS subquery, not blanket access.
- **Problem 2 (Reviewer file):** Added 3 new DB columns (`review_assigner_file_url/name/size`). Added `uploadReviewerFile` API function (uploads to `uploads/reviews/` bucket path). Updated `reviewProgress`, `approveCompletion`, `rejectCompletion` to accept optional `reviewerFile` param. Added file input to assigner review modal. Approve & Reject buttons now both open the review modal with an optional file attachment field. Reviewer file shows in View Details alongside the submission file, visually distinct (amber-themed).
- **Problem 3 (UI overflow):** View Details `DialogContent` already had `max-h-[85vh] overflow-y-auto`. Added `min-w-0`, `truncate`, and `flex-shrink-0` to file display items to prevent horizontal overflow. File items now render as compact rows with icon + truncated filename + Open button.

### Files Touched
- `components/migrations/009-reviewer-file-rls-fix.sql` (new) — schema columns + rebuilt storage RLS policy
- `lib/api.ts` — `uploadReviewerFile`, updated `reviewProgress`/`approveCompletion`/`rejectCompletion`, camelCase aliases for reviewer file columns
- `lib/types.ts` — added `review_assigner_file_*` columns to Row/Insert/Update types
- `lib/firebase-types.ts` — added camelCase aliases for reviewer file
- `app/(workspace)/tasks/page.tsx` — assigner review modal: file input, `assignerFile`/`assignerAction` state, 3-action footer; View Details: reviewer file display; Approve button opens review modal

### Migration File
- `components/migrations/009-reviewer-file-rls-fix.sql` — adds reviewer file columns + drops & rebuilds storage_read_own RLS policy to include assigner + reviewer file column

### Regression Checks
- Start task: unchecked, no changes to `startTask` or its UI
- Submit progress review: unchecked, no changes to `submitProgressReview` or its modal
- Submit completion review: unchecked, no changes to `submitCompletionReview` or its modal
- Assigner approve completion: changed — now opens review modal with optional file, then calls `approveCompletion`
- Assigner reject completion: changed — now accepts optional file via `rejectCompletion`
- Only assigner can complete: unchecked, RLS `task_update_completed_guard` untouched

---

## [2026-07-04] Task Review Workflow Refactor + UI Cleanup

### Status: Completed

### Actual Changes Made
- **Schema migration** (`components/migrations/008-review-workflow-schema.sql`): Added `review_notes`, `review_assigner_notes`, `review_progress` columns. Expanded status CHECK constraint to include `pending_review` and `pending_completion_review`. Added RLS `task_update_completed_guard` policy that prevents non-assigners from setting status to `completed`. Also drops the stale `tasks_project_id_required` constraint.
- **API layer** (`lib/api.ts`): Added 8 new `tasksAPI` functions — `startTask`, `submitProgressReview`, `reviewProgress`, `submitCompletionReview`, `uploadCompletionFile`, `approveCompletion`, `rejectCompletion`. `submitCompletionReview` enforces backend file requirement (throws if no fileUrl). `approveCompletion` transitions to `completed` status. Moved status filter dropdown to include new statuses.
- **Task card redesign** (`app/(workspace)/tasks/page.tsx`): Reduced to exactly 2 buttons — "View Details" + "Submit for Review". Removed the old "Submit Task" button, old Done/Start/Review inline buttons, old submission toggle, old approve/reject inline. Clean monochrome palette with dark header, border-based cards, priority-colored left accent bar, inline progress bar. Removed the old `updateTaskStatus`, `handleToggleSubmission`, `handleApproveTask`, `handleRejectTask`, `handleOpenSubmissionDialog`, `handleSubmitTask` functions — all replaced by the new workflow.
- **View Details modal**: Shows progress ring (SVG circle), assigner notes, progress notes, submission file with download. "Start Task" button visible when status=todo and user is assignee. Assigner sees "Review Progress" or "Approve & Complete" buttons depending on task status. Only assigner can see the complete button.
- **Submit for Review modal**: Two visually distinct options — "Progress Update" (no file, notes required) and "Completion Review" (file required, notes optional). Completion file input shows red warning text until a file is attached. Submit button disabled without file for completion.
- **Assigner review modal**: Progress slider (0-100%) with assignee's notes displayed, feedback textarea, "Set Progress" button. Rejection flow: feedback textarea + "Reject & Return" button sending task back to in_progress.
- **Dashboard loading fix**: Added `initialLoad` state — shows a 6-card skeleton grid on first mount instead of a blank spinner. Tasks fetch immediately on mount; subsequent fetches skip the skeleton. Loading state still works for the filtered view.
- **Only assigner can complete**: Enforced at API level (`approveCompletion` is the only path to `completed` status) and at RLS level (`task_update_completed_guard` WITH CHECK policy). The assignee UI has no complete action anywhere.

### Files Touched
- `components/migrations/008-review-workflow-schema.sql` (new) — review columns + status constraint + RLS guard
- `lib/api.ts` — 8 new review functions in tasksAPI, updated status filter options
- `app/(workspace)/tasks/page.tsx` — full redesign (~420 lines replaced entirely)

### Migration File
- `components/migrations/008-review-workflow-schema.sql` — adds `review_notes`, `review_assigner_notes`, `review_progress` columns; expands status CHECK; adds RLS guard; drops stale project_id constraint

### Notes / Follow-ups
- The migration must be run manually: https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
- The SQL attempts to handle inline vs separate constraint naming for `status CHECK` — if the live DB uses a system-generated name, the second DO block should catch it
- After running the migration, verify: lead creates task assign to employee → employee starts task → submits progress → lead reviews/sets % → employee submits completion with file → lead approves → task shows Completed

---

### Status: Completed

### Root Cause
**Two issues:**
1. **Missing columns** — `assignee_ids`, `assignee_names`, `viewer_ids`, `viewer_names` array columns never created (fixed by 006-multi-assignee-schema.sql)
2. **Stale CHECK constraint** — `tasks_project_id_required` CHECK constraint was enforcing `project_id IS NOT NULL`, but the app passes `null` when no project is selected. Tasks don't actually require a project — this constraint was a leftover from an earlier schema version.

### Actual Changes Made
- Created `components/migrations/006-multi-assignee-schema.sql` — adds the 4 missing array columns, backfills existing data, creates GIN indexes, creates `get_user_role()` function and `tasks_with_visibility` view
- Created `components/migrations/007-drop-project-id-constraint.sql` — drops the stale `tasks_project_id_required` CHECK constraint from the tasks table
- Updated error handling in `lib/api.ts` — now uses JSON.stringify + Object.getOwnPropertyNames to properly capture non-enumerable Supabase error properties; added specific handlers for error codes 42703 (missing column), PGRST116 (RLS rejection), and 23514 (CHECK constraint violation for project_id)
- Fixed frontend error handling in `app/(workspace)/tasks/page.tsx` — surfaces actual `error.message` in toast instead of generic "Failed to create task"

### Files Touched
- `components/migrations/006-multi-assignee-schema.sql` (new)
- `components/migrations/007-drop-project-id-constraint.sql` (new)
- `lib/api.ts` — improved error logging + constraint/project_id error handler
- `app/(workspace)/tasks/page.tsx` — surfaced actual error message in toast

### Migration Files
- `components/migrations/006-multi-assignee-schema.sql` — multi-assignee columns + get_user_role() function + indexes + view
- `components/migrations/007-drop-project-id-constraint.sql` — drops tasks_project_id_required CHECK constraint

---

## [2026-07-04] Seed script — create test users for all roles

### Status: Completed

### Actual Changes Made
- Expanded `scripts/seed-initial-users.ts` from 1 user (CEO) to 4 users (CEO, C_LEVEL, LEAD, EMPLOYEE)
- All four users are in the same Engineering department (except CEO in Executive) so they can see each other in chat, tasks, and team views
- Made passwords simple and uniform (`TestPass123!`) for local testing
- Added idempotency: script skips users that already exist (checked by email in the `users` table)
- Added `--force` flag to delete + recreate all four if needed
- Added `npm run seed-users` already existed in package.json — no change needed

### Files Touched
- `scripts/seed-initial-users.ts` — expanded from 1 CEO to 4 test users across all roles

---

## [2026-07-04] Full Technical Documentation — Chat, Teams, Files Modules

### Status: Completed

### Prompt / Request Summary
Produce airtight documentation (CHAT.md, TEAMS.md, FILES.md) covering data models, backend logic, realtime behavior, frontend logic, permissions matrices, and edge cases for all three modules.

### Actual Changes Made
- Explored all chat, team, and file code across the codebase (tables, RLS policies, API functions, UI components, migration SQL files)
- Wrote CHAT.md: documents `chat_messages` and `chat_groups` tables, all 7 chat API functions, the monolithic 936-line chat page, 10-second polling (no Supabase Realtime), hard 50-message limit, weak SELECT policy conflict in `add-select-policies.sql`, missing features (reactions, attachments, editing, threading, typing indicators)
- Wrote TEAMS.md: documents `teams` and `departments` tables, conflicting SQL schema versions, all 12 teams API functions, 5 team UI pages/components. Flags critical finding: RLS allows ANY authenticated user to CRUD teams (frontend-only security). Documents design confusion between three "team" concepts (teams table, project teams, workload dashboard)
- Wrote FILES.md: documents both storage buckets (`uploads`, `vault`), all storage RLS policies, `vault_items` table, task submission file flow, vault access control. Flags that `/files` page is a non-functional mock with dead Firebase code. Documents `chat_messages.attachments` as type-only artifact (no SQL column exists)
- Updated this CHANGES.md entry with actual changes

### Files Touched
- `CHAT.md` (new) — full chat module documentation
- `TEAMS.md` (new) — full team management documentation
- `FILES.md` (new) — full files module documentation

### Notes / Follow-ups
- The `add-select-policies.sql` weak chat_messages SELECT policy (`group_id IS NOT NULL`) needs review — if active, all auth users can read all group messages regardless of membership
- The `/files` page needs a full rewrite to use Supabase Storage instead of dead Firebase code
- Multiple RLS policies are permissive (any auth user can CRUD) — role enforcement is frontend-only for teams, departments, announcements, and warnings
- `chat_messages.attachments` type exists in TypeScript but no SQL column — either implement or remove from types

## [RETROACTIVE] Task Visibility Rules (RLS + API Layer)

### Status: Completed

### Reconstructed from Codebase
The task visibility system was implemented across database RLS policies and the `tasksAPI` client layer, replacing a simple "all authenticated users can read all tasks" model with role-based visibility.

### Actual Changes Made

**Database (RLS Policies via 001-task-module-overhaul.sql):**
- Dropped 5 old permissive policies (`Authenticated users can read/update/delete tasks`, `Tasks readable by all`)
- Created 6 new RLS policies on `tasks` table:
  - `task_read_own` — users can read tasks where their `auth.uid()` appears in `assignee_ids[]` OR `viewer_ids[]`
  - `task_read_assigned` — CEO/C_LEVEL/LEAD can read tasks they assigned (`assigned_by = auth.uid()`)
  - `task_read_clevel` — CEO/C_LEVEL can read tasks assigned TO them by other C-Level
  - `task_insert` — only CEO/C_LEVEL/LEAD can create tasks (as `assigned_by`)
  - `task_update` — assigner can always update; assignee can update only when `submission_open = true`
  - `task_delete` — only the assigner can delete
- Created helper function `public.get_user_role(user_uid text)` for RLS role checks

**API Layer (lib/api.ts — tasksAPI.getUserTasks):**
- CEO/C_LEVEL: sees tasks they assigned (`assigned_by.eq.{userId}`) OR tasks assigned TO them by others (`assignee_ids.cs.{userId} AND assigned_by.not.eq.{userId}`)
- LEAD: sees tasks they assigned OR tasks assigned to them (`or(assigned_by.eq, assignee_ids.cs)`)
- EMPLOYEE: sees tasks where they're in `assignee_ids[]` OR `viewer_ids[]`
- Non-manager roles limited to only their own tasks via `contains('assignee_ids', [userId])` in `tasksAPI.getAll`

### Migration File
- `components/migrations/001-task-module-overhaul.sql` — combined Phase 1 (schema) + Phase 2 (RLS rewrite)
- `components/migrations/001-task-module-schema.sql` — Phase 1 schema only (subset of combined file)

### Notes / Follow-ups
- RLS `task_read_clevel` policy overlaps with `task_read_own` — both grant access when user is in `assignee_ids[]`. The C-Level policy exists as a separate statement for clarity/safety.
- No middleware-level authorization exists; all visibility enforcement is at the database (RLS) and API client layers.

---

## [RETROACTIVE] Task Submission Requires File Upload

### Status: Completed

### Reconstructed from Codebase
Task submission/complete flow enforces a file upload before marking a task as submitted.

### Actual Changes Made

**Frontend (app/(workspace)/tasks/page.tsx):**
- The "Submit Task" / "Resubmit" button opens a `submissionDialogOpen` dialog (`handleOpenSubmissionDialog`)
- `handleSubmitTask` requires both `submittingTaskId` and `submissionFile` — button is disabled if `!submissionFile`
- File is uploaded via `tasksAPI.uploadSubmissionFile()` which:
  - Validates file type (PDF, DOC, DOCX, PNG, JPEG, GIF) and size (10MB max)
  - Uploads to `uploads` storage bucket at path `submissions/{userId}/{taskId}/{timestamp}_{filename}`
  - Retrieves the public URL
  - Calls `tasksAPI.submitTask()` to set `submission_file_url`, `submission_file_name`, `submission_file_size`, and `submission_status = 'submitted'`

**API Layer (lib/api.ts — tasksAPI.submitTask):**
- Requires three params: `id`, `fileUrl`, `fileName`, `fileSize` — all mandatory
- Sets `submission_status = 'submitted'` atomically with file metadata

**API Layer (lib/api.ts — tasksAPI.uploadSubmissionFile):**
- Validates file type against ALLOWED_TYPES array
- Validates file size against MAX_SIZE (10MB)
- Uploads to Supabase Storage, then calls `submitTask()` with the resulting URL

**Enforcement:** Frontend-only. There is no database-level CHECK constraint preventing `submission_status = 'submitted'` without a `submission_file_url`. The RLS `task_update` policy allows the assignee to update when `submission_open = true` — it doesn't validate that a file is present.

### Files Touched
- `app/(workspace)/tasks/page.tsx` — submission dialog, file upload UI, handleSubmitTask
- `lib/api.ts` — tasksAPI.submitTask(), tasksAPI.uploadSubmissionFile()

### Notes / Follow-ups
- **The file-upload requirement is frontend-only.** A direct API call to `tasksAPI.submitTask()` or a direct Supabase update could set `submission_status = 'submitted'` without a file. Consider adding a CHECK constraint or a database trigger to enforce this at the database level.
- The `uploads` bucket RLS in `002-storage-fixes.sql` restricts read access to file owners and task assignees, but the bucket itself needs to be manually set to PRIVATE in the Supabase dashboard (noted in that migration).

---

## [RETROACTIVE] Deadline-Passed Submission Toggle Control

### Status: Completed

### Reconstructed from Codebase
Task assignors (CEO/C_LEVEL/LEAD) can manually open or close the submission window for tasks they assigned, regardless of whether the deadline has passed.

### Actual Changes Made

**Schema (via 001-task-module-overhaul.sql):**
- Added `submission_open BOOLEAN DEFAULT true` column to `tasks` table
- Default is `true` — submissions are open by default when a task is created

**RLS (via 001-task-module-overhaul.sql):**
- `task_update` policy allows the assignee to update the task only when `submission_open = true`
- When `submission_open = false`, the assignee's RLS UPDATE permission is denied — they cannot modify the task at all (including cannot submit)

**API Layer (lib/api.ts — tasksAPI.toggleSubmission):**
- `toggleSubmission(id, open)` — sets `submission_open` to true/false

**Frontend (app/(workspace)/tasks/page.tsx):**
- Only visible to the task's `assignedBy` (assignor)
- Rendered as a toggle button with ToggleRight (Open) / ToggleLeft (Closed) icons
- Green styling when open, red styling when closed
- Label text: "Submissions:" followed by "Open" or "Closed"
- Calls `tasksAPI.toggleSubmission(taskId, !currentOpen)` on click

**Frontend (app/(workspace)/tasks/page.tsx — submit button):**
- The "Submit Task" button is disabled when `!task.submissionOpen` OR `task.submissionStatus === "approved"` OR the user is already updating
- When closed, the button appears greyed out with the disabled state

**Enforcement:** Two-tier — RLS prevents the assignee from updating when `submission_open = false` (database-level), and the frontend disables the submit button.

### Files Touched
- `lib/api.ts` — tasksAPI.toggleSubmission()
- `app/(workspace)/tasks/page.tsx` — handleToggleSubmission, submission toggle UI, submit button disabled logic
- `components/migrations/001-task-module-overhaul.sql` — submission_open column + task_update RLS policy

### Notes / Follow-ups
- The toggle is a manual control — there is no automatic deadline-based closing. The assignor must manually toggle `submission_open` to close submissions after the deadline passes.
- The toggle does not distinguish between "deadline hasn't passed yet" and "deadline has passed." It's a pure on/off switch controlled by the assignor at any time.

---

## [RETROACTIVE] Deadline Email Reminders

### Status: Completed

### Reconstructed from Codebase
A Supabase Edge Function sends email notifications via SendGrid when tasks pass their deadline without being approved.

### Actual Changes Made

**Edge Function (components/supabase/functions/send-deadline-notifications/index.ts):**
- Runs on Supabase's cron scheduler (intended interval: every 5 minutes, per code comment)
- Written as a Deno Deploy Edge Function using `Deno.serve()`
- **Query:** Finds tasks where `due_datetime < now()`, `submission_status != 'approved'`, AND `notified = false`
- **Recipients:** Collects both the assignor (`assigned_by`) and all assignees (`assignee_ids[]`) — deduplicates with `new Set()`
- Fetches email addresses from the `users` table for all recipient IDs
- Sends a single email via SendGrid to all recipients with subject `Overdue Task: "{title}"`
- Email body includes: task title, formatted due date (with weekday, date, time), submission status, and assignor name
- After successful send, marks `notified = true` on the task (so it won't re-notify on the next run)
- Returns JSON with `{ processed, failed, total }` counts

**Schema (via 001-task-module-overhaul.sql):**
- Added `notified BOOLEAN DEFAULT false` column to `tasks` table — tracks whether an overdue notification has been sent

**API Layer (lib/api.ts — tasksAPI.getOverdueTasks):**
- Queries tasks where `due_datetime < now()`, `submission_status != 'approved'`, and `notified = false`
- Used for programmatic access to overdue tasks (but the Edge Function queries independently)

### Files Touched
- `components/supabase/functions/send-deadline-notifications/index.ts` — the Edge Function (134 lines)
- `lib/api.ts` — tasksAPI.getOverdueTasks()
- `components/migrations/001-task-module-overhaul.sql` — `notified` column

### Notes / Follow-ups
- **Both parties are notified** — the edge function sends to `assignee + assignor` together in one email (all recipients in the `to` field). Confirmed in code: `recipientIds = [...new Set([task.assigned_by, ...task.assignee_ids])]`.
- **Only overdues trigger emails** — there is no "approaching deadline" reminder implemented. Only tasks that have already passed `due_datetime` are picked up.
- The Edge Function must be deployed to Supabase and a cron schedule configured manually in the Supabase dashboard. The file itself states "Runs every 5 minutes via Supabase cron" but this is a deployment-time configuration, not code-enforced.
- Environment variables required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (defaults to `noreply@finovasolutions.tech`).
- The `notified` flag is never reset — once a task is notified, it won't be re-notified even if the deadline passes further. If the task is later rejected and the deadline still hasn't passed, no new notification will fire.
- The `sendEmailReminder` checkbox in the calendar event creation UI ("Send email reminder 15 minutes before meeting") is separate from this deadline notification system — it applies to calendar events, not tasks.

---

## [RETROACTIVE] Due Time Added to Tasks (date+time instead of date-only)

### Status: Completed

### Reconstructed from Codebase
A `due_datetime TIMESTAMPTZ` column was added to the `tasks` table, and the entire task creation/edit/display pipeline was updated to use date+time instead of date-only.

### Actual Changes Made

**Schema (via 001-task-module-overhaul.sql):**
- Added `due_datetime TIMESTAMPTZ` column to `tasks` table
- Backfilled existing `due_date` values: `due_datetime = due_date at 23:59:59 UTC` for rows where `due_date IS NOT NULL AND due_datetime IS NULL`
- Added index `idx_tasks_due_datetime ON tasks(due_datetime) WHERE submission_status != 'approved'`

**TypeScript Types (lib/types.ts):**
- Added `due_datetime: string | null` to `tasks.Row`, `tasks.Insert`, `tasks.Update`

**API Layer (lib/api.ts):**
- `createTask()` — accepts `dueDatetime` / `due_datetime`, constructs `new Date(\`${dueDate}T${dueTime}:00\`).toISOString()` for combined date+time, or falls back to `dueDate + 23:59:59` if only date is provided
- `update()` — accepts `dueDatetime` and maps it to `due_datetime` in the update payload
- `getAll()` / `getUserTasks()` — maps `due_datetime` to camelCase `dueDatetime` in returned objects
- `getOverdueTasks()` — compares `due_datetime` (not `due_date`) against `new Date().toISOString()`

**Frontend — Task Creation Dialog (app/(workspace)/tasks/page.tsx):**
- Added a `dueTime` field to `newTask` state (type: `string`, HTML time input)
- Two side-by-side inputs in the create dialog: Date picker (`dueDate`) + Time picker (`dueTime`)
- `handleCreateTask()` merges them: `new Date(\`${dueDate}T${dueTime}:00\`).toISOString()` → sent as `due_datetime`
- If no time is selected but date is, falls back to midnight (`T23:59:59`)

**Frontend — Task Cards (app/(workspace)/tasks/page.tsx):**
- `getDueDisplay(task)` — renders `dueDatetime` if present (format: `MMM d, h:mm a`), falls back to `dueDate` (format: `MMM d`)
- Card badge shows due datetime with `CalendarIcon` when either `due_date` or `dueDatetime` exists

**Edge Function (components/supabase/functions/send-deadline-notifications/):**
- Selects `due_datetime` from tasks, compares against `new Date().toISOString()`
- Formats the due date in email using `toLocaleString()` with `hour: '2-digit', minute: '2-digit'`

### Files Touched
- `lib/types.ts` — due_datetime column types
- `lib/api.ts` — createTask, update, getAll, getUserTasks, getOverdueTasks
- `app/(workspace)/tasks/page.tsx` — newTask.dueTime state, create dialog inputs, getDueDisplay, TaskCard
- `components/migrations/001-task-module-overhaul.sql` — due_datetime column, backfill, index
- `components/supabase/functions/send-deadline-notifications/index.ts` — due_datetime query + display

### Notes / Follow-ups
- The old `due_date` column was NOT dropped — both `due_date` and `due_datetime` coexist. Code falls back to `due_date` when `due_datetime` is null.
- Task edit dialog does not appear to expose the due time field for editing — only the create dialog has the time input. Confirmed in the updateTask path: it accepts `dueDatetime` in the API but no UI to change it after creation.

---

## [RETROACTIVE] Calendar Due-Time Display Changes

### Status: Completed

### Reconstructed from Codebase
The calendar was rebuilt with a new `calendar_events` table schema, meeting link support, role-restricted event creation, and a rich event creation dialog. The due-time work from the tasks module does NOT directly integrate with the calendar — tasks and calendar events are separate entities with no cross-linking.

### Actual Changes Made

**Calendar Schema Rebuild (create-calendar-events-table.sql):**
- Recreated `calendar_events` table with richer fields: `organizer_id`, `organizer_name`, `organizer_email`, `attendees[]`, `invited_member_ids[]`, notification flags (`send_calendar_invite`, `send_email_reminder`, `add_to_google_calendar`, `notify_on_dashboard`)
- Uses `start_time` and `end_time` as `TIMESTAMPTZ` (always included time)

**Meeting Link Addition (005-calendar-add-meeting-link.sql):**
- Added `meeting_link TEXT` column to `calendar_events`

**RLS Fix (004-meetings-rls-fix.sql):**
- Replaced open "Users can create/update/delete own events" policies with role-restricted ones
- Only CEO, C_LEVEL, and LEAD can create, update, or delete calendar events
- Must be the `organizer_id` of the event

**Frontend (app/(workspace)/calendar/page.tsx):**
- Full calendar page with month/week/day views
- Event creation dialog restricted to CEO/C_LEVEL/LEAD roles
- Meeting type events include: email invite (To/CC via SendGrid), Google Calendar integration (OAuth2), dashboard notification to invited members, "Invite Team Members" section with checkbox grid of all users
- Event listing shows time (`start_time` formatted via `formatTime()`) in month cell chips and day view cards
- Meeting link field in event creation form
- Event details dialog with gradient header, time display, attendee list

**API Routes:**
- `/api/send-meeting-invite` — sends meeting invitations via SendGrid with ICS attachment
- `/api/google-calendar/add-event` — adds events to Google Calendar via OAuth2 (falls back to mock if credentials not configured)

### Files Touched
- `app/(workspace)/calendar/page.tsx` — full calendar page (~1282 lines)
- `lib/api.ts` — calendarEventsAPI (getAll, createEvent, updateEvent, deleteEvent)
- `lib/types.ts` — calendar_events Row/Insert/Update types
- `app/api/send-meeting-invite/route.ts` — SendGrid email invite endpoint
- `app/api/google-calendar/add-event/route.ts` — Google Calendar integration

### Migration Files
- `create-calendar-events-table.sql` — calendar_events table (re)creation
- `components/migrations/004-meetings-rls-fix.sql` — role-restricted event creation/deletion
- `components/migrations/005-calendar-add-meeting-link.sql` — meeting_link column

### Notes / Follow-ups
- **Tasks and calendar are NOT connected** — changing a task's due datetime does not create or update calendar events. The "calendar due-time display" requested in the spec refers to the calendar showing its own event times (which it always did via `start_time`/`end_time`), not to task due times appearing on the calendar.
- Calendar events use `start_time`/`end_time` (always timestamps with time), not a separate date+time field — there was never a date-only calendar event.
- The "Send email reminder 15 minutes before meeting" checkbox in the UI is aspirational — there's no actual 15-minute reminder cron/edge function implemented. The checkbox controls the `send_email_reminder` boolean stored on the event but no automation consumes it.
- Google Calendar integration requires `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` env vars — if absent, it falls back to a mock response.

---

## [RETROACTIVE] Vault Feature — Secure Company Asset Storage

### Status: Completed

### Reconstructed from Codebase
A "Vault" section was added for securely storing sensitive company assets (documents, API keys, passwords, other). Access is restricted to CEO and C_LEVEL roles.

### Actual Changes Made

**Database (via components/migrations/003-vault-module.sql):**
- Created `vault_items` table:
  - `title TEXT NOT NULL`
  - `category TEXT NOT NULL CHECK (IN ('document','api_key','password','other'))`
  - `description TEXT`, `text_value TEXT` (for non-document items)
  - `file_url TEXT`, `file_name TEXT`, `file_size INTEGER` (for documents)
  - `created_by TEXT NOT NULL`, `created_by_name TEXT`
  - Timestamps: `created_at`, `updated_at`
- RLS policies on `vault_items`:
  - `vault_read` — SELECT only for CEO/C_LEVEL
  - `vault_insert` — INSERT only for CEO/C_LEVEL
  - `vault_update` — UPDATE only for CEO/C_LEVEL AND `created_by = auth.uid()` (only update own items)
  - `vault_delete` — DELETE only for CEO/C_LEVEL AND `created_by = auth.uid()` (only delete own items)
- Storage RLS for the `vault` bucket:
  - `vault_storage_read` — SELECT only CEO/C_LEVEL from vault bucket
  - `vault_storage_insert` — INSERT only CEO/C_LEVEL to vault bucket
  - `vault_storage_delete` — DELETE only CEO/C_LEVEL from vault bucket

**TypeScript Types (lib/types.ts):**
- Full `vault_items` table types with Row/Insert/Update

**API Layer (lib/api.ts — vaultAPI):**
- `getAll()` — lists all vault items (RLS enforces CEO/C_LEVEL)
- `create()` — creates text-only vault items (API keys, passwords, other)
- `uploadFile()` — validates file type/size, uploads to `vault` storage bucket, creates vault item with file metadata
- `update()` — updates title, category, description, text_value
- `delete()` — deletes vault item AND removes associated file from storage
- `getSignedUrl()` — generates 60-second signed URL for secure file download (vault bucket is private)

**Frontend (app/(workspace)/vault/page.tsx):**
- Full page with: hero header, search, category tabs (All/Documents/API Keys/Passwords/Other), add/edit dialog
- Add dialog supports: Document upload (file picker with type/size validation) OR text entry (for API keys, passwords, other)
- Document items show a download button (uses signed URL)
- API key/password items show "Click to Reveal" toggle with eye icon, masked by default
- Edit and delete actions restricted to the item's creator (`canManage = item.created_by === user?.id`)
- Delete confirmation dialog with warning text

**Sidebar Navigation (components/admin-layout.tsx):**
- Vault link (with `Lock` icon) appears in the sidebar only for CEO and C_LEVEL roles
- Listed under "Administration" section

**Access Control (app/(workspace)/vault/page.tsx):**
- On load, if `!isCLevel` (user.role not CEO or C_LEVEL), immediately redirects to `/dashboard`
- Returns `null` (blank page) if not C_LEVEL

### Files Touched
- `app/(workspace)/vault/page.tsx` — full vault page (~475 lines)
- `lib/api.ts` — vaultAPI (getAll, create, uploadFile, update, delete, getSignedUrl)
- `lib/types.ts` — vault_items table types
- `components/admin-layout.tsx` — sidebar Vault nav link for CEO/C_LEVEL
- `components/migrations/003-vault-module.sql` — vault_items table + RLS + storage policies

### Migration File
- `components/migrations/003-vault-module.sql` — table creation, RLS, storage RLS

### Notes / Follow-ups
- **Access is CEO and C_LEVEL, not "cPanel"** — the original spec mentioned "cPanel accounts" but the implementation restricts vault access to `CEO` and `C_LEVEL` roles via RLS and frontend guards. There is no "cPanel" role in the system.
- The `vault` storage bucket must be manually created as PRIVATE in the Supabase dashboard (noted in the migration SQL comments).
- Items in `text_value` are stored as plaintext in the database — there is no encryption at rest. The "security" is purely access-control (RLS + frontend reveal/hide toggle).
- Only the item creator can edit or delete vault items (enforced by RLS `created_by = auth.uid()` check and frontend `canManage()` check).
- Signed URLs for document downloads expire after 60 seconds.
