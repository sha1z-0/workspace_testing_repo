# Database Functions

> Verified from `pg_proc` on 2026-06-28

---

## Function Inventory

| # | Function | Returns | Language | Notes |
|---|---|---|---|---|
| 1 | `calculate_milestone_progress(p_task_id uuid)` | integer | plpgsql | Returns 0-100% progress |
| 2 | `is_user_assigned_to_task(task_assignees text[], user_uid text)` | boolean | plpgsql | IMMUTABLE — array check |
| 3 | `is_user_assigned_to_task(task_assignees text[], task_viewers text[], user_uid text)` | boolean | plpgsql | IMMUTABLE — overloaded |
| 4 | `update_task_milestone_count()` | trigger | plpgsql | Auto-updates tasks.milestone_count |
| 5 | `update_user_last_active()` | trigger | plpgsql | Auto-updates users.last_active |

---

## Function Sources

### 1. `calculate_milestone_progress`

Returns percentage of completed milestones for a task.

```sql
CREATE OR REPLACE FUNCTION public.calculate_milestone_progress(p_task_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
    total_milestones INTEGER;
    completed_milestones INTEGER;
    progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_milestones
    FROM task_milestones
    WHERE task_id = p_task_id;

    IF total_milestones = 0 THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO completed_milestones
    FROM task_milestones
    WHERE task_id = p_task_id AND status = 'completed';

    progress := ROUND(
        (completed_milestones::DECIMAL / total_milestones::DECIMAL) * 100
    );

    RETURN progress;
END;
$function$
```

**Usage:** Not called from any frontend code. Can be invoked directly in SQL or via Supabase client:

```typescript
const { data } = await supabase.rpc('calculate_milestone_progress', { p_task_id: taskId })
```

### 2. `is_user_assigned_to_task` (2-param overload)

Checks if a user UID is in the task_assignees array.

```sql
CREATE OR REPLACE FUNCTION public.is_user_assigned_to_task(
    task_assignees text[],
    user_uid text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    RETURN user_uid = ANY(task_assignees);
END;
$function$
```

### 3. `is_user_assigned_to_task` (3-param overload)

Checks if a user UID is in task_assignees OR task_viewers array.

```sql
CREATE OR REPLACE FUNCTION public.is_user_assigned_to_task(
    task_assignees text[],
    task_viewers text[],
    user_uid text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    RETURN user_uid = ANY(task_assignees) OR user_uid = ANY(task_viewers);
END;
$function$
```

**Usage in RLS:** Used by `task_milestones` RLS policies to check access.

### 4. `update_task_milestone_count`

Trigger function — updates `tasks.milestone_count` whenever milestones are added or removed.

```sql
CREATE OR REPLACE FUNCTION public.update_task_milestone_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE tasks
    SET milestone_count = (
        SELECT COUNT(*)
        FROM task_milestones
        WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    )
    WHERE id = COALESCE(NEW.task_id, OLD.task_id);

    RETURN COALESCE(NEW, OLD);
END;
$function$
```

### 5. `update_user_last_active`

Trigger function — updates `users.last_active` when activity is logged.

```sql
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE users
    SET last_active = NEW.created_at
    WHERE uid = NEW.user_id;
    RETURN NEW;
END;
$function$
```

---

## Usage Summary

| Function | Called By Code? | Called By RLS? | Called By Trigger? |
|---|---|---|---|
| `calculate_milestone_progress` | ❌ No | ❌ No | ❌ No |
| `is_user_assigned_to_task` (2-param) | ❌ No | ✅ task_milestones SELECT | ❌ No |
| `is_user_assigned_to_task` (3-param) | ❌ No | ✅ task_milestones ALL | ❌ No |
| `update_task_milestone_count` | ❌ No | ❌ No | ✅ task_milestones INSERT/DELETE |
| `update_user_last_active` | ❌ No | ❌ No | ✅ activity_logs INSERT |

**None of these functions are called directly from the Next.js application code.** Two are trigger-only, two are RLS-only, and `calculate_milestone_progress` is completely unused despite being the most valuable for the frontend.
