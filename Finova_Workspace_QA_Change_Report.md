<![CDATA[<div align="center">

# FINOVA WORKSPACE
## Quality Assurance — Complete Change Report

**Document Version:** 1.0  
**Date Prepared:** 21 July 2026  
**Prepared By:** Architecture & Planning Team  
**Classification:** Internal — QA Team Distribution  

---

*This document catalogs every modification made to the Finova Workspace codebase, organized by functional area. Each entry includes the root cause, files touched, and a verification checklist for QA regression testing.*

</div>

---

## Table of Contents

| # | Section | Page |
|---|---------|------|
| 1 | [Executive Summary](#1-executive-summary) | — |
| 2 | [Design System & Theme](#2-design-system--theme) | — |
| 3 | [Authentication & Login](#3-authentication--login) | — |
| 4 | [Task Management — Core Workflow](#4-task-management--core-workflow) | — |
| 5 | [Task Management — UI & Validation](#5-task-management--ui--validation) | — |
| 6 | [Milestone System](#6-milestone-system) | — |
| 7 | [File Upload & Storage](#7-file-upload--storage) | — |
| 8 | [Vault Module](#8-vault-module) | — |
| 9 | [Calendar Module](#9-calendar-module) | — |
| 10 | [C-Level Dashboard](#10-c-level-dashboard) | — |
| 11 | [Database Migrations](#11-database-migrations) | — |
| 12 | [Documentation & Tooling](#12-documentation--tooling) | — |
| 13 | [Build & Syntax Fixes](#13-build--syntax-fixes) | — |
| 14 | [Complete File Impact Matrix](#14-complete-file-impact-matrix) | — |
| 15 | [Master Regression Checklist](#15-master-regression-checklist) | — |

---

## 1. Executive Summary

Over the course of development sessions spanning **July 4 – July 19, 2026**, the Finova Workspace underwent **40+ discrete changes** across the following areas:

| Area | Changes | Severity |
|------|---------|----------|
| Task Workflow (reviews, submissions, approvals) | 12 | Critical |
| Milestone System (schema, UI, enforcement) | 8 | Critical |
| UI/UX Redesigns (dark theme standardization) | 7 | Medium |
| File Upload & Storage (RLS, consolidation) | 5 | High |
| Vault Module (creation + fixes) | 4 | Medium |
| Calendar Module (creation + redesign) | 3 | Medium |
| Authentication & Login | 2 | Low |
| Database Migrations | 6 | Critical |
| Build/Syntax Fixes | 3 | Blocker |
| Documentation | 1 | Informational |

**Key Technology Stack:**
- **Frontend:** Next.js (App Router), React, TypeScript, TailwindCSS, Framer Motion, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Email:** SendGrid API
- **Calendar Integration:** Google Calendar OAuth2

**Design System Colors:**
| Token | Value | Usage |
|-------|-------|-------|
| Page Background | `#0B0F1A` | All page backgrounds |
| Card Surface | `#121826` | Cards, modals, panels |
| Inset Surface | `#0F1523` | Nested containers |
| Border | `rgba(255,255,255,0.06)` | All borders |
| Primary Text | `#F1F5F9` | Headings, values |
| Secondary Text | `#CBD5E1` | Labels, descriptions |
| Muted Text | `#64748B` | Timestamps, hints |
| Accent Blue | `#3B82F6` | Primary actions |
| Accent Purple | `#8B5CF6` | Completion actions |
| Accent Amber | `#FBBF24` | Warning states |

---

## 2. Design System & Theme

### 2.1 Task Panel Visual Redesign
**Date:** 2026-07-07  
**Files:** `app/(workspace)/tasks/page.tsx`, 7 new component files in `components/tasks/`

The entire task management interface was rebuilt from scratch with a premium dark theme. This was a **pure visual/layout restyle** — zero functional changes. Every button calls the same handler, every form submits identical data.

**New Shared Components Created:**

| Component | File | Purpose |
|-----------|------|---------|
| StatusPill | `components/tasks/status-pill.tsx` | Tinted badge per task status |
| PriorityPill | `components/tasks/priority-pill.tsx` | Colored dot + priority label |
| MilestoneStatusBadge | `components/tasks/milestone-status-badge.tsx` | Per-milestone status pill |
| FileDropZone | `components/tasks/file-drop-zone.tsx` | Unified drag-and-drop file area |
| TaskButton / TaskButtonGhost | `components/tasks/task-button.tsx` | Primary/secondary action buttons |
| CardProgressBar | `components/tasks/card-progress-bar.tsx` | Thin progress bar on cards |
| ProgressRing | `components/tasks/progress-ring.tsx` | SVG circular progress indicator |

**Screens Redesigned:**
1. Taskboard dashboard — flat dark header, sort toggle, segmented tabs, new card design
2. View Details modal — progress ring, dark inset surfaces, milestone stepper
3. Assign New Task modal — dark inputs, chip selectors, milestone builder
4. Submit for Review modal — selectable option cards (Progress / Completion)
5. Assigner Review modal — progress slider with tick labels
6. Milestone Review dialog — unified file drop-zone
7. Manage/Edit Milestones dialog — dark theme, status badges

### 2.2 Card Uniformity Fixes
**Date:** 2026-07-07  
**Files:** `components/tasks/status-pill.tsx`, `components/tasks/priority-pill.tsx`, `app/(workspace)/tasks/page.tsx`

**Root Cause:** Three elements caused variable card heights — status pills wrapping on longer labels like "Pending Review", assignee names wrapping to two lines, and header row layout inconsistencies.

**Changes:**
- `whitespace-nowrap` added to all status and priority pill components
- Assignee name spans given `truncate whitespace-nowrap`
- Header row pills given `flex-shrink-0`
- Containers given `min-w-0` for proper flex overflow

### 2.3 Button Wrapping + Locked Submit Placeholder
**Date:** 2026-07-07  
**Files:** `app/(workspace)/tasks/page.tsx`

**Changes:**
- "Submit for Review" button given `whitespace-nowrap` across all variants
- Footer always renders two buttons (View Details + Submit) on every card
- Three-way render logic: milestone-locked, non-milestone enabled, non-milestone disabled

### 2.4 Redesign Polish Pass
**Date:** 2026-07-07  
**Files:** `app/(workspace)/tasks/page.tsx`, `components/tasks/file-drop-zone.tsx`, `components/tasks/task-button.tsx`

**Changes:**
- Removed conditional footer — every card always renders the same footer structure
- Chips rendered inside field containers (not below them)
- Scrollable create modal with sticky footer
- "View Details" changed from ghost to secondary button style
- Completion drop-zone purple tint strengthened for visibility
- Disabled button opacity increased from 40% to 50%

---

## 3. Authentication & Login

### 3.1 Mobile Login — Dual Column Fix
**Date:** 2026-07-07  
**File:** `app/login/page.tsx`

**Root Cause:** The desktop right panel (`flex w-full md:w-1/2`) rendered on ALL screen sizes. On mobile, both the desktop form and the mobile-specific layout rendered simultaneously, producing a cramped two-column appearance.

**Fix:** Added `hidden md:flex` to the desktop form panel — it now only renders at `md` breakpoint and above.

> **QA Checklist:**
> - [ ] Mobile (375px, 390px, 428px): single clean full-width column
> - [ ] Desktop (1024px+): two-column layout unchanged
> - [ ] No duplicated form fields on mobile
> - [ ] Branding panel with video visible on desktop only

### 3.2 Password Show/Hide + Remove Forgot Password
**Date:** 2026-07-15  
**File:** `app/login/page.tsx`

**Changes:**
- Added `showPassword` state with `Eye` / `EyeOff` toggle icons
- Desktop: eye button at `absolute right-3`, input gets `pr-12`
- Mobile: eye button at `absolute right-4`, input gets `pr-14`
- Both buttons have `tabIndex={-1}` and `aria-label`
- Removed "Forgot password? Click here" from both desktop and mobile layouts
- Terms of Service / Privacy Policy text retained

> **QA Checklist:**
> - [ ] Desktop: eye icon toggles password visibility
> - [ ] Desktop: "Forgot password?" link completely removed
> - [ ] Mobile: same toggle behavior
> - [ ] Mobile: "Forgot password?" link completely removed
> - [ ] Login functionality unchanged — email/password login works

---

## 4. Task Management — Core Workflow

### 4.1 Task Review Workflow (Complete System)
**Date:** 2026-07-04  
**Files:** `components/migrations/008-review-workflow-schema.sql`, `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Schema Additions:**
- `review_notes`, `review_assigner_notes`, `review_progress` columns on `tasks`
- Status CHECK expanded: added `pending_review`, `pending_completion_review`
- RLS `task_update_completed_guard` — prevents non-assigners from setting status to `completed`

**8 New API Functions:** `startTask`, `submitProgressReview`, `reviewProgress`, `submitCompletionReview`, `uploadCompletionFile`, `approveCompletion`, `rejectCompletion`

**Workflow:**
```
todo → (Start) → in_progress → (Submit Progress) → pending_review → (Assigner Reviews) → in_progress
                              → (Submit Completion + File) → pending_completion_review → (Approve) → completed
                                                                                       → (Reject) → in_progress
```

### 4.2 Task Visibility — RLS + API Layer
**Date:** Retroactive (via migration 001)  
**Files:** `components/migrations/001-task-module-overhaul.sql`, `lib/api.ts`

**RLS Policies Created:**
| Policy | Scope |
|--------|-------|
| `task_read_own` | Users in `assignee_ids[]` or `viewer_ids[]` |
| `task_read_assigned` | CEO/C_LEVEL/LEAD can read tasks they assigned |
| `task_read_clevel` | CEO/C_LEVEL can read tasks assigned TO them |
| `task_insert` | Only CEO/C_LEVEL/LEAD can create |
| `task_update` | Assigner always; assignee only when `submission_open = true` |
| `task_delete` | Only the assigner |

**API Visibility by Role:**
| Role | Sees |
|------|------|
| CEO / C_LEVEL | All system tasks (read-only for foreign tasks) |
| LEAD | Tasks they assigned + tasks assigned to them |
| EMPLOYEE | Tasks in their `assignee_ids[]` or `viewer_ids[]` |

### 4.3 C-Level Full Visibility + My Tasks Tab + Mandatory Description
**Date:** 2026-07-15  
**Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Changes:**
- CEO/C_LEVEL `getUserTasks()` returns all tasks (no row restriction)
- `canInteractWithTask()` helper enforces read-only for foreign tasks
- "My Tasks" tab added for C-Level (filters: assigned by + viewer)
- Mandatory description with inline red-border validation
- `assigneeError` state for mandatory "Assign To" field

### 4.4 Comment Visibility — Stale detailTask Fix
**Date:** 2026-07-15 (B-02, B-03, B-08, B-09)  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** `detailTask` state was set once on modal open and never refreshed after review actions. `fetchTasks()` updated the main `tasks` array but `detailTask` stayed stale.

**Fix:** Added `refreshDetailTask()` helper that re-fetches all tasks and syncs `detailTask` from the fresh array. Called after every review action.

### 4.5 Final Review — Comment Persistence + Reject Dialog Copy
**Date:** 2026-07-19 (B-09, NB-04)  
**Files:** `app/(workspace)/tasks/page.tsx`, `lib/api.ts`

**Root Cause (B-09):** `handleSubmitCompletionReview` did not pass `reviewNotes` to the API. `handleApproveCompletion` did not pass `assignerNotes`. Both API functions didn't accept or save notes.

**Root Cause (NB-04):** Reject dialog title/description was driven by `task.status` (always `pending_completion_review`) instead of `assignerAction`.

**Fix:**
- API functions now accept `notes?` parameter and save to DB
- Dialog title/description driven by `assignerAction` ("Review Progress" / "Approve Completion" / "Reject & Return Task")

### 4.6 Approve Completion Modal Not Closing
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** `handleApproveCompletion` called `setDetailDialogOpen(false)` (wrong modal) instead of `setAssignerReviewOpen(false)`.

### 4.7 Assigner Review Modal — Jagged Edge Fix
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** Resizable textarea and long slider pseudo-elements pushed past the 460px modal boundary.

**Fix:** Added `resize-none` to textarea, `min-w-0` to content/slider wrappers.

### 4.8 Remove Automatic 15% Progress Jump
**Date:** 2026-07-19 (NB-03)  
**Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Root Cause:** `tasksAPI.startTask()` set `progress: 15` — misleading because no actual progress update was submitted.

**Fix:** Changed to `progress: 0`. Toast updated to "Task is now in progress. Submit a progress update when ready."

### 4.9 Past Date/Time Validation
**Date:** 2026-07-19 (NB-01, NB-02)  
**File:** `app/(workspace)/tasks/page.tsx`

**Changes:**
- Due Date input: `min={todayStr}` — past dates greyed out
- Due Time input: `min` conditional on today being selected
- Changing date clears the time field
- `handleCreateTask`: past-datetime guard with toast

### 4.10 Archived Tasks Tab
**Date:** 2026-07-19 (UI-03)  
**File:** `app/(workspace)/tasks/page.tsx`

**Changes:**
- "Archived" tab added to `TAB_LABELS` (managers only)
- `getTasksByStatus("archived")` reads from raw `tasks` array (bypasses `activeTasks`)
- Styled with amber tint when active

### 4.11 Nearest Deadline Sort
**Date:** 2026-07-15  
**File:** `app/(workspace)/tasks/page.tsx`

**Changes:**
- New sort option: cycles Date assigned → Priority → Nearest Deadline
- Nearest Deadline uses `Math.abs(dueDate - Date.now())` — tasks without deadlines pushed to bottom
- Fixed "Date assigned" sort to correctly use `createdAt` (was incorrectly using `dueDate`)

---

## 5. Task Management — UI & Validation

### 5.1 Modal Viewport Overflow
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Fix:** Added `max-h-[90vh]` to `DialogContent` — caps modal at 90% viewport height. Existing flex layout handles header/content/footer scroll correctly.

### 5.2 Floating Assign Button + Button Sizing
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** `sticky bottom-0` inside Radix's CSS grid didn't anchor properly.

**Fix:** Restructured to `flex flex-col overflow-hidden p-6` with `flex-shrink-0` header/footer and `flex-1 min-h-0 overflow-y-auto` content.

### 5.3 Title Input Overflow + Chip Overflow
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Fix:** Added `min-w-0 overflow-x-hidden` to scrollable wrapper, `w-full box-border` to title input, `max-w-full` + `truncate` to chips.

### 5.4 Tasks UI/UX Improvements (U-T1 through U-T5)
**Date:** 2026-07-15  
**File:** `app/(workspace)/tasks/page.tsx`

| ID | Change |
|----|--------|
| U-T1 | Archive: `handleArchiveTask` sets status "archived"; active tasks pre-filtered |
| U-T2 | Employees see "Assigned MMM d" on task cards |
| U-T3 | Disabled Submit button removed entirely (only shown when actionable) |
| U-T4 | Start Milestone hidden when one is already in progress |
| U-T5 | Updated toast messages for start task/milestone |

---

## 6. Milestone System

### 6.1 Milestone Schema + Full Implementation
**Date:** 2026-07-06 (fixed 2026-07-07)  
**Files:** `components/migrations/011-task-milestones.sql`, `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Schema:**
- `task_milestones` table: id, task_id, title, description, order_index, weight, status, due_date, timestamps
- `milestone_reviews` table: id, milestone_id, comment, decision, employee/reviewer file fields
- Status enum: `not_started → in_progress → pending_review → needs_revision/approved`
- RLS policies piggyback on parent task visibility

**11 API Functions:** `getTaskMilestones`, `getNextActionableMilestone`, `startMilestone`, `submitMilestoneReview`, `approveMilestone`, `rejectMilestone`, `recalculateMilestoneProgress`, `allMilestonesApproved`, `updateMilestone`, `deleteMilestone`, `reorderMilestones`

**Key Behaviors:**
- Sequential ordering enforced at API level (not just UI)
- Weight must sum to 100% (validated on save)
- Completion review gated behind all milestones approved
- Progress = sum of approved milestone weights

### 6.2 Schema Fix — Live DB Incompatibilities
**Date:** 2026-07-07  
**File:** `components/migrations/012-fix-milestone-schema.sql`

**Root Cause:** Live DB had old incompatible `task_milestones` table. `CREATE TABLE IF NOT EXISTS` silently skipped creation.

**Fix:** Surgical ALTER migration — drops orphaned triggers, migrates status values, adds `weight` column, alters `due_date` type.

### 6.3 Start Milestone Targeting Wrong Milestone
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** `handleStartTask` hardcoded `order_index === 0` — always targeting milestone 1.

**Fix:** Replaced with `getNextActionableMilestone(taskId)`.

### 6.4 Missing Start Milestone for Later Milestones
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** Button gated on `detailTask.status === "todo"` — disappeared after first milestone approved.

**Fix:** Removed status gate; button now uses `getNextActionableIndex()`.

### 6.5 RLS Fix — Employee Milestone Updates
**Date:** 2026-07-07  
**Files:** `app/(workspace)/tasks/page.tsx`, `lib/api.ts`, SQL migration

**Root Cause:** `milestones_update` RLS restricted UPDATE to task assigner only. Employee starts/submits were silently rejected.

**Fix:** New RLS policy allows UPDATE by both assignees and assigner.

### 6.6 Milestone Bugs — Resubmission, Validation, Weights
**Date:** 2026-07-15 (B-04 through B-07)  
**Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| B-06 | `submitMilestoneReview` blocked `needs_revision` status | Accept `in_progress` OR `needs_revision` |
| B-04 | No file requirement on milestone submissions | Added file check with toast |
| B-05 | No comment validation on rejections | Added empty check; Reject button disabled when empty |
| B-07 | Weight saved without 100% sum check | Added sum validation with toast |

### 6.7 Milestone Comment Visibility + Status Sync
**Date:** 2026-07-19 (B-04, B-05, B-06, NB-05)  
**File:** `app/(workspace)/tasks/page.tsx`

**Changes:**
- Blue-tinted employee comment block visible to Chief during review
- Red-tinted reviewer feedback block visible to Employee on rejection
- Added `await fetchTasks()` after milestone submit/reject for card sync

### 6.8 Milestone Date Validation + Edit Fix + Weight Display + Add UX
**Date:** 2026-07-19 (NB-06, NB-07, NB-08, UI-04)  
**File:** `app/(workspace)/tasks/page.tsx`

| Issue | Fix |
|-------|-----|
| NB-06: No `min` on date inputs | Added `min={todayStr}` + conditional time `min` |
| NB-07: Edit dialog date reset on keystroke | Pre-populate `dueDate`/`dueTime` from `due_datetime` |
| NB-08: No weight budget feedback | Live indicator showing remaining % (yellow/green) |
| UI-04: Ghost "Add" button overlooked | Changed to primary `TaskButton` with "Add Milestone" label |

### 6.9 Mandatory Due Dates + Submission Lock/Unlock
**Date:** 2026-07-15  
**Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Changes:**
- Due Date & Time mandatory on task and milestone creation (inline red-bordered validation)
- `toggleMilestoneSubmission` function to toggle `submission_open` per milestone
- Assignee blocked from submitting on closed milestones (disabled "Closed" button)
- Milestone due datetime displayed in stepper rows

---

## 7. File Upload & Storage

### 7.1 File Upload Consolidation
**Date:** 2026-07-07  
**Files:** `lib/file-utils.ts` (new), `lib/api.ts`, `app/(workspace)/tasks/page.tsx`, `app/(workspace)/vault/page.tsx`

**Root Cause:** 7 separate inline upload implementations existed — each repeating 25 lines of validation/upload code.

**Changes:**
- Created `lib/file-utils.ts` with three shared functions: `uploadFile()`, `getSignedFileUrl()`, `downloadFile()`
- All 7 upload paths refactored to use `uploadFile()` (~120 lines of duplication eliminated)
- All file-open buttons switched from `window.open(signedUrl)` to blob-based `downloadFile()` for reliable cross-browser downloads

### 7.2 Reviewer File Persistence Fix
**Date:** 2026-07-06  
**File:** `lib/api.ts`

**Root Cause:** `uploadReviewerFile()` returned `{ fileUrl, fileName, fileSize }` but consumers destructured `{ url, name, size }`. Undefined values were silently dropped from UPDATE payloads.

### 7.3 Storage RLS URL/Path Mismatch
**Date:** 2026-07-06  
**File:** `components/migrations/010-fix-storage-rls-url-match.sql`

**Root Cause:** RLS compared `storage.objects.name` (raw path) against `tasks.*_file_url` (full public URL). These never match for non-owners.

**Fix:** Changed to `LIKE '%/uploads/' || storage.objects.name` suffix matching.

### 7.4 Milestone File RLS Extension
**Date:** 2026-07-07  
**File:** SQL migration (manual run required)

**Root Cause:** `storage_read_own` only checked `tasks` columns. Milestone files in `milestone_reviews` were invisible to RLS.

**Fix:** Extended policy to also check `milestone_reviews.employee_file_url` and `milestone_reviews.reviewer_file_url` via JOIN through `task_milestones → tasks`.

### 7.5 Optional File on Progress Reviews
**Date:** 2026-07-06  
**Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`

**Changes:** Progress review submissions now support optional file attachment (blue-themed drop-zone). Uses same `review_assigner_file_*` columns. Assigner's later file intentionally overwrites.

---

## 8. Vault Module

### 8.1 Vault Feature — Full Implementation
**Date:** Retroactive  
**Files:** `components/migrations/003-vault-module.sql`, `lib/api.ts`, `app/(workspace)/vault/page.tsx`, `components/admin-layout.tsx`

**Schema:** `vault_items` table with `category CHECK ('document','api_key','password','other')`. RLS: CEO/C_LEVEL only (read, insert, update-own, delete-own).

**UI:** Category tabs, search, add/edit dialog, document download (signed URL), API key/password reveal toggle, delete confirmation.

### 8.2 Vault — Require Sensitive Value
**Date:** 2026-07-15 (B-01)  
**File:** `app/(workspace)/vault/page.tsx`

**Root Cause:** `handleSave` only validated `form.title`. Users could create entries with empty passwords/API keys.

### 8.3 Vault UI/UX Improvements (U-V1 through U-V5)
**Date:** 2026-07-15  
**File:** `app/(workspace)/vault/page.tsx`

| ID | Change |
|----|--------|
| U-V1/V2 | File input redesigned — hidden `<input>` + custom label, single filename display |
| U-V3 | Document card shows filename (truncated) separately from file size |
| U-V4 | Category badges updated to higher-contrast colors |
| U-V5 | Reveal section uses fixed `min-h-[40px]` — prevents card shift |

### 8.4 Vault — Card Height Uniformity
**Date:** 2026-07-19 (UI-01, UI-02, + CSS Grid Fix)  
**File:** `app/(workspace)/vault/page.tsx`

**Phase 1 (Inner heights):**
- `CardContent` given `flex flex-col`
- Description wrapped in `min-h-[36px]` container
- "Other" text_value wrapped in `min-h-[52px]` container
- Footer: `mt-3` → `mt-auto pt-3`

**Phase 2 (Outer grid stretch):**
- `motion.div` wrapper: added `className="h-full"`
- `Card`: added `h-full flex flex-col`
- `CardContent`: added `flex-1`

---

## 9. Calendar Module

### 9.1 Calendar — Full Implementation
**Date:** Retroactive  
**Files:** `app/(workspace)/calendar/page.tsx`, `lib/api.ts`, API routes

**Features:** Month/week/day views, event creation (CEO/C_LEVEL/LEAD only), meeting type with email invites (SendGrid + ICS), Google Calendar integration, attendee management.

**Migrations:** `create-calendar-events-table.sql`, `004-meetings-rls-fix.sql`, `005-calendar-add-meeting-link.sql`

### 9.2 Calendar — Full UI Redesign (Dark Theme)
**Date:** 2026-07-19  
**File:** `app/(workspace)/calendar/page.tsx`

**Changes:**
- Page background: `#0B0F1A`
- Hero: compact dark card with role badge
- Navigation: flat inline (prev/next arrows + month title + "Today" pill)
- Month grid: `bg-[#121826]` cells with `gap-[1px]` hairline separators
- Today cell: `ring-1 ring-[#3B82F6]/30` + blue date circle
- Event pills: dark semi-transparent tints (blue for events, purple for meetings)
- Day view + Event details dialog: fully dark-themed

> **QA Checklist:**
> - [ ] Page background is `#0B0F1A`
> - [ ] View switcher (Day/Week/Month) — pill style toggle works
> - [ ] Navigation arrows cycle months correctly
> - [ ] "Today" button navigates to current date
> - [ ] Today's cell has blue ring + blue date number
> - [ ] Event pills readable on dark background
> - [ ] Day view renders event cards correctly
> - [ ] Event creation dialog still functional
> - [ ] All button handlers fire correctly

---

## 10. C-Level Dashboard

### 10.1 Dashboard — Full UI Redesign
**Date:** 2026-07-19  
**File:** `app/(workspace)/admin/c-level/page.tsx`

**Changes:**
- Page: `#0B0F1A` background
- Hero: compact dark card with role badge, date chip, "Operations Active" status
- Stat cards: gradient left-border accents, large faded background icons, `text-[36px]` numbers, hover glow effects
- Tab bar: pill-style matching Tasks page pattern
- Tab panels: dark containers with header row separated by border from content
- Removed all `Card`/`CardContent`/etc. shadcn imports

> **QA Checklist:**
> - [ ] Page background is `#0B0F1A`
> - [ ] 3 stat cards with colored left borders and hover glow
> - [ ] Tab bar: pill style, active tab has `bg-white/10`
> - [ ] All buttons (Create Announcement, New Project, New Team) still work
> - [ ] Sub-components (AnnouncementsList, ProjectsList, TeamsList) render correctly

---

## 11. Database Migrations

All migrations are located in `components/migrations/` and must be run manually in the Supabase SQL Editor.

| Migration | Purpose | Date |
|-----------|---------|------|
| `001-task-module-overhaul.sql` | Schema overhaul + RLS rewrite + due_datetime + notified column | Retroactive |
| `003-vault-module.sql` | vault_items table + vault bucket RLS | Retroactive |
| `004-meetings-rls-fix.sql` | Role-restricted calendar event CRUD | Retroactive |
| `005-calendar-add-meeting-link.sql` | meeting_link column | Retroactive |
| `006-multi-assignee-schema.sql` | assignee_ids/viewer_ids array columns + GIN indexes | 2026-07-04 |
| `007-drop-project-id-constraint.sql` | Remove stale project_id NOT NULL constraint | 2026-07-04 |
| `008-review-workflow-schema.sql` | review_notes/assigner_notes/progress columns + status CHECK + RLS guard | 2026-07-04 |
| `009-reviewer-file-rls-fix.sql` | reviewer file columns + storage RLS rebuild | 2026-07-04 |
| `010-fix-storage-rls-url-match.sql` | Storage RLS LIKE-based URL/path matching | 2026-07-06 |
| `011-task-milestones.sql` | task_milestones + milestone_reviews tables + RLS | 2026-07-06 |
| `012-fix-milestone-schema.sql` | Patch live DB incompatibilities (status enum, weight, due_date type) | 2026-07-07 |

**Inline SQL (manual run):**
- Milestone UPDATE RLS — allows both assignees and assigner to update milestones
- Extended `storage_read_own` — covers `milestone_reviews` file columns

---

## 12. Documentation & Tooling

### 12.1 Technical Documentation
**Date:** 2026-07-04  
**Files:** `CHAT.md`, `TEAMS.md`, `FILES.md`

Full technical documentation covering data models, backend logic, realtime behavior, frontend logic, permissions matrices, and edge cases for Chat, Teams, and Files modules.

### 12.2 Seed Script Expansion
**Date:** 2026-07-04  
**File:** `scripts/seed-initial-users.ts`

Expanded from 1 CEO user to 4 test users across all roles (CEO, C_LEVEL, LEAD, EMPLOYEE). Added idempotency and `--force` flag.

---

## 13. Build & Syntax Fixes

### 13.1 Duplicate getTasksByStatus Declaration
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** Second declaration introduced during redesign; original not removed. Build error: `Identifier has already been declared`.

### 13.2 Missing Closing Div — Milestone Stepper
**Date:** 2026-07-07  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** `<div key={m.id}>` wrapper added for expandable descriptions but closing `</div>` was missing. Cascading parse failure.

### 13.3 Extra Closing Div — Milestone Builder
**Date:** 2026-07-19  
**File:** `app/(workspace)/tasks/page.tsx`

**Root Cause:** Extra `</div>` left behind during milestone date input update. Prematurely closed parent element; JSX error `Expected '</', got '{'` on Netlify build.

---

## 14. Complete File Impact Matrix

This table shows every file modified during the project and the number of changes it received.

| File Path | # Changes | Category |
|-----------|-----------|----------|
| `app/(workspace)/tasks/page.tsx` | **28** | Task Management |
| `lib/api.ts` | **14** | API Layer |
| `app/(workspace)/vault/page.tsx` | **5** | Vault |
| `app/login/page.tsx` | **3** | Authentication |
| `app/(workspace)/calendar/page.tsx` | **2** | Calendar |
| `app/(workspace)/admin/c-level/page.tsx` | **1** | Dashboard |
| `lib/file-utils.ts` | **1** (new) | File Utilities |
| `lib/types.ts` | **4** | Type Definitions |
| `lib/firebase-types.ts` | **2** | Type Aliases |
| `components/tasks/status-pill.tsx` | **2** (new + fix) | UI Component |
| `components/tasks/priority-pill.tsx` | **2** (new + fix) | UI Component |
| `components/tasks/milestone-status-badge.tsx` | **1** (new) | UI Component |
| `components/tasks/file-drop-zone.tsx` | **2** (new + polish) | UI Component |
| `components/tasks/task-button.tsx` | **2** (new + polish) | UI Component |
| `components/tasks/card-progress-bar.tsx` | **1** (new) | UI Component |
| `components/tasks/progress-ring.tsx` | **1** (new) | UI Component |
| `components/admin-layout.tsx` | **1** | Sidebar Nav |
| `scripts/seed-initial-users.ts` | **1** | Tooling |
| `CHAT.md` | **1** (new) | Documentation |
| `TEAMS.md` | **1** (new) | Documentation |
| `FILES.md` | **1** (new) | Documentation |
| `supabase/CHANGES.md` | **40+** | Change Log |
| 11 SQL migration files | **1 each** | Database |

---

## 15. Master Regression Checklist

This is the comprehensive end-to-end checklist for QA to validate the complete system.

### Authentication
- [ ] Mobile login: single column, no dual rendering
- [ ] Password show/hide toggle works on desktop and mobile
- [ ] "Forgot password?" link fully removed
- [ ] Login with valid credentials succeeds

### Task Lifecycle — Non-Milestone
- [ ] Manager creates task with title + description + assignee + due date/time → succeeds
- [ ] Task creation blocked if description, assignee, due date, or due time is empty
- [ ] Past dates greyed out in date picker; past times blocked when today is selected
- [ ] Employee starts task → progress = 0%, status = "In Progress"
- [ ] Employee submits progress review (optional file) → status = "Pending Review"
- [ ] Manager reviews, sets progress % → task returns to "In Progress"
- [ ] Employee submits completion review (mandatory file) → status = "Final Review"
- [ ] Manager approves → status = "Completed", progress = 100%
- [ ] Manager rejects with feedback → returns to "In Progress", feedback visible
- [ ] Reject dialog shows "Reject & Return Task" title (not "Approve Completion")

### Task Lifecycle — Milestone
- [ ] Create task with milestones: all milestones persisted
- [ ] Milestone fields are mandatory (title, description, due date, due time)
- [ ] Start Milestone → first milestone enters "In Progress"
- [ ] Sequential locking: cannot start M2 before M1 approved
- [ ] Submit milestone with file + comment → "Pending Review"
- [ ] Chief sees employee comment in blue box below milestone row
- [ ] Chief approves → milestone "Approved", progress recalculated
- [ ] Chief rejects with feedback → "Needs Revision"
- [ ] Employee sees rejection feedback in red box below milestone row
- [ ] Employee can resubmit rejected milestones
- [ ] All milestones approved → completion review unlocked
- [ ] Manage Milestones: add/edit/reorder/delete all work
- [ ] Live weight budget indicator: yellow when ≠ 100%, green when = 100%
- [ ] Milestone date inputs block past dates
- [ ] Edit milestone: date/time pre-filled, no reset on keystroke
- [ ] Lock/unlock milestone submission toggle works for assigners

### Task UI
- [ ] All task cards in same row are identical height
- [ ] Status/priority pills never wrap
- [ ] Assignee names truncate with ellipsis
- [ ] Sort cycles: Date assigned → Priority → Nearest Deadline
- [ ] Nearest Deadline brings imminent tasks to top
- [ ] "Archived" tab visible for managers only
- [ ] Archived tab shows archived tasks
- [ ] C-Level "My Tasks" tab shows own tasks
- [ ] C-Level sees all tasks (read-only for foreign)
- [ ] Assign modal: scrollable with sticky footer

### Vault
- [ ] Only CEO/C_LEVEL can access Vault
- [ ] Create password/API key/other: sensitive value required
- [ ] Create document: file upload works
- [ ] All cards in same row are identical height
- [ ] Reveal toggle doesn't shift adjacent cards
- [ ] "Added by" footer pinned to bottom on all cards
- [ ] Edit/delete restricted to item creator
- [ ] Download triggers blob-based auto-download

### Calendar
- [ ] Dark theme applied consistently
- [ ] Month/Week/Day view switching works
- [ ] Navigation arrows + "Today" button work
- [ ] Today's cell highlighted with blue ring
- [ ] Event creation dialog functional (CEO/C_LEVEL/LEAD only)
- [ ] Event pills readable on dark cells

### C-Level Dashboard
- [ ] Dark theme applied
- [ ] Stat cards: colored borders + hover glow
- [ ] Tab bar: pill style navigation
- [ ] All create buttons (Announcement, Project, Team) functional

### File System
- [ ] All file downloads use blob-based approach (not `window.open`)
- [ ] Original filenames preserved
- [ ] Milestone files accessible to both assignee and assigner
- [ ] Vault files auto-download with correct name

### Build
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` / Netlify deployment succeeds
- [ ] No console errors on page load

---

<div align="center">

*— End of QA Change Report —*

**Finova Workspace** | Architecture & Planning Team | July 2026

</div>
]]>
