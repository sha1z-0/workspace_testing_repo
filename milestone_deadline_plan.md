# Coding Agent Plan — Mandatory Deadlines & Milestone Enforcements
> **Planned by:** Master Agent
> **Date:** 2026-07-15
> **Target Files:** `lib/api.ts`, `app/(workspace)/tasks/page.tsx`, `supabase/CHANGES.md`

---

> **CODING AGENT — READ THIS FULLY BEFORE TOUCHING ANY FILE.**
> **FOLLOW EVERY STEP EXACTLY AS WRITTEN. DO NOT SKIP ANYTHING.**
> **UPDATE `supabase/CHANGES.md` AS THE FINAL STEP.**

---

## Context
1. **Task Assignment Validation**: Task Name, Assigned To, Description, Due Date, Due Time must all be mandatory.
2. **Milestone Deadlines**: Milestones now get Due Date & Due Time logic exactly like tasks.
3. **Milestone Deadline Enforcement**: `submission_open` logic is applied to milestones. Assigner can close/open it. Assignee cannot submit if closed.
4. **Milestone Editing**: Due Date and Time included in all milestone edits.
5. **Mandatory Validation for Milestones**: Milestone Name, Description, Due Date, Due Time must be mandatory.

---

## 🗄️ Supabase SQL Changes (Run First)

> **Run this in the Supabase SQL Editor BEFORE making code changes.**

```sql
-- Add due_datetime and submission_open to task_milestones
ALTER TABLE task_milestones ADD COLUMN IF NOT EXISTS due_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE task_milestones ADD COLUMN IF NOT EXISTS submission_open BOOLEAN DEFAULT true;

-- Update RLS for task_milestones if necessary (assignee needs to update but maybe blocked if closed?)
-- For now, the API layer will enforce submission_open during submitMilestoneReview.
```

---

## PROMPT 1 — API Layer Updates (`lib/api.ts`)

### Step 1 — Update `createTask` milestone mapping
Find `createTask` in `lib/api.ts`. Inside the block that processes `milestones` (~line 773), update `milestoneInserts` mapping to include `due_datetime`:
```ts
const milestoneInserts = milestones.map((m, i) => {
  const milestoneDueDatetime = m.dueDate && m.dueTime 
    ? new Date(`${m.dueDate}T${m.dueTime}:00`).toISOString() 
    : m.dueDate ? new Date(`${m.dueDate}T23:59:59`).toISOString() : null;

  return {
    task_id: data.id,
    title: m.title,
    description: m.description || null,
    due_datetime: milestoneDueDatetime,
    weight: m.weight || (i < remainder ? evenWeight + 1 : evenWeight),
    order_index: i
  }
})
```

### Step 2 — Add `toggleMilestoneSubmission`
Add this new function inside `tasksAPI` (below `toggleSubmission`):
```ts
  toggleMilestoneSubmission: async (milestoneId: string, open: boolean) => {
    try {
      const { data, error } = await supabase
        .from("task_milestones")
        .update({
          submission_open: open,
          updated_at: new Date().toISOString()
        })
        .eq("id", milestoneId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error("Error toggling milestone submission:", error)
      throw error
    }
  },
```

### Step 3 — Enforce `submission_open` in `submitMilestoneReview`
Find `submitMilestoneReview` (~line 1207). Add `submission_open` to the select query:
```ts
const { data: milestone } = await supabase.from("task_milestones").select("task_id, order_index, status, submission_open").eq("id", milestoneId).single()
```
Add validation before proceeding:
```ts
if (milestone.submission_open === false) {
  throw new Error("The submission deadline for this milestone has been closed by the assigner.")
}
```

### Step 4 — Update `addMilestone`
Update the `addMilestone` signature and payload mapping:
```ts
  addMilestone: async (taskId: string, milestone: { title: string; description?: string; dueDate?: string; dueTime?: string; weight?: number }) => {
    const { data: existing } = await supabase.from("task_milestones").select("*").eq("task_id", taskId).order("order_index")
    const newIndex = existing ? existing.length : 0

    const milestoneDueDatetime = milestone.dueDate && milestone.dueTime 
      ? new Date(`${milestone.dueDate}T${milestone.dueTime}:00`).toISOString() 
      : milestone.dueDate ? new Date(`${milestone.dueDate}T23:59:59`).toISOString() : null;

    const insertPayload: any = {
      task_id: taskId,
      title: milestone.title,
      description: milestone.description || null,
      due_datetime: milestoneDueDatetime,
      order_index: newIndex,
      weight: milestone.weight || 0
    }
```

### Step 5 — Update `updateMilestone`
Update `updateMilestone` signature:
```ts
  updateMilestone: async (id: string, dataUpdates: Partial<{ title: string; description: string; weight: number; status: string; due_datetime: string; submission_open: boolean }>) => {
    const updateData: any = { ...dataUpdates, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from("task_milestones").update(updateData).eq("id", id).select().single()
    if (error) throw error
    return data
  },
```

---

## PROMPT 2 — UI Validation & Tasks Page Adjustments (`app/(workspace)/tasks/page.tsx`)

### Step 1 — Add error states for mandatory dates
Near the top of the component state variables:
```ts
const [dueDateError, setDueDateError] = useState(false)
const [dueTimeError, setDueTimeError] = useState(false)
const [milestoneFormError, setMilestoneFormError] = useState(false)
```

### Step 2 — Expand `newTask.milestones` type
Update the `newTask` state definition (~line 95) so the `milestones` array accepts the new properties:
```ts
milestones: [] as { title: string; description: string; dueDate: string; dueTime: string; weight?: number }[]
```

### Step 3 — Apply Task Mandatory Validations
Find `handleCreateTask` (~line 266). After checking description and assigneeIds, add:
```ts
// Validate: Due Date and Due Time are mandatory
if (!newTask.dueDate) {
  setDueDateError(true)
  return
}
setDueDateError(false)

if (!newTask.dueTime) {
  setDueTimeError(true)
  return
}
setDueTimeError(false)
```

In `setNewTask({ ... })` at the end of `handleCreateTask`, reset these error states:
```ts
setDueDateError(false)
setDueTimeError(false)
```

In the Create Task modal JSX, find Due Date and Due Time inputs. Update them to show inline red text errors and red borders when `dueDateError` or `dueTimeError` is true (just like `assigneeError` does for Assignment). Don't forget to update their `onChange` to clear the errors. 
Add `<span className="text-red-400">*</span>` to their labels.

---

## PROMPT 3 — Milestone Editing & Creation UI (`app/(workspace)/tasks/page.tsx`)

### Step 1 — Milestone Creation inline forms
When a user is creating a task and clicks "+ Add Milestone", the form adds a new element to `newTask.milestones`.
Make sure the UI inputs inside the mapped `newTask.milestones` include Due Date and Due Time.
Make sure the Add button validation ensures `title`, `description`, `dueDate`, `dueTime` are filled before allowing addition.

### Step 2 — Manage Milestones Dialog (`handleAddMilestoneMidTask`)
Add `newMilestoneDueDate`, `newMilestoneDueTime`, `newMilestoneDescription` states.
In the Manage Milestones Dialog "Add" section, render inputs for Description, Due Date, and Due Time.
`handleAddMilestoneMidTask` should validate these fields (all mandatory) before calling `tasksAPI.addMilestone`.

### Step 3 — Edit Milestone Dialog
Update `editingMilestone` schema to handle `due_datetime` and convert back to date/time strings for inputs.
Add Date and Time inputs to the Edit Milestone Dialog. 
When saving (`handleEditMilestone`), construct the `due_datetime` string and pass it to `tasksAPI.updateMilestone`. Validate that none of the inputs are left empty.

---

## PROMPT 4 — Milestone Deadline Enforcement UI (`app/(workspace)/tasks/page.tsx`)

### Step 1 — Assigner Toggle UI
In the View Details modal, in the milestone iteration block, check if `m.submission_open` is true/false.
If `isAssgnr` is true (manager view), add a toggle (like the Unlock/Lock button for tasks) next to the milestone to `tasksAPI.toggleMilestoneSubmission(m.id, !m.submission_open)`.

### Step 2 — Assignee Submission Block
In the milestone iteration block, if `canSubmit` is true but `m.submission_open === false`, render the submit button as disabled with a Lock icon (indicating the deadline is closed), similar to how task deadline closure is handled.
Display the Milestone Due Date & Time in the milestone row UI.

---

## 📝 Update `supabase/CHANGES.md`
Instruct the coding agent to summarize all changes made across `lib/api.ts` and `app/(workspace)/tasks/page.tsx` for this epic, emphasizing the SQL alterations, API enforcement, and the extensive mandatory field validations.

### Verification Checklist for Coding Agent
- [ ] Task Creation blocked if Due Date or Due Time is empty.
- [ ] Milestone addition blocked if Name, Description, Due Date, Due Time are empty.
- [ ] Editing milestone supports changing Due Date & Time.
- [ ] Assigner can toggle `submission_open` for a milestone.
- [ ] Assignee cannot submit a milestone if `submission_open` is false.
