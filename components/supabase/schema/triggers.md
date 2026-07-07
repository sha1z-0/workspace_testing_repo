# Database Triggers

> Verified from `information_schema.triggers` on 2026-06-28

---

| # | Table | Trigger Name | Event | Function | Timing |
|---|---|---|---|---|---|
| 1 | `task_milestones` | trigger_update_milestone_count | INSERT | update_task_milestone_count() | AFTER |
| 2 | `task_milestones` | trigger_update_milestone_count | DELETE | update_task_milestone_count() | AFTER |
| 3 | `activity_logs` | update_last_active_on_login | INSERT | update_user_last_active() | AFTER |

---

## Trigger Details

### 1 & 2. `trigger_update_milestone_count` on `task_milestones`

- **Fires:** AFTER INSERT or DELETE on any `task_milestones` row
- **Calls:** `update_task_milestone_count()`
- **Effect:** Recalculates and updates `tasks.milestone_count` for the parent task
- **Logic:** `SELECT COUNT(*) FROM task_milestones WHERE task_id = ...`
- **Handles:** Both NEW.task_id (INSERT) and OLD.task_id (DELETE) via COALESCE

**Why two entries?** Trigger is registered for both INSERT and DELETE events on the same trigger name.

### 3. `update_last_active_on_login` on `activity_logs`

- **Fires:** AFTER INSERT on any `activity_logs` row
- **Calls:** `update_user_last_active()`
- **Effect:** Updates `users.last_active` = `activity_logs.created_at` for the corresponding user
- **Match:** `WHERE uid = NEW.user_id`

---

## Trigger Flow

### Task Milestone Lifecycle

```
INSERT task_milestones (task_id = 'abc')
  ↓ AFTER INSERT trigger fires
  ↓ update_task_milestone_count()
  ↓ UPDATE tasks SET milestone_count = COUNT(*) WHERE id = 'abc'
  ↓ tasks.milestone_count is now accurate

DELETE task_milestones (task_id = 'abc')
  ↓ AFTER DELETE trigger fires
  ↓ update_task_milestone_count()
  ↓ UPDATE tasks SET milestone_count = COUNT(*) WHERE id = 'abc'
  ↓ tasks.milestone_count is now accurate
```

### User Login Activity

```
User logs in
  ↓ auth-provider.tsx creates activity_log record
  ↓ INSERT INTO activity_logs (user_id, action, ...)
  ↓ AFTER INSERT trigger fires
  ↓ update_user_last_active()
  ↓ UPDATE users SET last_active = NEW.created_at WHERE uid = NEW.user_id
  ↓ users.last_active is now current
```

---

## Notes

- All triggers use `AFTER` timing — they run after the data change is committed
- `trigger_update_milestone_count` uses `COALESCE(NEW, OLD)` to handle both INSERT (NEW populated) and DELETE (OLD populated)
- No `UPDATE` triggers exist — milestone count doesn't update on milestone edits (only insert/delete)
- The login activity trigger is the mechanism that keeps `users.last_active` accurate without any application code
