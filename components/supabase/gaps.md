# Schema–Code Gaps

> The difference between what the database supports and what the frontend code actually uses.

---

## Gap 1: 10 Undocumented Task Columns

The `tasks` table has 29 columns. The `tasksAPI` in `lib/api.ts` reads/writes only 19.

| Column | Type | Purpose | Status |
|---|---|---|---|
| `is_phased` | boolean | Phased task workflow | Not read, not written |
| `milestone_count` | integer | Auto-calculated by trigger | Not read (trigger maintains it) |
| `start_date` | timestamptz | Task start date | Column exists but never set by API |
| `assignment_attachment_id` | text | Manager upload — ID | Not read, not written |
| `assignment_attachment_name` | text | Manager upload — filename | Not read, not written |
| `assignment_attachment_url` | text | Manager upload — URL | Not read, not written |
| `assignment_attachment_download_url` | text | Manager upload — download | Not read, not written |
| `submission_attachment_id` | text | Employee submission — ID | Not read, not written |
| `submission_attachment_name` | text | Employee submission — filename | Not read, not written |
| `submission_attachment_url` | text | Employee submission — URL | Not read, not written |
| `submission_attachment_download_url` | text | Employee submission — download | Not read, not written |

**Impact:** Tasks can have file attachments (assignment from manager, submission from employee) and phased workflows at the database level, but the API and UI don't surface any of this.

---

## Gap 2: Teams Can Link to Projects (But Code Ignores It)

| Column | In Schema? | In API? |
|---|---|---|
| `teams.project_id` | ✅ Yes (uuid, nullable) | ❌ Not read or written |
| `teams.project_name` | ✅ Yes (text, nullable) | ❌ Not read or written |

The database supports project-scoped teams. The `teamsAPI.create()`, `teamsAPI.update()`, and all read functions ignore these columns entirely.

---

## Gap 3: Four Tables with Zero API Coverage

| Table | RLS Quality | Infrastructure | Missing |
|---|---|---|---|
| `task_milestones` | ✅ Well-designed | Function, trigger, RLS all ready | No API module, no UI |
| `files` | ✅ Properly scoped | RLS ready, storage bucket exists with 5 folders | No API module, `/files` is placeholder page |
| `files_department_shares` | ✅ Granular role-based | RLS ready | No API module, no UI |
| `activity_logs` | ✅ Well-designed | RLS + trigger auto-updates `users.last_active` | No API module, no dashboard reads it |

These tables have full schema definitions, RLS policies, triggers, and in the case of files, a storage bucket with organized folders. They're ready to use — just missing the code.

---

## Gap 4: 5 Database Functions — None Called from Code

| Function | Used by RLS? | Used by trigger? | Used by code? |
|---|---|---|---|
| `calculate_milestone_progress` | No | No | **No** |
| `is_user_assigned_to_task` (2-param) | Yes | No | **No** |
| `is_user_assigned_to_task` (3-param) | Yes | No | **No** |
| `update_task_milestone_count` | No | Yes | **No** |
| `update_user_last_active` | No | Yes | **No** |

Two are trigger-only (run automatically), two are RLS-only (enforce security), and `calculate_milestone_progress` is completely unused — yet it's the most useful for the frontend. It can be called via:

```typescript
const { data } = await supabase.rpc('calculate_milestone_progress', { p_task_id: taskId })
```

---

## Gap 5: teams.leader_id — No FK Constraint

The `teams.leader_id` column is plain text with no foreign key constraint to users.uid. Relationships are enforced only in application logic, not at the database level. If a user is deleted, the leader_id becomes a dangling reference.

---

## Gap 6: Storage vs Database Mismatch

The `uploads` storage bucket has 5 organized folders, suggesting a file management system was planned. The `files` and `files_department_shares` tables have proper RLS. But:
- No `filesAPI` module exists in `lib/api.ts`
- The `/files` page is a placeholder
- The storage bucket is **PUBLIC** with zero policies — files are unprotected at the storage layer

---

## Summary: Dead Infrastructure Value

The database is more advanced than the codebase. These unused features represent **already-built backend infrastructure** that just needs frontend API modules and UI pages:

| Feature | Infrastructure Effort | Code Effort Needed |
|---|---|---|
| Task file attachments | 0 (columns exist, bucket exists) | API module + UI component |
| Task milestones/subtasks | 0 (schema + fn + trigger + RLS ready) | API module + UI page |
| File management | 0 (schema + RLS + bucket + folders ready) | API module + UI page |
| Activity/audit logs | 0 (schema + RLS + trigger ready) | API module + CEO dashboard widget |
| Task phased workflow | 0 (is_phased column exists) | API update + UI toggle |
| Project-scoped teams | 0 (project_id column exists) | API update (2 lines) |
