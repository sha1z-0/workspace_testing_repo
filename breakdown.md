# Finova Workspace — Complete Codebase Analysis Report

> **Project:** Finova Workspace (my-v0-project)
> **Version:** 0.1.0
> **Analysis Date:** 2026-06-23 (static code) / 2026-06-28 (live Supabase verified)
> **Prepared for:** Software Architecture & Technical Audit

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Summary](#2-tech-stack-summary)
3. [Architecture Summary](#3-architecture-summary)
4. [Repository Structure](#4-repository-structure)
5. [Frontend Analysis](#5-frontend-analysis)
6. [Backend Analysis](#6-backend-analysis)
7. [Database Analysis — Actual Live Schema (Verified 2026-06-28)](#7-database-analysis--actual-live-schema-verified-2026-06-28)
8. [RLS Policy Analysis — Full Live Policies (Verified 2026-06-28)](#8-rls-policy-analysis--full-live-policies-verified-2026-06-28)
9. [Database Functions & Triggers (Verified 2026-06-28)](#9-database-functions--triggers-verified-2026-06-28)
10. [Schema–Code Gap Analysis](#10-schemacode-gap-analysis)
11. [Authentication & Security — Tier 2 Verified](#11-authentication--security--tier-2-verified)
12. [API Documentation](#12-api-documentation)
13. [Data Flow Analysis](#13-data-flow-analysis)
14. [Feature Inventory](#14-feature-inventory)
15. [Dependency Analysis](#15-dependency-analysis)
16. [Configuration Analysis](#16-configuration-analysis)
17. [Deployment Analysis](#17-deployment-analysis)
18. [Performance Review](#18-performance-review)
19. [Code Quality Review](#19-code-quality-review)
20. [Technical Debt & Risks](#20-technical-debt--risks)
21. [Security Assessment](#21-security-assessment)
22. [RLS Vulnerabilities — CRITICAL Findings](#22-rls-vulnerabilities--critical-findings)
23. [Recommendations](#23-recommendations)
24. [Overall Codebase Health Score](#24-overall-codebase-health-score)

---

## 1. Project Overview

### What Is This Project?

**Finova Workspace** is a full-featured, internal virtual office platform built for **Finova Solutions**. It serves as a centralized hub where employees, team leads, and executives collaborate through a single, unified dashboard.

### Business Purpose

Replace scattered tools — separate chat apps, spreadsheet task trackers, email-chain announcements — with one integrated workspace.

### Intended Users

| Role | Access Level | Primary View |
|---|---|---|
| **CEO** | Full administrative | `/admin/ceo` — Company dashboard, user management, warnings, departments |
| **C-Level** | Management | `/admin/c-level` — Announcements, projects, team management |
| **Team Lead** | Team management | `/admin/lead` — Tasks, team performance, announcements |
| **Employee** | Self-service | `/dashboard` — Personal tasks, chat, calendar, files |

### Core Functionality

- **Role-based dashboards** — Different views and capabilities per role
- **Task Management** — Create, assign, track with priority, progress, due dates; Kanban board
- **Real-time Chat** — Direct messaging + group chat with polling
- **Calendar & Meetings** — Events/meetings with email invites, Google Calendar sync
- **Announcements** — Company-wide with read tracking
- **Project Management** — Status, progress, team assignments
- **Team Management** — Hierarchical structure with leads
- **Warning System** — Employee warnings with severity and resolution workflow
- **User Management** — CEO creates/edits/deletes users
- **Time Tracking** — Automatic for admin roles on login/logout
- **Notifications** — Bell icon with polling, dashboard popups

---

## 2. Tech Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 15.2.4 | Full-stack React framework |
| **Language** | TypeScript | ^5.0 | Type safety |
| **UI Library** | React | ^19 | Component-based frontend |
| **Styling** | Tailwind CSS | ^3.4.17 | Utility-first CSS |
| **UI Components** | shadcn/ui (Radix) | — | 53+ accessible UI primitives |
| **Database** | PostgreSQL (Supabase) | — | All data storage — 16 tables |
| **DB Extensions** | plpgsql, uuid-ossp, pgcrypto, pg_stat_statements, supabase_vault | — | 5 extensions (3 in use, 2 idle) |
| **Auth** | Supabase Auth (email/password) | — | Email-only, no social/OAuth; built-in SMTP (not production-grade) |
| **Storage** | Supabase Storage (`uploads` bucket) | — | 1 public bucket, 50MB limit, no RLS policies on bucket |
| **Backend** | Next.js API Routes | — | Serverless functions (6 routes); no Edge Functions deployed |
| **Email** | SendGrid (`@sendgrid/mail`) | ^8.1.5 | Meeting invitations |
| **Calendar** | Google APIs (`googleapis`) | ^148.0.0 | Google Calendar events |
| **State** | React Context | — | Auth state management |
| **Animations** | Framer Motion | ^12.29.2 | UI animations |
| **Drag & Drop** | dnd-kit | ^6-10 | Kanban board |
| **Charts** | Recharts | 2.15.0 | Analytics |
| **Forms** | React Hook Form + Zod | ^7.54 / ^3.24 | Form validation |
| **Icons** | Lucide React | ^0.454.0 | Icon set |
| **Dates** | date-fns | 4.1.0 | Date formatting |
| **Theme** | next-themes | ^0.4.4 | Dark/light mode |
| **PM** | npm / pnpm | — | Package management |

---

## 3. Architecture Summary

### Pattern: Client-Server (Monolithic with Next.js)

```
                        +------------------------+
                        |   USER (Browser)        |
                        +-----------+------------+
                                    |
                    +---------------+----------------+
                    |         Next.js App           |
                    |                              |
                    |  +------------------------+  |
                    |  |   Frontend Pages        |  |
                    |  |  - /dashboard           |  |
                    |  |  - /tasks               |  |
                    |  |  - /chat                |  |
                    |  |  - /calendar            |  |
                    |  |  - /admin/{ceo,c-level, |  |
                    |  |          lead}/*         |  |
                    |  +-----------+------------+  |
                    |              |               |
                    |  +-----------+------------+  |
                    |  |   Components Layer       |  |
                    |  |  - auth-provider         |  |
                    |  |  - admin/workspace       |  |
                    |  |    layouts               |  |
                    |  |  - notification-bell     |  |
                    |  |  - list components       |  |
                    |  |  - 53 shadcn/ui pieces   |  |
                    |  +-----------+------------+  |
                    |              |               |
                    |  +-----------+------------+  |
                    |  |   API Layer (lib/api.ts) |  |
                    |  |   12 API modules         |  |
                    |  +-----------+------------+  |
                    |              |               |
                    |  +-----------+------------+  |
                    |  |   Next.js API Routes     |  |
                    |  |  /api/users/*            |  |
                    |  |  /api/send-meeting-*     |  |
                    |  |  /api/google-calendar/*  |  |
                    |  |  /api/end-session        |  |
                    |  +------------------------+  |
                    +---------------+----------------+
                                    |
                    +---------------+----------------+
                    |          Supabase             |
                    |                              |
                    |  +------------------------+  |
                    |  |   PostgreSQL Database   |  |
                    |  |   16 tables             |  |
                    |  |   4 functions, 3 triggers|  |
                    |  |   60 RLS policies       |  |
                    |  +------------------------+  |
                    |                              |
                    |  +------------------------+  |
                    |  |   Supabase Auth         |  |
                    |  |   Email/password        |  |
                    |  |   JWT sessions via SSR  |  |
                    |  +------------------------+  |
                    +---------------+----------------+
                                    |
                    +---------------+----------------+
                    |      External Services        |
                    |                              |
                    |  +--------+  +------------+  |
                    |  |SendGrid|  | Google      |  |
                    |  |(Email) |  | Calendar API|  |
                    |  +--------+  +------------+  |
                    +-------------------------------+
```

### Key Architecture Decisions

1. **Monolithic Next.js** — Both frontend and backend live in the same project; API routes handle server-side operations
2. **Supabase as BaaS** — Handles database, authentication, and realtime; no separate backend server needed
3. **Role-based routing** — Route groups under `app/(workspace)/admin/{ceo,c-level,lead}/` with layouts that check user role
4. **Service role for admin ops** — User CRUD uses `SUPABASE_SERVICE_ROLE_KEY` for elevated privileges
5. **Polling over WebSockets** — Chat (10s) and notifications (30s) use polling rather than Realtime subscriptions
6. **Not static export** — `next.config.mjs` explicitly removed `output: 'export'` to support API routes

---

## 4. Repository Structure

```
Finova-Workspace-main/
|
+-- app/                              # Next.js App Router
|   +-- layout.tsx                    # Root layout (ThemeProvider -> AuthProvider -> Toaster)
|   +-- page.tsx                      # Landing -> redirects to /login
|   +-- globals.css                   # Global styles + Tailwind directives
|   +-- login/page.tsx                # Login screen
|   |
|   +-- (workspace)/                  # Route group (authenticated)
|   |   +-- layout.tsx                # Wraps AdminLayout with user role
|   |   +-- dashboard/page.tsx        # Employee dashboard
|   |   +-- announcements/{page,loading}.tsx
|   |   +-- calendar/page.tsx         # Calendar + meeting creation
|   |   +-- chat/{page,loading}.tsx   # Real-time chat
|   |   +-- files/{page,loading}.tsx  # File manager (placeholder)
|   |   +-- projects/{page,loading}.tsx
|   |   +-- tasks/{page,loading}.tsx  # Task list view
|   |   +-- tasks/kanban/             # Kanban board (dnd-kit)
|   |   +-- settings/page.tsx
|   |   +-- team/page.tsx
|   |   +-- exec/page.tsx
|   |   +-- admin/
|   |       +-- ceo/                  # CEO dashboard + users/departments/warnings
|   |       +-- c-level/              # C-Level dashboard
|   |       +-- lead/                 # Lead dashboard
|   |
|   +-- api/                          # Next.js API routes (6 routes)
|       +-- users/create/route.ts
|       +-- users/update/route.ts
|       +-- users/delete/route.ts
|       +-- end-session/route.ts
|       +-- send-meeting-invite/route.ts
|       +-- google-calendar/add-event/route.ts
|
+-- components/
|   +-- ui/                           # 53 shadcn/ui components
|   +-- auth-provider.tsx             # Auth context (login/logout/session)
|   +-- admin-layout.tsx              # Role-based sidebar navigation
|   +-- workspace-layout.tsx          # Employee sidebar
|   +-- theme-provider.tsx            # Dark/light mode
|   +-- notification-bell.tsx         # Notification dropdown
|   +-- announcements-list.tsx
|   +-- projects-list.tsx
|   +-- teams-list.tsx
|   +-- create-announcement.tsx
|   +-- create-project-dialog.tsx
|   +-- create-team-dialog.tsx
|   +-- edit-team-dialog.tsx
|   +-- dashboard-card.tsx
|
+-- hooks/
|   +-- use-mobile.tsx
|   +-- use-toast.ts
|
+-- lib/
|   +-- supabase.ts                   # Supabase client initialization
|   +-- types.ts                      # Database type definitions (540 lines)
|   +-- api.ts                        # All API data access (2,236 lines)
|   +-- firebase-types.ts             # Legacy Firebase type aliases
|   +-- utils.ts                      # cn() utility
|
+-- scripts/
+-- public/
+-- styles/
+-- logs/
+-- SQL/                              # Database migration files
+-- next.config.mjs
+-- tailwind.config.ts
+-- tsconfig.json
+-- package.json / package-lock.json / pnpm-lock.yaml
+-- breakdown.md
```

---

## 5. Frontend Analysis

### Frontend Stack

| Component | Technology |
|---|---|
| Framework | Next.js 15.2.4 (App Router) |
| Language | TypeScript ^5.0 |
| Styling | Tailwind CSS 3.4 + CSS variables |
| UI Library | shadcn/ui (53 Radix-based components) |
| Icons | Lucide React |
| Animations | Framer Motion 12.29 |
| Forms | React Hook Form + Zod |
| Drag & Drop | @dnd-kit/core/sortable |
| Charts | Recharts |
| State Management | React Context (AuthProvider) + local state |
| Theme | next-themes (dark/light mode) |

### Frontend Component Inventory

| File | Purpose | Key Logic |
|---|---|---|
| `app/layout.tsx` | Root layout | Wraps app in `ThemeProvider -> AuthProvider -> Toaster`; sets Inter font |
| `app/page.tsx` | Landing page | Immediately redirects to `/login` |
| `app/login/page.tsx` | Login screen | Email/password form with validation; left panel has animated background + InteractiveCat; right panel has login card; password visibility toggle |
| `app/(workspace)/layout.tsx` | Workspace wrapper | Reads user from `useAuth()`, renders `<AdminLayout role={user.role}>` |
| `app/(workspace)/dashboard/page.tsx` | Employee dashboard | Greeting (time-based), KPI cards (today's tasks, assigned, messages, announcements), due-today list, latest notifications; uses Framer Motion |
| `app/(workspace)/admin/ceo/page.tsx` | CEO dashboard | KPIs (active users, project/task completion, overdue), tabs (Departments/Projects/Users/Announcements), department performance progress bars, user task table |
| `app/(workspace)/admin/c-level/page.tsx` | C-Level dashboard | Stats cards, tabs for Announcements/Projects/Teams, CRUD dialogs |
| `app/(workspace)/admin/lead/page.tsx` | Lead dashboard | KPIs, team member performance, task distribution, team overview, task creation, announcement creation |
| `app/(workspace)/admin/ceo/users/page.tsx` | User management | User table with search, create/edit/delete dialogs, role assignment, password validation |
| `app/(workspace)/admin/ceo/departments/page.tsx` | Department management | Department cards, create/edit/delete, manager assignment, member counts |
| `app/(workspace)/admin/ceo/warnings/page.tsx` | Warning system | Issue/resolve/dismiss warnings, severity levels, active/resolved/all tabs |
| `app/(workspace)/tasks/page.tsx` | Task board | List view with tabs, search filter, create dialog with multi-assignee, status transitions |
| `app/(workspace)/tasks/kanban/page.tsx` | Kanban board | Drag-and-drop columns (dnd-kit), task cards with assignee info |
| `app/(workspace)/chat/page.tsx` | Chat system | Direct messages + group chat, contact sidebar, message polling (10s), date grouping |
| `app/(workspace)/calendar/page.tsx` | Calendar | Month/week/day views, event/meeting creation with SendGrid + Google Calendar + dashboard notifications |
| `app/(workspace)/announcements/page.tsx` | Announcements | Read announcements, mark as read tracking |
| `components/auth-provider.tsx` | Auth context | User state, login/logout, session checking via Supabase, time tracking start/end on login/logout, role-based redirect, error message mapping |
| `components/admin-layout.tsx` | Admin sidebar | Collapsible sidebar, role-based nav items, notification badge, user avatar dropdown |
| `components/workspace-layout.tsx` | Employee layout | Simplified sidebar, search bar, notification bell |
| `components/notification-bell.tsx` | Notification dropdown | Polls every 30s, auto-opens on first unread, mark-as-read, sessionStorage for popup state |

---

## 6. Backend Analysis

### Backend Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (Next.js server) |
| API Framework | Next.js API Routes (App Router) |
| Database Client | @supabase/supabase-js |
| Email Service | @sendgrid/mail (SendGrid) |
| Calendar Service | googleapis (Google Calendar API) |
| Auth Provider | Supabase Auth |
| Process Manager | PM2 (ecosystem.config.js) |

### API Module Architecture (`lib/api.ts`)

The entire data access layer is in a single **2,236-line file** containing 12 API modules:

| Module | Functions | Key Tables | Lines |
|---|---|---|---|
| `authAPI` | `login`, `checkSession`, `logout` | `users`, Supabase Auth | ~60 |
| `usersAPI` | `getAll`, `getUser`, `findUsersByEmails`, `updateUser`, `deleteUser` | `users` | ~100 |
| `projectsAPI` | `getAll`, `create`, `update`, `delete`, `createProject`, `updateProject`, `deleteProject` | `projects` | ~180 |
| `tasksAPI` | `getAll`, `getUserTasks`, `createTask`, `update`, `delete` | `tasks` | ~300 |
| `announcementsAPI` | `getAll`, `create`, `update`, `delete`, `markAsRead` | `announcements` | ~180 |
| `notificationsAPI` | `getUserNotifications`, `markAsRead`, `getUnreadCount`, `addNotification` | `notifications` | ~120 |
| `calendarEventsAPI` | `getAll`, `createEvent`, `updateEvent`, `deleteEvent` | `calendar_events` | ~200 |
| `chatAPI` | `sendDirectMessage`, `sendGroupMessage`, `getDirectMessageHistory`, `getGroupMessageHistory`, `getUserChatGroups`, `createChatGroup`, `markMessagesAsRead` | `chat_messages`, `chat_groups` | ~200 |
| `warningsAPI` | `getAll`, `create`, `updateStatus`, `getById` | `warnings` | ~120 |
| `timeTrackingAPI` | `startSession`, `endSession`, `cleanupStaleSessions`, `getAllSessions`, `getTimeAnalytics` | `time_tracking` | ~180 |
| `departmentsAPI` | `getAll`, `createDepartment`, `updateDepartment`, `deleteDepartment` | `departments` | ~80 |
| `teamsAPI` | `getAll`, `getDepartments`, `getTeamByLeadId`, `create`, `update`, `delete`, `getTeamWithMembers`, `addMember`, `removeMember`, `getAvailableUsers` | `teams`, `users` | ~250 |

### Key Backend Logic Patterns

**Snake_case to camelCase Mapping:**
Every data-fetching function maps database columns (`created_at`, `lead_id`) to frontend properties (`createdAt`, `leadId`). This is done repeatedly in every function rather than using a centralized mapper.

**Role-Based Task Visibility (in code only, not RLS):**
```typescript
if (userRole && ['CEO', 'C_LEVEL', 'LEAD'].includes(userRole)) {
    // No filter -- see all tasks
} else {
    // Regular employees see assigned or viewable tasks
    query = query.or(`assignee_ids.cs.{${userId}},viewer_ids.cs.{${userId}}`)
}
```

**Backward Compatibility Aliases:**
The `projectsAPI` and `tasksAPI` maintain duplicate function signatures (`create`/`createProject`, `update`/`updateTask`) for backward compatibility with older code.

---

## 7. Database Analysis -- Actual Live Schema (Verified 2026-06-28)

### Database: PostgreSQL (via Supabase)

**16 Tables (4 undocumented in codebase), 4 Functions, 3 Triggers, 60 RLS Policies, 5 Extensions**

The following is the **actual live schema** from `information_schema.columns` -- not inferred from migration files.

### Complete Table Inventory

| # | Table | API Module Exists? | Codebase Status |
|---|---|---|---|
| 1 | `users` | Yes `usersAPI` | Used |
| 2 | `projects` | Yes `projectsAPI` | Used |
| 3 | `tasks` | Yes `tasksAPI` | Used (but missing 10 columns) |
| 4 | `announcements` | Yes `announcementsAPI` | Used |
| 5 | `notifications` | Yes `notificationsAPI` | Used |
| 6 | `calendar_events` | Yes `calendarEventsAPI` | Used |
| 7 | `chat_messages` | Yes `chatAPI` | Used |
| 8 | `chat_groups` | Yes `chatAPI` | Used |
| 9 | `warnings` | Yes `warningsAPI` | Used |
| 10 | `time_tracking` | Yes `timeTrackingAPI` | Used |
| 11 | `departments` | Yes `departmentsAPI` | Used |
| 12 | `teams` | Yes `teamsAPI` | Used (but missing `project_id`/`project_name`) |
| 13 | `task_milestones` | NO API | Undocumented -- full schema below |
| 14 | `files` | NO API | Undocumented -- full schema below |
| 15 | `files_department_shares` | NO API | Undocumented -- full schema below |
| 16 | `activity_logs` | NO API | Undocumented -- full schema below |

### Full Column Listing -- All 16 Tables

**users** -- 11 columns
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() |
| uid | text | NO | -- |
| name | text | NO | -- |
| email | text | NO | -- |
| role | text | NO | -- |
| department | text | NO | -- |
| status | text | YES | 'active'::text |
| email_verified | boolean | YES | false |
| avatar | text | YES | -- |
| created_at | timestamptz | YES | now() |
| last_active | timestamptz | YES | now() |

**projects** -- 13 columns
| id | uuid | NO | uuid_generate_v4() |
| name | text | NO | -- |
| description | text | YES | -- |
| status | text | NO | -- |
| progress | integer | YES | 0 |
| start_date | date | NO | -- |
| end_date | date | NO | -- |
| lead_id | text | NO | -- |
| lead_name | text | YES | -- |
| team_members | ARRAY | YES | ARRAY[]::text[] |
| created_by | text | NO | -- |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

**tasks** -- 29 columns (the API layer references only 19 of these)
| id | uuid | NO | uuid_generate_v4() |
| title | text | NO | -- |
| description | text | YES | -- |
| status | text | NO | -- |
| priority | text | NO | -- |
| progress | integer | YES | 0 |
| assignee_id | text | NO | -- |
| assignee_name | text | YES | -- |
| project_id | uuid | YES | -- |
| project_name | text | YES | -- |
| due_date | date | YES | -- |
| created_by | text | NO | -- |
| created_by_name | text | YES | -- |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| start_date | timestamptz | YES | -- |
| assignee_ids | ARRAY | YES | ARRAY[]::text[] |
| assignee_names | ARRAY | YES | ARRAY[]::text[] |
| viewer_ids | ARRAY | YES | ARRAY[]::text[] |
| viewer_names | ARRAY | YES | ARRAY[]::text[] |
| assignment_attachment_id | text | YES | -- |
| assignment_attachment_name | text | YES | -- |
| assignment_attachment_url | text | YES | -- |
| assignment_attachment_download_url | text | YES | -- |
| submission_attachment_id | text | YES | -- |
| submission_attachment_name | text | YES | -- |
| submission_attachment_url | text | YES | -- |
| submission_attachment_download_url | text | YES | -- |
| is_phased | boolean | YES | false |
| milestone_count | integer | YES | 0 |

**announcements** -- 8 columns (all timestamp/title/content/priority/author)
**notifications** -- 9 columns (user_id, type, title, body, read, etc.)
**chat_messages** -- 9 columns (text, sender_id, recipient_id, group_id, is_read)
**chat_groups** -- 8 columns (name, members[], created_by)
**calendar_events** -- 17 columns (with send_calendar_invite, notify_on_dashboard, etc.)
**warnings** -- 15 columns (severity, status, resolved_at, resolved_by)
**time_tracking** -- 11 columns (with auto_ended, device jsonb)
**departments** -- 7 columns
**teams** -- 11 columns (with project_id, project_name)
**task_milestones** -- 11 columns (task_id, title, due_date, status, order_index, completed_at, completed_by)
**files** -- 16 columns (storage_path, file_type, file_size, shared_with[], project_id, department_id)
**files_department_shares** -- 12 columns (file_id, department_id, uploaded_by)
**activity_logs** -- 8 columns (user_id, action, ip_address, user_agent)

### Entity Relationship Summary

- **users** referenced by: projects, tasks, announcements, warnings, time_tracking, departments, teams, chat_messages, chat_groups, calendar_events, files, files_department_shares, notifications, activity_logs
- **projects** referenced by: tasks, teams, files, files_department_shares
- **tasks** referenced by: task_milestones
- **departments** referenced by: files, files_department_shares

### Database Extensions (Verified 2026-06-28)

| Extension | Version | Used by Codebase? | Purpose |
|---|---|---|---|
| `plpgsql` | 1.0 | Yes | Procedural language -- all 4 functions and 2 triggers depend on this |
| `pg_stat_statements` | 1.11 | No | Query performance monitoring -- available for debugging but never queried |
| `uuid-ossp` | 1.1 | Yes | UUID generation -- provides `uuid_generate_v4()` used as the default on 13 of 16 tables |
| `pgcrypto` | 1.3 | Indirect | Cryptographic functions -- used internally by Supabase Auth for password hashing |
| `supabase_vault` | 0.3.1 | No | Encrypted secrets storage -- available for storing API keys securely; completely unused |

**Key observations:**
- `uuid-ossp` is critical infrastructure -- removing it breaks all default ID generation
- `pg_stat_statements` is idle but could identify slow queries
- `supabase_vault` is the biggest missed opportunity -- secrets in `.env.local` plaintext
- No PostGIS, pgvector, or other specialized extensions -- pure business workflow app

---

## 8. RLS Policy Analysis -- Full Live Policies (Verified 2026-06-28)

### All 60 Row-Level Security Policies

**users** (5 policies): SELECT (public: true + auth.uid() NOT NULL), INSERT/UPDATE/DELETE (own profile only)

**projects** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (auth.uid() NOT NULL only -- NO ROLE CHECK)

**tasks** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (auth.uid() NOT NULL only -- NO ROLE CHECK)

**announcements** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (auth.uid() NOT NULL only -- NO ROLE CHECK)

**chat_messages** (5 policies -- CRITICAL BUG):
- Policy 1 (correct): sender_id = auth.uid() OR recipient_id = auth.uid() OR (group_id IS NOT NULL AND auth.uid() IN (SELECT unnest(members) FROM chat_groups WHERE id::text = chat_messages.group_id))
- Policy 2 (BROKEN): sender_id = auth.uid() OR recipient_id = auth.uid() OR group_id IS NOT NULL
- PERMISSIVE policies OR together -- Policy 2 overrides Policy 1's group membership check. Any authenticated user reads ALL group messages.

**chat_groups** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (created_by only)

**calendar_events** (4 policies): SELECT (all authenticated), INSERT/UPDATE/DELETE (organizer only)

**notifications** (4 policies -- well-designed): SELECT/UPDATE/DELETE (own only), INSERT (any authenticated)

**warnings** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (auth.uid() NOT NULL -- NO ROLE CHECK)

**time_tracking** (4 policies): SELECT (all), INSERT/UPDATE/DELETE (own only)

**departments** (4 policies): INSERT/UPDATE/DELETE (auth.uid() NOT NULL -- NO ROLE CHECK)

**teams** (4 policies): INSERT/UPDATE/DELETE (auth.uid() NOT NULL -- NO ROLE CHECK)

**activity_logs** (4 policies -- well-designed): CEO sees all, C-Level sees non-CEO, users see own, service can insert

**files** (5 policies): Own uploads only, shared files by inclusion, uploader controls

**files_department_shares** (7 policies -- granular): CEO/C-Level manage + view, department heads/members view own department

**task_milestones** (2 policies -- well-designed): View by roles/assignees/viewers, manage by roles/assignees

---

## 9. Database Functions & Triggers (Verified 2026-06-28)

### Database Functions

1. **`calculate_milestone_progress(p_task_id uuid) -> integer`**: Returns 0-100% progress based on completed/total milestones
2. **`is_user_assigned_to_task(task_assignees text[], user_uid text) -> boolean`**: Array membership check (IMMUTABLE)
3. **`is_user_assigned_to_task(task_assignees text[], task_viewers text[], user_uid text) -> boolean`**: Overloaded -- checks both arrays (IMMUTABLE)
4. **`update_task_milestone_count() -> trigger`**: Auto-updates `tasks.milestone_count` on milestone INSERT/DELETE
5. **`update_user_last_active() -> trigger`**: Auto-updates `users.last_active` on activity_log INSERT

### Database Triggers

| Table | Trigger Name | Event | Function | Timing |
|---|---|---|---|---|
| task_milestones | trigger_update_milestone_count | INSERT, DELETE | update_task_milestone_count() | AFTER |
| activity_logs | update_last_active_on_login | INSERT | update_user_last_active() | AFTER |

---

## 10. Schema-Code Gap Analysis

### Gap 1: `tasks` -- 10 columns exist in DB but NOT referenced by `lib/api.ts`

`is_phased`, `milestone_count`, `assignment_attachment_id/name/url/download_url` (4), `submission_attachment_id/name/url/download_url` (4) -- all exist in schema, none in code.

### Gap 2: `teams` -- project-scoped fields ignored

`project_id` and `project_name` never read/written by `teamsAPI`. DB supports project-scoped teams; code ignores it.

### Gap 3: Four tables with ZERO frontend API coverage

| Table | RLS Quality | Status |
|---|---|---|
| `task_milestones` | Well-designed role-based | No API module. Function/trigger exist server-side only |
| `files` | Properly scoped | No API module. `/files` page is placeholder. Storage bucket `uploads` exists with 5 folders |
| `files_department_shares` | Granular role-based | No API module |
| `activity_logs` | Well-designed role-based | No API module. Trigger populates `users.last_active` but no dashboard reads it |

### Gap 4: `tasks.start_date` exists but API puts data in `created_at`

Column exists in schema but never populated by application code.

### Gap 5: No explicit FK constraints on `teams.leader_id`

Plain text column maintained in application logic only, not enforced at DB level.

---

## 11. Authentication & Security -- Tier 2 Verified

### Authentication Configuration (Verified from Supabase Dashboard)

| Setting | Value |
|---|---|
| **Provider** | Email/Password only |
| **Phone Auth** | Disabled |
| **Social/OAuth** | ALL disabled (17 providers) |
| **SAML 2.0** | Disabled |
| **Web3 Wallet** | Disabled |
| **User Count** | 13 registered users (all @finovasolutions.tech) |

**Executive accounts present:** ceo@, coo@, cso@, cto@ -- real users, not test data.

### Email Service Configuration

| Setting | Status | Risk |
|---|---|---|
| **SMTP Provider** | Built-in Supabase email service | **NOT production-grade** -- dashboard warns of rate limits |
| **Custom SMTP** | Not configured | SendGrid exists as dependency but only used for meeting invites |
| **Templates** | 5 templates (Confirm signup, Invite, Magic link, Change email, Reset password) | Standard set, no customization |

**Key Finding:** Auth emails (password resets, confirmations) go through Supabase's built-in rate-limited service. SendGrid is already a dependency -- should be SMTP provider.

### Rate Limits (Verified from Supabase Dashboard)

| Limit Type | Value | Effective Rate |
|---|---|---|
| Sending emails | (default/empty) | Not explicitly set |
| Sending SMS messages | 30 sms/h | 30/hour |
| Token refreshes | 360 requests/5 min | 1,800/hour |
| Token verifications | 30 requests/5 min | 360/hour |
| Anonymous users | 30 requests/h | 30/hour |
| Sign-ups and sign-ins | 30 requests/5 min | 360/hour |
| **IP Address Forwarding** | Disabled | Auth determines source IP directly |

Default Supabase rate limits only -- no custom brute-force protection configured.

### Storage Configuration (Verified from Supabase Dashboard)

| Setting | Value |
|---|---|
| **Bucket Name** | `uploads` |
| **Visibility** | **PUBLIC** |
| **File Size Limit** | 50 MB |
| **Allowed MIME Types** | Any (no restriction) |
| **RLS Policies on Bucket** | **0 policies** -- no access control |
| **Folders Inside** | `department-files/`, `files/`, `task completions/`, `uploads by employee/`, `uploads/` |

**CRITICAL:** Bucket is PUBLIC with zero RLS policies. Anyone with file URL can download any file. Files table has RLS but storage layer is unprotected. 5-folder structure suggests designed for department/task file management.

### Edge Functions (Verified -- None)

- **Deployed Functions:** None -- "Deploy your first edge function" onboarding state
- All backend logic in Next.js API routes (6 routes). No edge functions for webhooks, scheduled jobs, or realtime triggers.

### Realtime Configuration (Verified from Supabase Dashboard)

| Setting | Status |
|---|---|
| **Realtime Inspector** | Configured but idle -- no channels/messages |
| **Broadcast** | Not configured |
| **Presence** | Not configured |
| **Postgres Changes** | Not configured (no tables have Realtime enabled) |

Realtime is available but completely unused. App uses polling instead (chat 10s, notifications 30s).

### Tier 2 Summary -- Infrastructure Gaps

| Area | Status | Risk |
|---|---|---|
| Auth emails use built-in SMTP, not SendGrid | Not production-ready | High |
| Storage bucket PUBLIC with zero RLS | Critical exposure | Critical |
| No Edge Functions deployed | Acceptable for current scale | Low |
| Realtime available but unused (polling) | Missed opportunity | Low |
| Default rate limits only | Minimal brute-force protection | Medium |
| supabase_vault unused for secrets | Secrets in plaintext .env.local | Medium |

---

## 12. API Documentation

### Next.js API Routes

| Method | Route | Purpose | Auth | Request Body |
|---|---|---|---|---|
| POST | `/api/users/create` | Create user | Service Role | `{name, email, password, role, department}` |
| PUT | `/api/users/update` | Update user | Service Role | `{userId, name?, role?, department?, status?}` |
| DELETE | `/api/users/delete` | Delete user | Service Role | `{userId}` |
| POST | `/api/end-session` | End time tracking | User session | `{sessionId}` |
| POST | `/api/send-meeting-invite` | Send email invite | User session | `{to[], cc[], subject, meetingDetails}` |
| POST | `/api/google-calendar/add-event` | Google Calendar | User session | `{title, description, startTime, endTime, location, attendees[]}` |

### Client-Side API (lib/api.ts)

12 modules in a single 2,236-line file. `usersAPI.updateUser` and `usersAPI.deleteUser` route through Next.js API routes (service role required); all other operations use direct Supabase client calls.

---

## 13. Data Flow Analysis

### User Login Flow

1. User navigates to /login -> enters email + password
2. `supabase.auth.signInWithPassword()` validates credentials
3. User data fetched from `users` table WHERE uid = auth.user.id
4. `activity_logs` trigger fires: INSERT (action, user_id, user_name, user_email, user_role)
5. `update_user_last_active` trigger fires: `users.last_active = now()`
6. User state set in AuthContext; admin roles start time tracking
7. Redirect based on role: CEO->/admin/ceo, C-Level->/admin/c-level, Lead->/admin/lead, Employee->/dashboard

### Calendar Meeting Flow

1. User creates meeting with attendees + integration toggles
2. INSERT into `calendar_events` (RLS: organizer_id = auth.uid())
3. If sendCalendarInvite: POST /api/send-meeting-invite -> SendGrid
4. If addToGoogleCalendar: POST /api/google-calendar/add-event -> Google Calendar API
5. If notifyOnDashboard: notificationsAPI.addNotification() for each member

---

## 14. Feature Inventory

| Feature | Frontend | Backend | DB Tables | Status |
|---|---|---|---|---|
| **Authentication** | auth-provider, login page | authAPI | users, Supabase Auth, activity_logs | Active |
| **User Management** | CEO users page | usersAPI + 3 API routes | users | Active |
| **Task Management** | tasks page, kanban | tasksAPI | tasks, task_milestones | Active (milestones not wired) |
| **Kanban Board** | tasks/kanban/* | tasksAPI.update | tasks | Active |
| **Chat** | chat page | chatAPI | chat_messages, chat_groups | Active |
| **Calendar** | calendar page | calendarEventsAPI + 2 routes | calendar_events | Active |
| **Announcements** | announcements page | announcementsAPI | announcements | Active |
| **Projects** | projects page | projectsAPI | projects | Active |
| **Teams** | teams list + dialogs | teamsAPI | teams | Active (project links not wired) |
| **Departments** | CEO departments page | departmentsAPI | departments | Active |
| **Warning System** | CEO warnings page | warningsAPI | warnings, notifications | Active |
| **Notifications** | notification-bell | notificationsAPI | notifications | Active |
| **Time Tracking** | auth-provider, end-session | timeTrackingAPI | time_tracking | Active |
| **File Management** | /files (placeholder) | NONE | files, files_department_shares, uploads bucket | NOT IMPLEMENTED |
| **Milestones** | NONE | NONE | task_milestones | NOT IMPLEMENTED |
| **Activity Logs** | NONE | NONE | activity_logs | NOT IMPLEMENTED |

---

## 15. Dependency Analysis

10+ unused dependencies: `cmdk`, `input-otp`, `@opentelemetry/api`, `@hookform/resolvers`, `sonner`, `vaul`, `embla-carousel-react`. Mixed npm/pnpm lock files. Firebase legacy code in notification-bell.

---

## 16. Configuration Analysis

Environment variables (Supabase URL, anon key, service role key, SendGrid API key, Google Calendar credentials) all in `.env.local` plaintext. `supabase_vault` installed and available for encryption but unused. `ignoreBuildErrors: true` suppresses all TypeScript/ESLint errors.

---

## 17. Deployment Analysis

Netlify primary, Hostinger VPS secondary with PM2. No CI/CD pipeline. No `.env.example` for developer onboarding.

---

## 18. Performance Review

No pagination on any `getAll()` functions. Chat uses 10s polling instead of Realtime. All pages use `"use client"` -- no React Server Components. No caching layer.

---

## 19. Code Quality Review

| Category | Score (0-10) |
|---|---|
| Structure & Organization | 7/10 |
| Readability | 7/10 |
| Maintainability | 4/10 |
| Naming Conventions | 6/10 |
| Reusability | 5/10 |
| Error Handling | 6/10 |
| TypeScript Usage | 6/10 |
| Testing | 0/10 |
| Documentation | 5/10 |
| Code Duplication | 3/10 |

---

## 20. Technical Debt & Risks

### Critical
- No server-side authorization in API routes
- Chat RLS broken -- duplicate PERMISSIVE policy exposes all group messages
- Users table readable by unauthenticated visitors (`roles: {public}, qual: true`)
- Storage bucket PUBLIC with zero RLS -- anyone with URL downloads any file
- Auth emails use built-in Supabase SMTP -- not production-grade
- Write RLS only checks `auth.uid() IS NOT NULL` on 6 tables
- Secrets in plaintext `.env.local` despite `supabase_vault` available
- Build errors suppressed (`ignoreBuildErrors: true`)
- No tests (zero coverage)

### High
- `lib/api.ts` monolithic (2,236 lines)
- No pagination on getAll() functions
- Chat polling instead of Realtime (Realtime available but unused)
- 4 tables with zero frontend code
- 10 undocumented task columns

### Medium
- 10+ unused dependencies
- No React Server Components (all `"use client"`)
- `teams.project_id` unwired
- TypeScript types stale
- Firebase legacy code
- No custom rate limiting
- Storage accepts any MIME type

### Low
- Inconsistent camelCase/snake_case naming
- No `.env.example`
- Snake_case mapping duplicated ~30x
- No Edge Functions

---

## 21. Security Assessment

| Category | Status |
|---|---|
| Password Hashing | OK (Supabase bcrypt) |
| Session Management | OK (JWT + SSR cookies) |
| Email Verification | OK |
| Input Validation | Partial |
| SQL Injection | OK (parameterized) |
| XSS Protection | OK (React + CSP) |
| Row-Level Security | Flawed (2 critical bugs) |
| Rate Limiting | Default only -- no custom limits |
| Server-side Auth | Weak -- API routes don't verify role |
| CORS | Not configured |
| Security Headers | OK (netlify.toml) |
| Build-time Safety | Disabled |
| Storage Security | FAIL -- Public bucket, no RLS |
| Secrets Management | FAIL -- Plaintext in .env.local |
| Email Security | FAIL -- Built-in SMTP, not production-grade |

---

## 22. RLS Vulnerabilities -- CRITICAL Findings

### CRITICAL: Chat group messages readable by ALL authenticated users

Two PERMISSIVE SELECT policies on `chat_messages`:
- Policy 1 (correct): checks group membership
- Policy 2 (BROKEN): `group_id IS NOT NULL` -- no group membership check

PERMISSIVE policies OR together -> Policy 2 wins. Any authenticated user reads ALL group messages.

**Fix:** Drop Policy 2. Policy 1 is already correct.

### CRITICAL: Storage bucket PUBLIC with zero RLS

`uploads` bucket is PUBLIC with 0 storage policies. Files table has RLS but storage layer has none. Anyone with URL downloads any file.

**Fix:** Set bucket to private + add storage policies mirroring `files` table RLS.

### HIGH: `users` table readable by unauthenticated visitors

Policy "Users can read all users" has `roles: {public}, qual: true`. Anyone without login dumps entire user table.

**Fix:** Drop this policy.

### HIGH: Write operations gated only on authentication, not role

6 tables (projects, tasks, announcements, warnings, departments, teams) allow INSERT/UPDATE/DELETE with only `auth.uid() IS NOT NULL`. Employee can delete all projects via direct API call.

**Fix:** Add role checks to write policies.

### MEDIUM: Calendar events readable by all authenticated users

All employees see all events including private executive meetings.

**Fix:** Scope to organizer_id = auth.uid() OR auth.uid() = ANY(invited_member_ids).

---

## 23. Recommendations

### Immediate (Must Fix)

1. **Drop duplicate chat_messages SELECT policy** -- exposes all group messages
2. **Set storage bucket to private + add RLS policies** -- currently public with zero policies
3. **Drop "Users can read all users" policy** -- exposes entire user table unauthenticated
4. **Add role checks to write RLS policies** -- 6 tables allow any authenticated user to modify
5. **Scope calendar_events SELECT** -- all authenticated users see all events
6. **Configure SendGrid as auth SMTP provider** -- built-in service is not production-grade

### Short-Term (Should Fix)

7. Enable TypeScript and ESLint checks in build
8. Add server-side authorization to API routes
9. Split `lib/api.ts` into modules
10. Remove unused dependencies
11. Add pagination to getAll() functions
12. Create centralized snake_case->camelCase mapper
13. Add custom rate limiting
14. Restrict storage MIME types

### Medium-Term (Should Consider)

15. Move secrets to supabase_vault
16. Implement task_milestones API
17. Implement files API
18. Wire teams->project links
19. Replace chat polling with Supabase Realtime
20. Adopt testing (Vitest + Playwright)
21. Add CI/CD pipeline
22. Create `.env.example` and project README
23. Adopt React Server Components

---

## 24. Overall Codebase Health Score

### Updated Score: 48 / 100 (DOWN from 52)

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Architecture & Structure | 15% | 7/10 | 10.5 |
| Code Quality | 15% | 4/10 | 6.0 |
| Testing | 10% | 0/10 | 0 |
| Security | 15% | 2/10 | 3.0 | DOWN (-1.5) |
| Performance | 10% | 5/10 | 5 |
| Documentation | 5% | 5/10 | 2.5 |
| Maintainability | 10% | 3/10 | 3.0 |
| Dependency Management | 5% | 6/10 | 3 |
| Deployment Readiness | 10% | 6/10 | 6 | DOWN (-1.0) |
| Error Handling | 5% | 6/10 | 3 |
| **Total** | **100%** | | **48/100** | **DOWN 4 points** |

### Score Change Justification

**Downgrades from Tier 2 findings:**
- **Security (-1.5):** Storage bucket PUBLIC with zero RLS (files unprotected at storage layer). From 3 to 2
- **Deployment Readiness (-1.0):** Auth emails using built-in SMTP (not production-grade), plaintext secrets in `.env.local` despite `supabase_vault` availability. From 7 to 6

**Maintained from Tier 1:**
- Code Quality: 4/10 (10 undocumented columns, 4 unrepresented tables)
- Testing: 0/10
- Maintainability: 3/10 (monolithic api.ts, schema-code gap)

---

*End of Report -- Updated 2026-06-28 with live Supabase verification data (Tier 1, 2, and 3)*
