# Coding Agent Prompt — Nearest Deadline Sort Option
> **Planned by:** Master Agent
> **Date:** 2026-07-15
> **Target Files:** `app/(workspace)/tasks/page.tsx`, `supabase/CHANGES.md`

---

> **CODING AGENT — READ THIS FULLY BEFORE TOUCHING ANY FILE.**
> **FOLLOW EVERY STEP EXACTLY AS WRITTEN. DO NOT SKIP ANYTHING.**
> **UPDATE `supabase/CHANGES.md` AS THE FINAL STEP.**

---

## Context
The user wants a new sorting option on the Tasks page called "Nearest Deadline". It should sort tasks based on which due date and time is closest to the current date and time (absolute time difference from `Date.now()`).

Additionally, the existing `"date"` sort is labeled "Date assigned" in the UI, but it was incorrectly sorting by the task's due date. We will fix it to properly sort by `createdAt` (Date assigned), and dedicate the new `"deadline"` sort specifically to due dates.

---

## 🗄️ Supabase SQL Changes
**None required.** This is purely a frontend sorting and UI state change.

---

## PROMPT 1 — Sorting Logic & UI Update (`app/(workspace)/tasks/page.tsx`)

### Step 1 — Update `sortBy` State
Find the `sortBy` state declaration (~line 566):
```ts
const [sortBy, setSortBy] = useState<"date" | "priority">("date")
```
Update it to include the new `"deadline"` option:
```ts
const [sortBy, setSortBy] = useState<"date" | "priority" | "deadline">("date")
```

### Step 2 — Update the `sortedTasks` logic
Find the `sortedTasks` computation (~line 568). Replace the entire `sort` callback with the following logic. This ensures "Date assigned" sorts by `createdAt` (newest first), "Priority" stays as is, and "Nearest Deadline" sorts by absolute time difference from right now.

```ts
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 }
      return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2)
    }
    
    if (sortBy === "deadline") {
      const dateA = a.dueDatetime || a.dueDate
      const dateB = b.dueDatetime || b.dueDate
      if (!dateA && !dateB) return 0
      if (!dateA) return 1   // push tasks with no deadline to the bottom
      if (!dateB) return -1
      
      const now = Date.now()
      const diffA = Math.abs(new Date(dateA).getTime() - now)
      const diffB = Math.abs(new Date(dateB).getTime() - now)
      return diffA - diffB
    }

    // Default "date" (Date assigned) - newest first
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return createdB - createdA
  })
```

### Step 3 — Update the Sort Toggle Button UI
Find the sort button in the Controls Bar (~line 780):
```tsx
<button
  type="button"
  onClick={() => setSortBy(sortBy === "date" ? "priority" : "date")}
  className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-[#121826] px-3 py-2 text-[13px] font-medium text-[#CBD5E1] hover:bg-white/[0.04] transition-colors"
>
  <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
  Sort by: <span className="text-[#F1F5F9]">{sortBy === "date" ? "Date assigned" : "Priority"}</span>
  <ChevronDown className="h-3 w-3 text-[#64748B]" />
</button>
```
Update the `onClick` handler to cycle through all 3 options, and update the display text to match:
```tsx
<button
  type="button"
  onClick={() => {
    if (sortBy === "date") setSortBy("priority")
    else if (sortBy === "priority") setSortBy("deadline")
    else setSortBy("date")
  }}
  className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-[#121826] px-3 py-2 text-[13px] font-medium text-[#CBD5E1] hover:bg-white/[0.04] transition-colors whitespace-nowrap"
>
  <ArrowUpDown className="h-3.5 w-3.5 text-[#64748B]" />
  Sort by: <span className="text-[#F1F5F9]">
    {sortBy === "date" ? "Date assigned" : sortBy === "priority" ? "Priority" : "Nearest Deadline"}
  </span>
  <ChevronDown className="h-3 w-3 text-[#64748B]" />
</button>
```

---

## 📝 Update `supabase/CHANGES.md`

Add a new entry at the top of `supabase/CHANGES.md`:

```markdown
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
```
