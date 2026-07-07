# Database Schema — All 16 Tables

> Verified from `information_schema.columns` on 2026-06-28

---

## Table Inventory

| # | Table | Rows (approx) | API Module | Status |
|---|---|---|---|---|
| 1 | `users` | 13 | usersAPI | Active |
| 2 | `projects` | — | projectsAPI | Active |
| 3 | `tasks` | — | tasksAPI | Active (missing 10 columns) |
| 4 | `announcements` | — | announcementsAPI | Active |
| 5 | `notifications` | — | notificationsAPI | Active |
| 6 | `calendar_events` | — | calendarEventsAPI | Active |
| 7 | `chat_messages` | — | chatAPI | Active |
| 8 | `chat_groups` | — | chatAPI | Active |
| 9 | `warnings` | — | warningsAPI | Active |
| 10 | `time_tracking` | — | timeTrackingAPI | Active |
| 11 | `departments` | — | departmentsAPI | Active |
| 12 | `teams` | — | teamsAPI | Active (missing project_id/name) |
| 13 | `task_milestones` | — | ❌ NONE | Not implemented |
| 14 | `files` | — | ❌ NONE | Not implemented |
| 15 | `files_department_shares` | — | ❌ NONE | Not implemented |
| 16 | `activity_logs` | — | ❌ NONE | Not implemented |

---

## 1. `users` — 11 columns

User accounts and profiles. Primary identity table.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `uid` | text | NO | — | Supabase Auth UID |
| `name` | text | NO | — | Display name |
| `email` | text | NO | — | Login email (@finovasolutions.tech) |
| `role` | text | NO | — | CEO, C_LEVEL, LEAD, EMPLOYEE |
| `department` | text | NO | — | Department name |
| `status` | text | YES | 'active' | active, inactive, suspended |
| `email_verified` | boolean | YES | false | |
| `avatar` | text | YES | — | Avatar URL |
| `created_at` | timestamptz | YES | now() | |
| `last_active` | timestamptz | YES | now() | Auto-updated by trigger |

**Relationships:** Referenced by 14 other tables via uid (lead_id, created_by, assignee_id, author_id, user_id, sender_id, organizer_id, uploaded_by, head_id, leader_id, issuer_id, recipient_id)

**Notable:** Role-based executive accounts exist: ceo@, coo@, cso@, cto@

---

## 2. `projects` — 13 columns

Project tracking with status, progress, and team assignment.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | |
| `name` | text | NO | — | |
| `description` | text | YES | — | |
| `status` | text | NO | — | |
| `progress` | integer | YES | 0 | 0-100 |
| `start_date` | date | NO | — | DATE type, not timestamp |
| `end_date` | date | NO | — | DATE type |
| `lead_id` | text | NO | — | References users.uid |
| `lead_name` | text | YES | — | |
| `team_members` | text[] | YES | ARRAY[]::text[] | Array of user UIDs |
| `created_by` | text | NO | — | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

**Relationships:** Referenced by tasks, teams, files, files_department_shares (via project_id)

---

## 3. `tasks` — 29 columns (19 referenced in code, 10 undocumented)

The most complex table. 10 columns exist in schema but are never read/written by the API layer.

### Columns Used by API (19):

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | |
| `title` | text | NO | — | |
| `description` | text | YES | — | |
| `status` | text | NO | — | |
| `priority` | text | NO | — | |
| `progress` | integer | YES | 0 | 0-100 |
| `assignee_id` | text | NO | — | Legacy single-assignee |
| `assignee_name` | text | YES | — | |
| `project_id` | uuid | YES | — | References projects.id |
| `project_name` | text | YES | — | |
| `due_date` | date | YES | — | |
| `created_by` | text | NO | — | |
| `created_by_name` | text | YES | — | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |
| `assignee_ids` | text[] | YES | ARRAY[]::text[] | Multi-assignee support |
| `assignee_names` | text[] | YES | ARRAY[]::text[] | |
| `viewer_ids` | text[] | YES | ARRAY[]::text[] | View-only access |
| `viewer_names` | text[] | YES | ARRAY[]::text[] | |

### Columns NOT Used by API (10 undocumented):

| Column | Type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `start_date` | timestamptz | YES | — | Task start (never populated) |
| `assignment_attachment_id` | text | YES | — | Manager-uploaded attachment |
| `assignment_attachment_name` | text | YES | — | Attachment filename |
| `assignment_attachment_url` | text | YES | — | Attachment URL |
| `assignment_attachment_download_url` | text | YES | — | Attachment download URL |
| `submission_attachment_id` | text | YES | — | Employee submission attachment |
| `submission_attachment_name` | text | YES | — | Submission filename |
| `submission_attachment_url` | text | YES | — | Submission URL |
| `submission_attachment_download_url` | text | YES | — | Submission download URL |
| `is_phased` | boolean | YES | false | Phased task workflow flag |
| `milestone_count` | integer | YES | 0 | Auto-calculated by trigger |

**Relationships:** Referenced by task_milestones (via task_id); references projects (project_id)

---

## 4. `announcements` — 8 columns

Company-wide announcements with read tracking.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `title` | text | NO | — |
| `content` | text | NO | — |
| `priority` | text | NO | — |
| `author_id` | text | NO | — |
| `author_name` | text | NO | — |
| `read_by` | text[] | YES | ARRAY[]::text[] |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## 5. `notifications` — 9 columns

Dashboard and bell-icon notifications. Well-designed RLS.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | text | NO | — |
| `type` | text | NO | — |
| `title` | text | NO | — |
| `body` | text | NO | — |
| `link_to` | text | YES | — |
| `related_item_id` | text | YES | — |
| `read` | boolean | YES | false |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## 6. `chat_messages` — 9 columns

Direct and group messages. **Has critical RLS vulnerability.**

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `text` | text | NO | — |
| `sender_id` | text | NO | — |
| `sender_name` | text | YES | — |
| `sender_avatar` | text | YES | — |
| `recipient_id` | text | YES | — |
| `group_id` | text | YES | — |
| `is_read` | boolean | YES | false |
| `created_at` | timestamptz | YES | now() |

---

## 7. `chat_groups` — 8 columns

Group chat definitions.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `members` | text[] | YES | ARRAY[]::text[] |
| `created_by` | text | NO | — |
| `avatar` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## 8. `calendar_events` — 17 columns

Meetings and events with Google Calendar + SendGrid + notification integration.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | |
| `title` | text | NO | — | |
| `description` | text | YES | — | |
| `start_time` | timestamptz | NO | — | |
| `end_time` | timestamptz | NO | — | |
| `location` | text | YES | — | |
| `event_type` | text | NO | — | meeting, event |
| `organizer_id` | text | NO | — | |
| `organizer_name` | text | YES | — | |
| `organizer_email` | text | YES | — | |
| `attendees` | text[] | YES | — | |
| `invited_member_ids` | text[] | YES | — | |
| `send_calendar_invite` | boolean | YES | false | Triggers SendGrid |
| `send_email_reminder` | boolean | YES | false | |
| `add_to_google_calendar` | boolean | YES | false | Triggers Google Calendar API |
| `notify_on_dashboard` | boolean | YES | true | Triggers notification creation |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

---

## 9. `warnings` — 15 columns

Employee disciplinary warnings with resolution workflow.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | text | NO | — |
| `user_name` | text | NO | — |
| `issuer_id` | text | NO | — |
| `issuer_name` | text | NO | — |
| `title` | text | NO | — |
| `description` | text | NO | — |
| `severity` | text | NO | — |
| `status` | text | YES | 'active' |
| `department_id` | text | YES | — |
| `department_name` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `resolved_at` | timestamptz | YES | — |
| `resolved_by` | text | YES | — |
| `resolved_reason` | text | YES | — |

---

## 10. `time_tracking` — 11 columns

Session-based time tracking for admin roles.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | text | NO | — |
| `user_name` | text | NO | — |
| `user_role` | text | NO | — |
| `start_time` | timestamptz | NO | — |
| `end_time` | timestamptz | YES | — |
| `duration` | integer | YES | 0 |
| `is_active` | boolean | YES | true |
| `auto_ended` | boolean | YES | false |
| `device` | jsonb | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## 11. `departments` — 7 columns

Organizational structure.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `head_id` | text | YES | — |
| `head_name` | text | YES | — |
| `member_count` | integer | YES | 0 |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

---

## 12. `teams` — 11 columns

Team structure with project linking capability (unused in code).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() | |
| `name` | text | NO | — | |
| `description` | text | YES | — | |
| `department` | text | NO | — | |
| `members` | text[] | YES | ARRAY[]::text[] | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |
| `leader_id` | text | YES | — | |
| `leader_name` | text | YES | — | |
| `project_id` | uuid | YES | — | **NOT READ/WRITTEN by API** |
| `project_name` | text | YES | — | **NOT READ/WRITTEN by API** |

---

## 13. `task_milestones` — 11 columns (NO API COVERAGE)

Subtasks/milestones within tasks. Has well-designed RLS and auto-update trigger.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `task_id` | uuid | NO | References tasks.id |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `due_date` | date | NO | — |
| `status` | text | NO | 'pending' |
| `order_index` | integer | NO | 0 |
| `completed_at` | timestamptz | YES | — |
| `completed_by` | text | YES | — |
| `completed_by_name` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

**Connected:** `calculate_milestone_progress()` function, `trigger_update_milestone_count` trigger, well-designed RLS policies — all infrastructure ready, just no frontend.

---

## 14. `files` — 16 columns (NO API COVERAGE)

User file uploads with sharing and project/department scoping.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `name` | text | NO | — |
| `description` | text | YES | — |
| `storage_path` | text | NO | — |
| `file_type` | text | YES | — |
| `file_size` | bigint | YES | — |
| `uploaded_by` | text | NO | — |
| `uploaded_by_name` | text | NO | — |
| `shared_with` | text[] | YES | ARRAY[]::text[] |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `project_id` | uuid | YES | — |
| `project_name` | text | YES | — |
| `department_id` | uuid | YES | — |
| `department_name` | text | YES | — |

**Note:** Storage bucket `uploads` exists with folders matching this schema but has NO RLS policies.

---

## 15. `files_department_shares` — 12 columns (NO API COVERAGE)

Department-level file sharing with granular role-based RLS.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `file_id` | text | NO | — |
| `file_name` | text | NO | — |
| `file_path` | text | NO | — |
| `department_id` | uuid | NO | — |
| `uploaded_by` | text | NO | — |
| `uploaded_by_name` | text | NO | — |
| `description` | text | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |
| `project_id` | uuid | YES | — |
| `project_name` | text | YES | — |

---

## 16. `activity_logs` — 8 columns (NO API COVERAGE)

Login audit trail. Well-designed role-based RLS. Auto-updates `users.last_active`.

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | uuid_generate_v4() |
| `user_id` | text | NO | — |
| `user_name` | text | NO | — |
| `user_email` | text | NO | — |
| `user_role` | text | NO | — |
| `action` | text | NO | — |
| `ip_address` | text | YES | — |
| `user_agent` | text | YES | — |
| `created_at` | timestamptz | YES | now() |

---

## Entity Relationships

```
users ─────────────────────────────────────────────────────────────────
  │    │    │    │    │    │    │    │    │    │    │    │    │    │
  ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼    ▼
projects  tasks  announcements  time_tracking  departments  teams
  │        │                                  │          │        │
  │   task_milestones                         │          │   chat_messages
  │        │                                  │          │   chat_groups
  │        │                                  │          │   calendar_events
  │        │                                  │          │   notifications
  │        │                                  │          │   warnings
  │        │                                  │          │   activity_logs
  │        │                                  │          │   files
  │        │                                  │          │   files_department_shares
  └────────┴────────── teams (project_id) ────┴──────────┘
                         files (project_id)
                         files_department_shares (project_id)
```
