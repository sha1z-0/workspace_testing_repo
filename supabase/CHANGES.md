# Changes Log — Finova Workspace

## [2026-07-15] Nearest Deadline Sort Implementation
### Status: Completed
### Root Cause / Context
User requested a new sorting option to order tasks by the "Nearest Deadline" (most recently coming due date/time compared to right now).
Additionally, the existing "Date assigned" sort was incorrectly evaluating `dueDate` instead of `createdAt`.
### Actual Changes Made
- Expanded `sortBy` state to include `"deadline"`.
- Updated `sortedTasks` logic:
  - `"deadline"` uses `Math.abs(dueDate - Date.now())` to sort tasks nearest to the current exact time first. Tasks without deadlines are pushed to the bottom.
  - `"date"` now correctly sorts by `createdAt` descending (newest assigned first).
- Updated the Sort toggle button to cycle between "Date assigned", "Priority", and "Nearest Deadline".
- Added `whitespace-nowrap` to the sort button to prevent text wrapping on smaller screens.
### Files Touched
- `app/(workspace)/tasks/page.tsx`
- `supabase/CHANGES.md`
### Verification Checklist
- [ ] Sort button toggles correctly: Date assigned -> Priority -> Nearest Deadline -> Date assigned.
- [ ] Nearest Deadline mode brings tasks due today/tomorrow to the top.
- [ ] Date Assigned mode correctly orders by when the task was created (newest first).
- [ ] Tasks with no due dates go to the bottom in Nearest Deadline mode.

## [2026-07-15] Milestone & Task Mandatory Fields Epic (API + UI)
### Status: Completed
### Overview
Comprehensive epic covering milestone `due_datetime` support, `submission_open` enforcement, and mandatory field validation for tasks and milestones across the API layer and UI.
### API Layer Changes (`lib/api.ts`)
- **`createTask`** milestone mapping: `due_datetime` computed from `m.dueDate`/`m.dueTime`; weight defaults fixed to remainder distribution.
- **`toggleMilestoneSubmission`**: New function to toggle `submission_open` on `task_milestones`.
- **`submitMilestoneReview`**: Now selects `submission_open` and blocks submissions when closed.
- **`addMilestone`**: Updated signature with `dueDate`, `dueTime`; computes `due_datetime`.
- **`updateMilestone`**: Signature now accepts `due_datetime` and `submission_open` (replaces old `due_date`).
### UI Changes (`app/(workspace)/tasks/page.tsx`)
#### Mandatory Field Validation
- **Due Date & Time**: Now mandatory on task creation — inline red-bordered inputs + error messages. Validation in `handleCreateTask`.
- **Milestone creation**: Title, Description, Due Date, Due Time all mandatory in both the inline builder (create dialog) and the Manage Milestones dialog.
- **Milestone editing**: Due Date + Due Time inputs added to edit dialog; saved as `due_datetime`.
#### Milestone Deadline Enforcement
- **Assigner toggle**: Lock/Unlock button in View Details stepper toggles `submission_open` per milestone.
- **Assignee block**: "Submit" and "Resubmit" buttons replaced with disabled "Closed" when `submission_open === false`.
- **Due date display**: Milestone due datetime shown alongside title in stepper rows.
### Files Touched
- `lib/api.ts` — 5 functions modified/added
- `app/(workspace)/tasks/page.tsx` — mandatory validation, milestone builder UI, manage/edit dialogs, stepper deadline enforcement
- `supabase/CHANGES.md` — this entry
### Verification
- [ ] Task Creation blocked if Due Date or Due Time is empty
- [ ] Milestone addition blocked if Title, Description, Due Date, Due Time are empty
- [ ] Editing milestone supports changing Due Date & Time
- [ ] Assigner can toggle `submission_open` for a milestone (in_progress/pending_review)
- [ ] Assignee cannot submit a milestone if `submission_open` is false (shows "Closed" disabled button)
- [ ] Milestone due datetime displayed in stepper row

## [2026-07-15] Login Page — Password Show/Hide + Remove Forgot Password + Task Assignment Mandatory Fields
### Status: Completed
### Change 1: Login Page — Password Show/Hide Eye Icon
#### Actual Changes Made
- Added `showPassword` state.
- Added `Eye` and `EyeOff` from lucide-react imports.
- Desktop password field: wrapped in `relative` div, added eye icon button (`absolute right-3`) that toggles `type` between `password` and `text`. Input gets `pr-12` to avoid text overlapping the icon.
- Mobile password field: same treatment with `pr-14` and `right-4` positioning for the larger mobile input.
- Both eye buttons have `tabIndex={-1}` (not in tab order) and `aria-label` for accessibility.
### Change 2: Login Page — Remove Forgot Password Link
#### Actual Changes Made
- Desktop layout: Removed the `<p>` block containing "Forgot password? Click here" (was between the Login button and Terms text).
- Mobile layout: Removed the equivalent `<p>` block (was between the form and Terms text).
- Terms of Service and Privacy Policy text retained in both layouts.
### Change 3: Task Assignment — Mandatory Fields Validation (Assigned To)
#### Root Cause
The task creation form for managers had no validation on the "Assign To" field. A manager could create a task with zero assignees — the task would be created with no one assigned.
#### Actual Changes Made
- Added `assigneeError` state.
- `handleCreateTask`: validates `newTask.assigneeIds.length > 0` for managers before proceeding. Sets `assigneeError` and returns early if empty.
- Assign To field Label updated with red asterisk.
- Assign To container div: shows red border when `assigneeError` is true.
- Inline error message: "Please assign this task to at least one person."
- Error clears when user selects an assignee.
- Dialog `onOpenChange`: resets `assigneeError` on close.
- Submit button `disabled`: removed assignee count from condition (validation moved to handler + inline UI).
> **Note:** Title remains as a `disabled` button gate (no inline error needed — self-evident from empty field). Description and Assigned To both use inline error pattern.
### Files Touched
- `app/login/page.tsx` — showPassword state, Eye/EyeOff import, desktop + mobile password fields, removed Forgot Password from both layouts
- `app/(workspace)/tasks/page.tsx` — assigneeError state, handleCreateTask validation, Assign To UI error, Dialog onOpenChange, button disabled condition
- `supabase/CHANGES.md` — this entry
### Verification
#### Login Page
- [ ] Desktop: Password field has eye icon on the right
- [ ] Desktop: Clicking eye reveals password as plain text
- [ ] Desktop: Clicking again hides password
- [ ] Desktop: Eye icon does not overlap password text when field is full
- [ ] Desktop: "Forgot password?" text and link completely removed
- [ ] Desktop: Terms of Service and Privacy Policy text still visible
- [ ] Mobile: Same eye icon behaviour as desktop
- [ ] Mobile: "Forgot password?" text and link completely removed
- [ ] Mobile: Terms of Service and Privacy Policy text still visible
- [ ] Login functionality unchanged — email/password login works normally
#### Task Assignment
- [ ] Manager opens Assign Task dialog and clicks Assign without selecting anyone: red border on Assign To + error message
- [ ] Manager selects a user: error clears immediately
- [ ] Manager submits with assignee selected + title + description: task created normally
- [ ] Error state resets when dialog is closed and reopened
- [ ] Description validation (from previous prompt) still works independently
- [ ] Title still blocks via disabled button
- [ ] EMPLOYEE and LEAD creating their own task (no assign-to field): no regression

## [2026-07-15] Tasks UI/UX Improvements (U-T1 through U-T5)
### Status: Completed
### Actual Changes Made
- U-T1 (Archive): Added `handleArchiveTask` that sets status to "archived" via `tasksAPI.updateTask`. Active tasks pre-filtered to exclude archived. Archive button appears in View Details for task assigners when task is still "todo". Requires `archived` status support in DB CHECK constraint.
- U-T2 (Assignment date): Employees see "Assigned MMM d" date on task cards using `task.createdAt` with `format()`.
- U-T3 (Hide disabled Submit): Disabled Submit for Review button variants removed. Button only renders when the action is actually available (phased: all milestones done + in_progress; non-phased: canSubmit).
- U-T4 (Remove redundant Start Milestone): Added `hasInProgress` check — Start Milestone button hidden when a milestone is already running.
- U-T5 (Confirmation messages): Start task toast updated to "Task started! Progress is set to 15%. Keep it up!". Start milestone toast updated to "Milestone started! This milestone is now in progress. Submit for review when done."
### Files Touched
- `app/(workspace)/tasks/page.tsx`
- `supabase/CHANGES.md`
### Verification
- [ ] Task with no active milestone: "Start Milestone" visible in modal footer
- [ ] Task with in-progress milestone: "Start Milestone" button hidden
- [ ] Starting a task: toast shows "Task started! Progress is set to 15%. Keep it up!"
- [ ] Starting a milestone: toast shows "Milestone started! Submit for review when done."
- [ ] Employee view: task cards show "Assigned MMM d" date
- [ ] Manager view: assignment date NOT shown (manager already sees all dates)
- [ ] Non-actionable Submit for Review: button completely hidden (not disabled)
- [ ] Actionable Submit for Review: primary blue button shown as before
- [ ] Manager on todo task they assigned: Archive Task button in View Details
- [ ] After archiving: task disappears from all active tabs
- [ ] Archived tasks do not appear in any tab (All, To Do, etc.)
- [ ] LEAD/EMPLOYEE cannot archive (only assigner can)

## [2026-07-15] Vault UI/UX Improvements (U-V1 through U-V5)
### Status: Completed
### Actual Changes Made
- U-V1/V2: File input redesigned with hidden `<input>` + custom label. Filename shown once in truncated span. Removed duplicate filename `<p>` tag.
- U-V3: Document download button now shows filename (truncated) separately from file size, both always visible.
- U-V4: Category badges updated to higher-contrast colors — blue/amber/red/slate tints with brighter text.
- U-V5: Sensitive value reveal section now uses a fixed `min-h-[40px]` container — hidden state shows `••••••••` placeholder at same height as revealed state, preventing card shift.
### Files Touched
- `app/(workspace)/vault/page.tsx`
- `supabase/CHANGES.md`
### Verification
- [ ] File input in Add dialog: shows "Choose File" button + filename separately, not twice
- [ ] Spacing between button and filename is clean
- [ ] Long document name on card: name truncates, file size stays visible
- [ ] Category badges visually distinct and legible on dark card backgrounds
- [ ] Revealing a sensitive value: card height does not shift
- [ ] Hiding a sensitive value: card height stays the same, shows dot placeholder

## [2026-07-15] B-04/B-05/B-06/B-07: Milestone Bugs — Resubmission, Validation, Weights
### Status: Completed
### B-06: Root Cause
`submitMilestoneReview` in `lib/api.ts` validated `milestone.status !== "in_progress"` and threw immediately for any other status. Rejected milestones have status `needs_revision` — the API blocked all resubmission attempts even though the UI "Resubmit" button existed.
### B-04: Root Cause
Milestone submission had no file requirement. QA confirmed a document should be mandatory on employee milestone submissions.
### B-05: Root Cause
Milestone rejection had no comment validation. Chief could reject without explaining what needs fixing.
### B-07: Root Cause
`handleEditMilestone` saved weight values without checking if all milestone weights summed to 100%.
### Actual Changes Made
- `lib/api.ts` `submitMilestoneReview`: Changed status check to accept `in_progress` OR `needs_revision`.
- `app/(workspace)/tasks/page.tsx` `handleSubmitMilestoneReview`: Added file requirement check with toast.
- Milestone dialog description updated to indicate document is required for submission.
- Milestone dialog FileDropZone for submit action: changed to `required` tint.
- `handleRejectMilestone`: Added empty comment validation with toast.
- Reject & Return button: disabled when `milestoneComment` is empty.
- `handleEditMilestone`: Added weight sum validation before saving. Blocks save if total ≠ 100%.
### Files Touched
- `lib/api.ts` — submitMilestoneReview status check
- `app/(workspace)/tasks/page.tsx` — handleSubmitMilestoneReview, handleRejectMilestone, handleEditMilestone, milestone dialog UI
- `supabase/CHANGES.md`
### Verification
- [ ] Milestone rejected → employee can click Resubmit → dialog opens → submit succeeds
- [ ] Milestone resubmission with comment only: succeeds (document required message shows if no file)
- [ ] Milestone resubmission with file: succeeds and goes back to pending_review
- [ ] Milestone first submission without file: blocked with toast
- [ ] Milestone first submission with file: succeeds
- [ ] Milestone rejection without comment: Reject & Return button disabled
- [ ] Milestone rejection with comment: button enabled, rejection succeeds
- [ ] Edit milestone weight summing to exactly 100%: saves
- [ ] Edit milestone weight summing to 95%: blocked with toast showing current total
- [ ] Edit milestone weight summing to 110%: blocked with toast

## [2026-07-15] B-02/B-03/B-08/B-09: Comment Visibility + Rejection Feedback Required
### Status: Completed
### Root Cause (B-02, B-08, B-09)
`detailTask` state was set once on modal open and never refreshed after review actions completed. `fetchTasks()` updated the main `tasks` array but `detailTask` remained stale — `reviewNotes` and `reviewAssignerNotes` always showed the pre-submission values.
### Root Cause (B-03)
The Reject & Return button had no `disabled` condition checking for empty feedback. Chief could reject a completion review without explaining why.
### Actual Changes Made
- Added `refreshDetailTask()` helper — re-fetches all tasks and syncs `detailTask` from the fresh array.
- `handleSubmitProgressReview`, `handleAssignerReviewProgress`, `handleApproveCompletion`, `handleRejectCompletion`: all now call `refreshDetailTask()` instead of bare `fetchTasks()` so `detailTask` updates immediately.
- Reject & Return button: `disabled` when `assignerNotes` is empty. Helper text displayed under Feedback field for reject action.
### Files Touched
- `app/(workspace)/tasks/page.tsx`
- `supabase/CHANGES.md`
### Verification
- [ ] Employee submits progress review: View Details immediately shows submitted comment
- [ ] Chief reviews progress (sets %): View Details shows updated assigner notes
- [ ] Chief approves completion: View Details shows approval notes (not previous review comment)
- [ ] Chief rejects completion: View Details shows rejection notes
- [ ] Milestone approval/rejection comments visible after action
- [ ] Reject & Return button disabled when feedback textarea is empty
- [ ] Reject & Return button enabled once feedback is typed
- [ ] Helper text "Feedback is required when rejecting" appears in reject mode only
- [ ] Approve path unaffected (no feedback required)

## [2026-07-15] B-01: Vault — Require Sensitive Value Field
### Status: Completed
### Root Cause
`handleSave` only validated `form.title`. The `text_value` field (Password / API Key / Value) had no validation — users could create vault entries with an empty sensitive value.
### Actual Changes Made
- Added `textValueError` state.
- `handleSave` validates `text_value` for all non-document categories before saving.
- Sensitive Value Textarea renders with red border + inline error message when empty on submit.
- Label updated with red asterisk.
- Error resets when user types or form resets.
### Files Touched
- `app/(workspace)/vault/page.tsx`
- `supabase/CHANGES.md`
### Verification
- [ ] Creating a password entry with empty password field: blocked, red border + error shown
- [ ] Creating an API key entry with empty value: blocked
- [ ] Creating a "other" entry with empty value: blocked
- [ ] Creating a document entry with no file: existing validation still works
- [ ] Filling in value and saving: works normally
- [ ] Editing an existing item: no regression (edit path doesn't require text_value re-entry)

## [2026-07-15] Tasks Page — cPanel Full Visibility + My Tasks Filter + Mandatory Description
### Status: Completed
### Change 1: cPanel Accounts View All Tasks (Read-Only for Unowned Tasks)
#### Root Cause
CEO/C_LEVEL `getUserTasks()` was filtered to only return tasks they assigned or were assigned to. They had no visibility into tasks distributed by other managers to other employees.
#### Actual Changes Made
- `lib/api.ts` `getUserTasks()`: Removed the OR filter for CEO/C_LEVEL. They now receive all tasks with no row restriction. UI layer enforces read-only for foreign tasks.
- `app/(workspace)/tasks/page.tsx`: Added `isCLevel` constant (`CEO || C_LEVEL`).
- Added `canInteractWithTask(task)` helper — returns `false` for cPanel users on tasks where they are neither assigner nor assignee.
- Task card: Submit for Review button group wrapped in `canInteractWithTask(task) && isAssignee(task)`.
- View Details modal: All action buttons (Start Task, Start Milestone, Submit for Review, Review Progress, Approve, Reject) wrapped in `canInteractWithTask(detailTask)`. Info-only content (progress ring, description, milestones view, notes, files) left ungated.
### Change 2: "My Tasks" Tab for cPanel Users
#### Actual Changes Made
- `TAB_LABELS` conditionally spreads `my_tasks: "My Tasks"` when `isCLevel` is true. Tab is invisible to LEAD and EMPLOYEE roles.
- `getTasksByStatus()` extended to handle `"my_tasks"` key — filters by `assignedBy === user.id` OR `viewerIds.includes(user.id)`.
### Change 3: Mandatory Description with Inline Validation
#### Root Cause
Description was already blocking submission via `disabled` condition but gave no visual signal to the user about why the button was unresponsive.
#### Actual Changes Made
- Added `descriptionError` state.
- `handleCreateTask` validates description at top of function — sets error state and returns early if empty.
- Description Textarea: red border + inline "Description is required." message when `descriptionError` is true. Error clears as user types.
- Label updated with red asterisk to signal required status.
- Dialog `onOpenChange` resets error on close.
- Submit button `disabled` condition: removed `!newTask.description` (moved to handler); `!newTask.title` unchanged.
### Files Touched
- `lib/api.ts` — getUserTasks CEO/C_LEVEL query branch
- `app/(workspace)/tasks/page.tsx` — isCLevel, canInteractWithTask, TAB_LABELS, getTasksByStatus, descriptionError state, handleCreateTask validation, Textarea UI, Dialog onOpenChange, button disabled condition
- `supabase/CHANGES.md` — this entry
### Verification
- [ ] CEO/C_LEVEL: all system tasks visible on taskboard
- [ ] CEO/C_LEVEL on own assigned task: all buttons functional, unchanged behavior
- [ ] CEO/C_LEVEL on foreign task card: only "View Details" visible, no submit buttons
- [ ] CEO/C_LEVEL in View Details of foreign task: info visible, no action buttons
- [ ] LEAD/EMPLOYEE: task visibility unchanged — only their own tasks
- [ ] LEAD/EMPLOYEE: no "My Tasks" tab visible
- [ ] CEO/C_LEVEL: "My Tasks" tab appears in tab bar
- [ ] "My Tasks" tab: shows tasks they assigned + tasks they are a viewer on
- [ ] "My Tasks" tab: does NOT show unrelated foreign tasks
- [ ] All other tabs (All, To Do, In Progress, Review, Final, Done) unchanged for all roles
- [ ] Submit with empty description: red border + error message shown, form blocked
- [ ] Type in description: error clears immediately
- [ ] Close and reopen dialog: no stale error shown
- [ ] Submit with description filled: submits normally
- [ ] Title field: still blocks via disabled button (no regression)
- [ ] Full task lifecycle (start, submit, review, approve, reject) unchanged for all roles

## [2026-07-07] Fix Mobile Login Page — Two Columns Rendering Simultaneously

### Status: Completed

### Root Cause
The desktop right panel (form section) was `flex w-full md:w-1/2` — it rendered on ALL screen sizes, including mobile. The mobile-specific stacked layout (`md:hidden`) was a separate sibling div. On screens below the `md` breakpoint, both the desktop form panel AND the mobile layout rendered side-by-side inside the parent flex container, each at `w-full` trying to share the row — producing the cramped two-column appearance.

### Actual Changes Made
- Added `hidden` to the desktop right panel: `hidden md:flex` — now it only renders at the `md` breakpoint and above
- Desktop two-column layout untouched — left panel already had `hidden md:flex`, right panel now matches

### Files Touched
- `app/login/page.tsx` — one className change on the desktop form panel
- `supabase/CHANGES.md` — this entry

### Verification
- [ ] Mobile (375px, 390px, 428px): single clean full-width column
- [ ] Desktop (1024px+): two-column layout unchanged
- [ ] No duplicated form fields on mobile
- [ ] Logo, Welcome Back, inputs, button, links all visible and functional on mobile
- [ ] Branding panel with video visible on desktop, not on mobile

---

## [2026-07-07] Fix Approve Completion Modal Not Closing

### Status: Completed

### Root Cause
`handleApproveCompletion` called `setDetailDialogOpen(false)` on success — closing the view details modal (which was already closed when the assigner opened the review modal from it), but never closing the assigner review modal itself (`assignerReviewOpen`). The existing "Set Progress" handler (`handleAssignerReviewProgress`) correctly uses `setAssignerReviewOpen(false)` — the approval handler was not following the same pattern.

### Actual Changes Made
- Replaced `setDetailDialogOpen(false)` with `setAssignerReviewOpen(false)` in `handleApproveCompletion`
- Pattern matches `handleAssignerReviewProgress` exactly — both now call `setAssignerReviewOpen(false); setAssignerFile(null)` on success
- The catch block unchanged — modal stays open on failure

### Files Touched
- `app/(workspace)/tasks/page.tsx` — line 377, wrong state variable
- `supabase/CHANGES.md` — this entry

### Verification
- [ ] Confirm Approval → modal closes immediately
- [ ] Approval correctly marks task as Completed
- [ ] Cancel still works as before
- [ ] On failure, modal stays open

---

## [2026-07-07] Lock Submit for Review by Task Status, Not Milestone Count

### Status: Completed

### Root Cause
The milestone "Submit for Review" unlock was gated solely on `allMilestonesDone` (all milestones approved). But the button was unlocked even when the task was already `pending_review`, `pending_completion_review`, or `completed` — because milestone approval alone doesn't tell you the task's review state.

### Status Values Used
From the task schema and existing non-milestone business logic:
- `"completed"` — task is genuinely done, assigner approved the final review
- `"pending_review"` — progress update submitted, awaiting assigner's decision
- `"pending_completion_review"` — final completion review submitted, awaiting assigner approval
- `"in_progress"` — task is actively being worked on, no review pending

### Actual Changes Made
- **Task card** (only location): Changed milestone unlock condition from `allMilestonesDone` to `allMilestonesDone && task.status === "in_progress"`
- This reuses the same pattern already working for non-milestone tasks — `canSubmit = isAssignee && status === "in_progress"` — and layers the milestone approval check on top
- Locked states: milestones not all approved, OR task status is `completed`, `pending_review`, or `pending_completion_review`

### Five Test Scenarios
| # | Scenario | Expected | Mechanism |
|---|----------|----------|-----------|
| 1 | Non-milestone, in_progress, no review pending | Enabled | `canSubmit` check (unchanged) |
| 2 | Non-milestone, pending_review | Locked | `canSubmit` requires `in_progress` (unchanged) |
| 3 | Milestone, not all approved | Locked | `allMilestonesDone` is false |
| 4 | Milestone, all approved (2/2, 100%), in_progress | **Enabled** | `allMilestonesDone && status === "in_progress"` |
| 5 | Milestone, all approved, task Completed | Locked | `status !== "in_progress"` |

### Files Touched
- `app/(workspace)/tasks/page.tsx` — card button unlock condition
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] Non-milestone in_progress → button enabled (unchanged)
- [ ] Non-milestone pending_review/pending_completion_review/completed → button locked (unchanged)
- [ ] Milestone, not all approved → button locked
- [ ] Milestone, all approved + in_progress → button enabled (newly correct)
- [ ] Milestone, all approved + completed → button locked (newly correct)
- [ ] Milestone start/submit/approve cycle unaffected

---

## [2026-07-07] Fix Jagged Edge on Assigner Review Modal

### Status: Completed

### Root Cause
Two interacting CSS issues on the assigner review modal at `sm:max-w-[460px]`:

1. The resizable `<Textarea>` (feedback field) defaults to `resize: both` from the browser user-agent stylesheet — the component doesn't set `resize: none`. The resize handle can be dragged outside the modal's 460px boundary, tearing the right edge.

2. The content wrapper and slider wrapper lacked `min-w-0`, so the custom-styled range slider with its long pseudo-element class names could also push past the container.

### Actual Changes Made
- Added `resize-none` to the assigner review modal's feedback Textarea — prevents the resize handle from being dragged past the modal boundary
- Added `min-w-0` to the content wrapper and slider grid wrapper for overflow containment

### Files Touched
- `app/(workspace)/tasks/page.tsx` — added `resize-none` to feedback textarea, `min-w-0` to wrappers
- `supabase/CHANGES.md` — this entry

### Verification
- [ ] Right edge of Approve Completion modal renders clean and straight
- [ ] No content overflows past modal boundary
- [ ] Feedback textarea still accepts input normally
- [ ] File attachment drop-zone still works
- [ ] Cancel / Confirm Approval buttons still function unchanged
- [ ] Progress slider in review mode unaffected

---

## [2026-07-07] Fix Start Milestone Targeting Wrong Milestone (Root Cause: Hardcoded Index)

### Status: Completed

### Root Cause (Specific)
`app/(workspace)/tasks/page.tsx` line 305 — the `handleStartTask` function resolved the milestone to start via:

```typescript
const ms = await tasksAPI.getTaskMilestones(taskId)
const first = ms.find((m: any) => m.order_index === 0)
await tasksAPI.startMilestone(first.id)
```

This hardcodes `order_index === 0` — always targeting milestone position 1, regardless of whether it's already approved. After milestone 1 is approved, clicking "Start Milestone" correctly fetches all milestones, but then passes the wrong ID (the approved milestone 1) to `startMilestone`, which correctly rejects it with "This milestone has already been started."

The previous "fix" changed the button's visibility logic but never touched the click handler itself — the button showed at the right time, but the handler still used the hardcoded `order_index === 0` to pick the milestone.

### Actual Changes Made
- Replaced `ms.find(m => m.order_index === 0)` with `tasksAPI.getNextActionableMilestone(taskId)` — the existing API function that queries for the lowest-order `not_started` milestone, identical to the logic used by both the stepper's `getNextActionableIndex` and the button visibility check
- Added `setMilestones` refresh after starting so the stepper updates immediately while the dialog stays open

### Files Touched
- `app/(workspace)/tasks/page.tsx` — line 305, replaced hardcoded index with `getNextActionableMilestone` call
- `supabase/CHANGES.md` — this entry

### Verification
- [ ] Milestone 1 starts correctly (first call to getNextActionableMilestone returns milestone 1)
- [ ] After M1 approved, clicking Start Milestone starts M2
- [ ] After M2 approved, clicking Start Milestone starts M3
- [ ] Sequential ordering enforced at both API and UI level
- [ ] Stepper updates immediately after starting (milestones refreshed inline)

---

## [2026-07-07] Fix Missing Start Milestone for Later Milestones + Hide Submit From Assigner

### Status: Completed

### Root Cause
**Issue 1:** The modal footer's "Start Milestone" button was gated on both `detailTask.status === "todo"` AND `milestones.some(m => m.status === "not_started")`. After the first milestone is approved, the task status transitions to `in_progress`, so the button disappeared and never came back for milestone 2+ — even though there were still not_started milestones waiting.

**Issue 2:** "Submit for Review" on the task card had no role check — it rendered for assigners too, who should only ever see review/approve actions, never submit actions.

### Actual Changes Made

**Issue 1:**
- Removed the `detailTask.status === "todo"` gate from the "Start Milestone" button
- Button now uses `getNextActionableIndex(milestones)` to find the next sequential not-started milestone — identical logic to the stepper's `isActionable` check
- Button renders whenever `isAssignee` + the next-actionable milestone is not_started (regardless of task status being `todo` or `in_progress`)
- Hides when no actionable not_started milestone exists (all approved, or one currently in_progress/pending_review)

**Issue 2:**
- Wrapped the entire "Submit for Review" card button in `{isAssignee(task) && (...))}` — assigners never see it
- This covers all three variants (milestone locked, milestone unlocked, non-milestone)

### Files Touched
- `app/(workspace)/tasks/page.tsx` — modal footer button visibility logic, card button role gate
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] Milestone 1: Start Milestone visible → starts → submit → approve
- [ ] Milestone 2: Start Milestone reappears after M1 approved → starts → submit → approve
- [ ] Milestone 3+: Same pattern, Start Milestone reappears each time
- [ ] Start Milestone hidden while a milestone is in_progress or pending_review
- [ ] Start Milestone hidden once all milestones approved
- [ ] Sequential locking still enforced (can't start M3 before M2 approved)
- [ ] Assigner never sees "Submit for Review" on task cards
- [ ] Assignee still sees "Submit for Review" as appropriate
- [ ] Assigner's review/approve actions in detail modal unaffected
- [ ] Non-milestone Start Task button unaffected

---

## [2026-07-07] Fix JSX Syntax Error — Missing Closing Div

### Status: Completed

### Root Cause
When the expandable milestone description feature was added, a `<div key={m.id}>` wrapper was introduced around each milestone row in the stepper's `.map()` callback. The opening tag was added but the closing `</div>` was not — this is what broke the parser. The error pointed at the top-level `return (` at line 479 only because the unclosed div cascaded a parsing failure up to the next valid expression boundary.

### Actual Changes Made
- Added missing `</div>` for the `key={m.id}` wrapper between the expandable description conditional and the return parenthesis close

### Files Touched
- `app/(workspace)/tasks/page.tsx` — added missing closing div at line 762
- `supabase/CHANGES.md` — this entry

---

## [2026-07-07] Unlock Submit for Review + Milestone UI Cleanup

### Status: Completed

### Part 1: Unlock "Submit for Review" When All Milestones Approved

**Root Cause:** The locked placeholder button from the previous pass was always locked, with no check for milestone completion state.

**Changes:**
- Card now derives `allMilestonesDone` from `milestoneSummaries[task.id]` (when `approved === total && total > 0`)
- Milestone card footer becomes three-way:
  - `allMilestonesDone` → primary blue button, calls `openReviewDialog(task.id)` (same flow as non-milestone tasks)
  - Not all approved → locked secondary button with lock icon (unchanged placeholder)
- `handleStartTask` for milestone tasks now calls `openMilestoneReview` which feeds into the same `reviewType` logic — the existing `openReviewDialog` already checks `allMilestonesApproved` at the API level and sets `reviewType = "completion-gated"` if any milestone isn't approved
- Backend enforcement already exists at two layers: `submitCompletionReview` API throws if any milestone unapproved (line 1072-1075 of api.ts), and `openReviewDialog` sets the UI state to `completion-gated` which locks the completion-review option card

### Part 2: Single "Start Milestone" Button

**Root Cause:** An inline per-milestone `canStart` button existed alongside the bottom "Start First Milestone" CTA — two code paths for the same action, plus the bottom button rendered even when all milestones were approved.

**Changes:**
- Removed inline `{canStart && <TaskButtonGhost ...>Start</TaskButtonGhost>}` from each milestone row in the stepper
- Bottom button split into two conditionals:
  - **Milestone tasks + `todo` + at least one `not_started` milestone:** Shows "Start Milestone", calls `handleStartTask(id, true)` which finds the first actionable milestone and starts it
  - **Non-milestone tasks + `todo`:** Shows "Start Task", calls `handleStartTask(id)` unchanged
  - **All milestones approved:** Button does not render at all (fixes the screenshot bug where it showed after all were approved with progress at 100%)

### Part 3: Expandable Milestone Descriptions

**Root Cause:** Milestone `description` field was stored in the DB but never surfaced to the employee.

**Changes:**
- Added `expandedMilestoneId` state
- Milestone rows with a non-empty description render as clickable (`cursor-pointer`)
- On click, toggles expanded — description renders inline below the row in a matching inset panel
- Cleared when the modal closes
- Read-only — employee can only view, not edit

### Files Touched
- `app/(workspace)/tasks/page.tsx` — card button logic, modal footer button logic, inline Start removal, expandable descriptions
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] Non-milestone task: Start Task → 15%, submit → review → complete — full lifecycle works
- [ ] Non-milestone card: Submit for Review enabled/disabled per status
- [ ] Milestone task: Start Milestone button visible when milestones not_started
- [ ] Milestone task: Start Milestone starts the first actionable milestone (sequential ordering)
- [ ] Milestone task: Start Milestone hidden while milestone in_progress or pending_review
- [ ] Milestone task: Start Milestone hidden once all milestones approved (no more to start)
- [ ] Milestone task: Submit for Review locked while milestones pending
- [ ] Milestone task: Submit for Review unlocks when all milestones approved
- [ ] Milestone task: Unlocked button leads into same submit-for-review flow (openReviewDialog)
- [ ] Milestone task: When all approved, clicking Submit for Review → progress update / completion review options
- [ ] Milestone task: Backend still rejects completion submission if milestones unapproved (api.ts line 1072-1075)
- [ ] Milestone task: Clicking row with description expands it inline
- [ ] Milestone task: Clicking row without description does nothing
- [ ] Milestone task: Expand/collapse toggle works (click again to close)
- [ ] Card uniformity still holds (no height changes from these modifications)
- [ ] File attachments on milestone submissions still work

---

## [2026-07-07] Fix Button Wrapping + Locked Submit on Milestone Cards

### Status: Completed

### Root Cause
**Wrapping:** The "Submit for Review" text could wrap to two lines on narrower cards, making that footer taller than cards with only View Details.

**Missing button:** Milestone-based task cards conditionally hid Submit for Review entirely (`{canSubmit && ...}`), creating a structural height difference (one-button vs two-button footer).

### Actual Changes Made
- "Submit for Review" button given `whitespace-nowrap` on all three variants — text always stays single-line
- Footer always renders two buttons: View Details + Submit for Review, on every card, eliminating structural height variance
- Three-way render for Submit for Review:
  - **Milestone (`isPhased`):** Rendered as a permanently locked button — secondary variant, `disabled`, lock icon, `cursor-not-allowed`. Always shown, never clickable. **Intentionally stubbed — real unlock logic (checking all milestones approved) is future work.**
  - **Non-milestone + in_progress (`canSubmit`):** Primary blue button, clickable, opens the review dialog
  - **Non-milestone + not in_progress:** Secondary disabled button, `cursor-not-allowed`

### Files Touched
- `app/(workspace)/tasks/page.tsx` — card footer restructured to always show both buttons
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] "Submit for Review" text stays on one line at all 3-column grid widths
- [ ] All cards (all statuses, all priorities, with/without milestones) are identical height in same row
- [ ] Non-milestone "Submit for Review" (in_progress) still opens the review dialog
- [ ] Non-milestone "Submit for Review" (other statuses) is disabled and does nothing
- [ ] Milestone "Submit for Review" is locked, shows lock icon, does nothing when clicked
- [ ] Milestone button is a placeholder only — no submission attempt fires

---

## [2026-07-07] Fix Title Input Overflow in Assign Modal

### Status: Completed

### Root Cause
The scrollable content area in the Assign modal lacked `min-w-0` and `overflow-x-hidden`, allowing the Title input (with `w-full`) to measure against the grid parent without constraint and push past the modal padding. Added `box-border` explicitly to the input as a secondary safeguard.

### Actual Changes Made
- Scrollable content wrapper: added `min-w-0 overflow-x-hidden` to enforce width bounds
- Title Input: added `w-full box-border` to ensure it sizes within its container with padding included

### Files Touched
- `app/(workspace)/tasks/page.tsx` — modal scroll wrapper + Title input className
- `supabase/CHANGES.md` — this entry

---

## [2026-07-07] Fix Horizontal Overflow in Assign Modal Chips

### Status: Completed

### Root Cause
Chip containers in Assign To / Can View Progress fields lacked `min-w-0` to enable overflow containment, and individual chip names weren't wrapped in a truncation span — long names like "Dr. Jonathan Christopher Williams III" would stretch the chip past the container edge.

### Actual Changes Made
- Chip flex wrapper: added `min-w-0` for overflow containment
- Each chip: added `max-w-full`, moved name into `<span className="truncate">`, gave icon and X button `flex-shrink-0`
- Both Assign To and Can View Progress field chips updated identically

### Files Touched
- `app/(workspace)/tasks/page.tsx` — chip containers in both fields
- `supabase/CHANGES.md` — this entry

---

## [2026-07-07] Fix Card Uniformity — Wrapping Pills + Names

### Status: Completed

### Root Cause
Three elements could change card height: status pills wrapped for longer labels like "Pending Review" (no `whitespace-nowrap`), assignee names wrapped to two lines on cards with extra header badges (no truncation), and the header row could push layout inconsistently when pills competed for space.

### Actual Changes Made

**StatusPill + PriorityPill (`components/tasks/`):**
- Added `whitespace-nowrap` to both pill components — all status labels ("To Do", "In Progress", "Pending Review", "Final Review", "Completed") and priority labels stay on one line

**Task card header row (`page.tsx`):**
- Pills given `flex-shrink-0` to prevent squishing
- Due date span given `whitespace-nowrap` and its icon `flex-shrink-0`
- Container given `min-w-0` to enable proper flex overflow

**Task card assignee row (`page.tsx`):**
- Name span: `truncate whitespace-nowrap` — overflows with ellipsis instead of wrapping
- "· by [assigner]" span: same truncation
- Container: `min-w-0 overflow-hidden` to enable truncation
- User icon: `flex-shrink-0` to preserve size

### Files Touched
- `components/tasks/status-pill.tsx` — `whitespace-nowrap`
- `components/tasks/priority-pill.tsx` — `whitespace-nowrap`
- `app/(workspace)/tasks/page.tsx` — card header/assignee row truncation
- `supabase/CHANGES.md` — this entry

### Verification (tested combinations)
- [ ] "Pending Review" pill stays single line (longest label, 14 chars)
- [ ] All five statuses + all four priorities = uniform header height
- [ ] Assignee name "Jordan Taylor" stays single line even with milestone badge present
- [ ] Long assignee names (multi-person "You, Jennifer +1") truncate with ellipsis
- [ ] Title truncates to 1 line (existing `truncate` on h3)
- [ ] Description clamps to 2 lines (existing `line-clamp-2`)
- [ ] Card height identical across all status/priority/badge combinations in same row
- [ ] View Details still shows full untruncated data

---

## [2026-07-07] Fix Modal Viewport Overflow (Regression Fix)

### Status: Completed

### Root Cause
The flex column layout from the previous scroll fix was structurally correct (header, scrollable middle, footer), but the `DialogContent` had no `max-height` constraint. Radix centers the dialog vertically with `translate-y[-50%]`, so when the content exceeded the viewport height, both the header was pushed above the screen and the footer below it — no amount of internal scrolling helps when the container itself is taller than the viewport.

### Actual Changes Made
- Added `max-h-[90vh]` to the Assign New Task `DialogContent` className — caps the modal at 90% of the browser viewport height
- The existing flex layout already handles the rest correctly: header (`flex-shrink-0`), middle content (`flex-1 min-h-0 overflow-y-auto`), footer (`flex-shrink-0`)

### Files Touched
- `app/(workspace)/tasks/page.tsx` — added `max-h-[90vh]` to Assign Task modal
- `supabase/CHANGES.md` — this entry

### Verification (with 5 milestones at laptop height)
- [ ] Modal title + close icon always visible at top
- [ ] Assign Task + Cancel buttons always visible at bottom
- [ ] Middle content scrolls independently
- [ ] No functional regressions

---

## [2026-07-07] Fix Floating Assign Button + Matching Button Sizes

### Status: Completed

### Root Cause
**Issue 1:** The previous scroll fix used `sticky bottom-0` on `DialogFooter` inside Radix's CSS grid `DialogContent`. Sticky positioning inside a grid cell only sticks within that cell — it doesn't anchor to the bottom of the modal. When the grid cell scrolled, the footer scrolled with it and floated over the content.

**Issue 2:** "View Details" had an explicit `className="px-3 py-1.5 text-[12px]"` override while "Submit for Review" used the default `TaskButton` sizing (`px-4 py-2.5 text-[13px]`), making them different heights.

### Actual Changes Made

**Issue 1 — Flex column layout for Assign modal:**
- `DialogContent` className changed from default grid to `flex flex-col overflow-hidden p-6`
- Header wrapped in `flex-shrink-0 pb-2` — fixed, never scrolls
- Middle content on `flex-1 min-h-0 overflow-y-auto py-2 space-y-4` — the only scrollable section
- Footer wrapped in `flex-shrink-0 border-t border-white/[0.06] pt-3` — fixed, always visible at bottom
- Removed `sticky bottom-0` and the old `max-h-[55vh] overflow-y-auto pr-1 grid gap-4` approach

**Issue 2 — Uniform button sizing on task cards:**
- Removed `className="px-3 py-1.5 text-[12px]"` override from View Details `TaskButton`
- Both View Details (secondary variant) and Submit for Review (primary variant) now use the same default sizing (`px-4 py-2.5 text-[13px]`)

### Files Touched
- `app/(workspace)/tasks/page.tsx` — Assign modal layout restructure, button class cleanup
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] Assign modal header stays fixed, middle content scrolls, footer pinned at bottom
- [ ] Assign Task button always visible regardless of milestone count
- [ ] All form fields reachable when scrolling with many milestones
- [ ] Task creation still works correctly (handleCreateTask unchanged)
- [ ] View Details + Submit for Review buttons match in vertical sizing
- [ ] Both card buttons still trigger correct handlers

---

## [2026-07-07] Redesign Polish Pass — Card Heights, Chips, Scroll, Buttons

### Status: Completed

### Root Cause
Four visual gaps from the original redesign spec remained after the initial pass: card footer inconsistency, chips outside fields, unscrollable create modal, and weak completion-review drop-zone contrast.

### Actual Changes Made

**Issue 1 — Consistent card heights:**
- Removed conditional footer on task cards (`!isComplete &&` gate)
- Every card now always renders the same footer section with a secondary-style "View Details" button
- Completed cards keep the subtitle opacity-70 but get the same structural bottom section
- Result: all cards in the grid have identical height regardless of status

**Issue 2a — Chips inside field containers:**
- "Assign To" and "Can View Progress" fields now render as a visual container (`rounded-[10px] bg-[#0B0F1A] border border-white/[0.08] px-3 py-2 space-y-2`) with the Select trigger stripped of its own border/background, and chips rendering inside the same box below the trigger
- Select trigger styled as borderless with full container-width area

**Issue 2b — Scrolling modal content:**
- Create modal content wrapper given `max-h-[55vh] overflow-y-auto pr-1` so the form scrolls independently
- DialogFooter made `sticky bottom-0` with `bg-[#121826]` and `pt-3` padding so "Assign Task" button always stays visible at the bottom regardless of milestone count

**Issue 3 — Button styling + spacing:**
- "View Details" changed from `TaskButtonGhost` to `TaskButton variant="secondary"` with `px-3 py-1.5 text-[12px]` — renders as a proper outlined button with border and hover state
- Action button row changed from `justify-between` to natural `gap-2` flow — buttons sit close together as a related group

**Issue 4 — Completion drop-zone contrast + disabled button:**
- Purple tint strengthened: border `#8B5CF6/40` (was `/30`), background `#8B5CF6/[0.08]` (was `/[0.04]`) — significantly more visible
- Disabled button opacity bumped from `opacity-40` to `opacity-50` on both `TaskButton` and `TaskButtonGhost` — still clearly disabled but legible

### Files Touched
- `app/(workspace)/tasks/page.tsx` — card footer restructure, chip containers, scrollable modal, secondary button, sticky footer
- `components/tasks/file-drop-zone.tsx` — stronger purple tint
- `components/tasks/task-button.tsx` — disabled opacity 40→50
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] All task cards render at consistent height across statuses
- [ ] "View Details" styled as secondary/outline button on every card
- [ ] Completed cards still show View Details (can inspect completed tasks)
- [ ] Assignee chips render inside the field container, not below it
- [ ] Can View Progress chips render inside the field container
- [ ] Create modal scrolls with many milestones; Assign Task button always visible
- [ ] Status filter tabs unchanged (card map still uses getTasksByStatus)
- [ ] Sort-by control unchanged
- [ ] Completion drop-zone tint clearly distinguishable from progress drop-zone
- [ ] Disabled Submit for Completion button still legible (50% opacity)
- [ ] Assignee selection still saves correct people (only visual container changed)
- [ ] Milestone builder still works correctly
- [ ] Completion review mandatory file enforcement unchanged (frontend logic untouched)

---

## [2026-07-07] Fix Duplicate getTasksByStatus Declaration

### Status: Completed

### Root Cause
During the taskboard visual redesign, a second `getTasksByStatus` was introduced at line 456 operating on `sortedTasks` for the new sort-by feature, but the original declaration at line 415 operating on raw `filteredTasks` was not removed. This caused `Identifier 'getTasksByStatus' has already been declared` at build time.

### Actual Changes Made
- Removed the old `getTasksByStatus` declaration (line 415, operating on `filteredTasks`)
- Kept the new one (line 455, operating on `sortedTasks`) — this correctly supports both status filtering and sort-by-date/priority since `sortedTasks` is derived from `filteredTasks`

### Files Touched
- `app/(workspace)/tasks/page.tsx` — removed duplicate line 415
- `supabase/CHANGES.md` — this entry

---

## [2026-07-07] Task Panel Visual Redesign (Frontend Only)

### Status: Completed

### Summary
Pure visual/layout restyle of all task-related screens: taskboard dashboard, task detail modal (both assigner and employee views), review-progress modal, assign-new-task modal, submit-for-review modal (progress + completion states), milestone review dialogs, and manage/edit milestone dialogs. Zero functional changes — every button calls the exact same handler, every form submits identical data, every conditional render behaves identically.

### Design System Applied

**Colors:** Dark theme across surface layers — page `#0B0F1A`, card/modal `#121826`, inset surfaces `#0F1523`, borders `rgba(255,255,255,0.06-0.08)`. Text: primary `#F1F5F9`, secondary `#CBD5E1/#94A3B8`, muted `#64748B`, disabled `#475569`.

**Status/priority pills:** Shared `StatusPill` and `PriorityPill` components — clean rounded pills with status-colored dot (priority) or tinted background (status), replacing old colored badges and heavy left-border bars on cards.

**Buttons:** `TaskButton` and `TaskButtonGhost` components — 10px radius, consistent padding. Variants: primary (blue `#3B82F6`), primary-purple (`#8B5CF6`), primary-amber (`#FBBF24` + dark text), secondary (transparent + border).

**File drop-zone:** Unified `FileDropZone` component used everywhere — 1.5px dashed border, upload icon, "Drag a file here or click to browse" text, 10px radius. Required state (completion review) uses purple tint + calm helper line instead of red warning blocks.

**Progress:** `CardProgressBar` (5px rounded track with status-colored fill) and `ProgressRing` (SVG circle with percentage center) components.

**Milestone rows:** `MilestoneStatusBadge` component — tinted pill per status (not_started, in_progress, pending_review, needs_revision, approved). Used in both View Details stepper and Manage Milestones dialog.

### New Shared Components (`components/tasks/`)
| File | Purpose |
|------|---------|
| `status-pill.tsx` | Status pill with tinted background per status |
| `priority-pill.tsx` | Priority pill with colored dot |
| `milestone-status-badge.tsx` | Milestone status badge |
| `file-drop-zone.tsx` | Unified file attachment drop-zone (neutral/blue/purple tints, required flag) |
| `task-button.tsx` | `TaskButton` (primary/purple/amber/secondary) and `TaskButtonGhost` |
| `card-progress-bar.tsx` | Thin 5px progress bar with status-colored fill |
| `progress-ring.tsx` | SVG circular progress ring with percentage |

### Screen-by-Screen Changes

1. **Taskboard:** Simplified header (flat title + subtitle, no gradient hero). New "Sort by" toggle (Date assigned / Priority). Filter tabs restyled as compact segmented control. Cards redesigned: status pill + priority pill on top row, due date right-aligned, no colored left-border bar, milestone chip showing "N/M approved", progress bar at bottom.

2. **View Details (assigner):** Status + priority pills in header. Progress card with ring on `#0F1523` inset surface. Milestone section with Manage button. Milestone rows with proper dark-tinted backgrounds per state. File rows restyled.

3. **View Details (employee):** Same modal, "Assigned to you" context-aware label. Actionable milestone gets blue-tinted border + inline Start/Submit buttons.

4. **Review Progress (assigner):** Slider with current value shown prominently, 0%/50%/100% tick labels, amber thumb/fill. Assignee's notes shown as quoted inset with left accent border. File drop-zone unified.

5. **Assign New Task:** Dark-themed inputs/selects. Two-column grid for Priority + Due Date. Assignee selections render as removable chips inside the field area. Milestone builder in its own bordered inset section with numbered circles.

6. **Submit for Review:** Two selectable option cards (Progress Update / Completion Review) with colored border + tinted background on selection. Unified file drop-zone with progress-blue tint (optional) or completion-purple tint (required).

7. **Milestone Review:** Unified file drop-zone replacing old file input.

8. **Manage/Edit Milestones:** Dark-themed, `MilestoneStatusBadge` usage, consistent button styling.

### Files Touched
- `components/tasks/status-pill.tsx` (new)
- `components/tasks/priority-pill.tsx` (new)
- `components/tasks/milestone-status-badge.tsx` (new)
- `components/tasks/file-drop-zone.tsx` (new)
- `components/tasks/task-button.tsx` (new)
- `components/tasks/card-progress-bar.tsx` (new)
- `components/tasks/progress-ring.tsx` (new)
- `app/(workspace)/tasks/page.tsx` — full JSX restyle, imports cleaned up
- `supabase/CHANGES.md` — this entry

### Regression Verification
- [ ] Start task (non-milestone) → sets 15%, status in_progress
- [ ] Start task (milestone) → first milestone starts, progress stays 0
- [ ] Submit progress review (no file) → pending_review, notes saved
- [ ] Submit progress review (with file) → file uploaded, assigner sees it
- [ ] Submit completion review → requires file (still enforced), goes to pending_completion_review
- [ ] Assigner approve completion → marks completed, progress 100%
- [ ] Assigner reject completion → returns to in_progress with feedback
- [ ] Assignee cannot self-complete (only assigner can)
- [ ] File viewing/download for all attachment types (blob-based download)
- [ ] Inline "Start" button on milestone → milestone status → in_progress
- [ ] Bottom "Start First Milestone" → milestone starts, dialog closes
- [ ] Sequential milestone locking intact (M2 locked until M1 approved)
- [ ] Milestone submit for review → pending_review, assigner sees it
- [ ] Milestone approve → approved, progress recalculated
- [ ] Milestone reject → needs_revision, re-submittable
- [ ] Manage Milestones: add/edit/reorder/delete all work
- [ ] Assignee multi-select saves correct people (visual only changed — chips inside field)
- [ ] Due date/time saving unchanged
- [ ] Priority selection unchanged

---

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
