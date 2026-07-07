# Agent Context — Finova Workspace

> Auto-loaded context for AI coding agents.
> Generated: 2026-06-28 | Analysis: Tier 1 (live schema + RLS), Tier 2 (auth/storage/realtime), Tier 3 (rate limits/replication)

---

## Project Identity

**Name:** Finova Workspace
**Company:** Finova Solutions
**Type:** Internal virtual office platform (monolithic Next.js + Supabase)
**Purpose:** Centralized hub replacing scattered tools — tasks, chat, calendar, announcements, projects, teams, file management, time tracking
**Users:** 13 (CEO, C-Level, Team Leads, Employees) — all @finovasolutions.tech
**Environment:** Production (Netlify + Hostinger VPS)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15.2.4 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4 + shadcn/ui (53 components) |
| Database | PostgreSQL via Supabase (16 tables) |
| Auth | Supabase Auth — email/password only, 13 users |
| Email | SendGrid (meeting invites only; auth emails use built-in Supabase SMTP — NOT production-grade) |
| Storage | Supabase Storage — 1 bucket (`uploads`), **PUBLIC, zero RLS policies** |
| Realtime | Available but unused (polling: chat 10s, notifications 30s) |
| Edge Functions | None deployed |
| State | React Context (AuthProvider) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Deployment | Netlify primary, Hostinger VPS secondary (PM2) |

---

## Architecture

```
Browser → Next.js App (Frontend Pages + Components)
              ↓
         lib/api.ts (12 API modules, 2,236 lines — monolithic)
              ↓
    Supabase Client (direct DB access)
    Next.js API Routes (6 routes: user CRUD, meeting invites, Google Calendar)
              ↓
         PostgreSQL (16 tables, 60 RLS policies, 5 functions, 3 triggers)
              ↓
    External: SendGrid (email) + Google Calendar API
```

**Key decisions:**
- Monolithic Next.js — both frontend and backend in same repo
- Supabase as BaaS — no separate backend server
- Role-based routing: `/admin/{ceo,c-level,lead}/*`
- Service role key for admin user management
- Polling over WebSockets (chat + notifications)
- All pages `"use client"` — no React Server Components
- Build errors suppressed (`ignoreBuildErrors: true`)

---

## Key Files

| File | Lines | Purpose |
|---|---|---|
| `lib/api.ts` | 2,236 | ALL data access — 12 API modules in one file |
| `lib/types.ts` | 540 | TypeScript types (stale — missing 4 tables, 10 task columns) |
| `lib/supabase.ts` | — | Supabase client init |
| `components/auth-provider.tsx` | — | Auth context + session management + time tracking |
| `components/admin-layout.tsx` | — | Role-based sidebar navigation |
| `components/notification-bell.tsx` | — | Polls every 30s, dropdown, mark-as-read |
| `app/login/page.tsx` | — | Email/password login with validation |
| `app/(workspace)/chat/page.tsx` | — | Chat with 10s polling |
| `app/(workspace)/calendar/page.tsx` | — | Calendar + meeting creation |
| `app/(workspace)/tasks/page.tsx` | — | Task list view + Kanban board |
| `app/(workspace)/files/page.tsx` | — | **PLACEHOLDER** — no functionality |

---

## Database — 16 Tables

| # | Table | API Module? | Status |
|---|---|---|---|
| 1 | `users` | usersAPI | Active |
| 2 | `projects` | projectsAPI | Active |
| 3 | `tasks` | tasksAPI | Active (29 cols, 10 undocumented) |
| 4 | `announcements` | announcementsAPI | Active |
| 5 | `notifications` | notificationsAPI | Active |
| 6 | `calendar_events` | calendarEventsAPI | Active |
| 7 | `chat_messages` | chatAPI | Active |
| 8 | `chat_groups` | chatAPI | Active |
| 9 | `warnings` | warningsAPI | Active |
| 10 | `time_tracking` | timeTrackingAPI | Active |
| 11 | `departments` | departmentsAPI | Active |
| 12 | `teams` | teamsAPI | Active (project_id ignored) |
| 13 | `task_milestones` | **NONE** | Schema + RLS + trigger ready |
| 14 | `files` | **NONE** | Schema + RLS ready, bucket exists |
| 15 | `files_department_shares` | **NONE** | Schema + RLS ready |
| 16 | `activity_logs` | **NONE** | Schema + RLS + trigger ready |

**Extensions:** plpgsql, uuid-ossp, pgcrypto, pg_stat_statements (idle), supabase_vault (idle)

---

## CRITICAL Issues — Fix First

1. **Chat RLS broken** — Duplicate PERMISSIVE SELECT policy on `chat_messages` leaks all group messages. Drop `"Users can read their messages"` policy.
2. **Storage bucket PUBLIC with zero RLS** — `uploads` bucket has no access control. Make private + add storage policies.
3. **Users table readable unauthenticated** — Policy `"Users can read all users"` has `roles: {public}, qual: true`. Drop it.
4. **No role checks on writes** — 6 tables (projects, tasks, announcements, warnings, departments, teams) allow any authenticated user to INSERT/UPDATE/DELETE. Add role-based conditions.
5. **Auth emails use built-in SMTP** — Not production-grade. Switch to SendGrid (already a dependency).

---

## Schema–Code Gaps

| Gap | Detail |
|---|---|
| 10 undocumented task columns | `is_phased`, `milestone_count`, 8 attachment columns exist in DB, never read by API |
| `teams.project_id`/`project_name` | DB supports project-scoped teams; API ignores these columns |
| 4 tables without API | `task_milestones`, `files`, `files_department_shares`, `activity_logs` — full schema + RLS ready |
| 5 functions uncalled from code | `calculate_milestone_progress` is most valuable but unused |
| `tasks.start_date` never populated | Column exists but API only sets `created_at` |

---

## Known Vulnerabilities (by priority)

| # | Vulnerability | Severity | Effort to Fix |
|---|---|---|---|
| 1 | Chat messages leaked — duplicate PERMISSIVE SELECT | Critical | 1 SQL line |
| 2 | Storage bucket public — zero RLS | Critical | Dashboard toggle + SQL |
| 3 | User table public — unauthenticated access | High | 1 SQL line |
| 4 | No write role checks — 6 tables | High | ~30 SQL lines |
| 5 | Calendar events visible to all | Medium | 6 SQL lines |

---

## Working with This Codebase

### Before making changes, read:
- `components/supabase/README.md` — Supabase infrastructure overview
- `components/supabase/schema/tables.md` — Complete schema for all 16 tables
- `components/supabase/rls/vulnerabilities.md` — RLS fixes with exact SQL
- `components/supabase/gaps.md` — What the DB supports vs what the code uses
- `breakdown.md` (root) — Full 24-section analysis report

### Key patterns:
- All DB access via `lib/api.ts` — DO NOT make direct Supabase calls outside this file
- Snake_case in DB → camelCase in frontend (mapped manually ~30 times — no centralized mapper)
- API routes in `app/api/` use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- `usersAPI.updateUser` and `usersAPI.deleteUser` are the only functions that go through Next.js API routes (fetch) instead of direct Supabase calls
- Backward compat aliases: `create`/`createProject`, `update`/`updateTask`

### When adding a new feature:
- If it involves a new table, add a module to `lib/api.ts` (not a separate file)
- Add type definitions to `lib/types.ts`
- Follow existing snake_case→camelCase mapping pattern
- Check `components/supabase/gaps.md` first — there may already be DB infrastructure ready

---

## Health Score: 48/100

| Category | Score |
|---|---|
| Architecture | 7/10 |
| Code Quality | 4/10 |
| Testing | 0/10 |
| Security | 2/10 |
| Performance | 5/10 |
| Documentation | 5/10 |
| Maintainability | 3/10 |
| Dependencies | 6/10 |
| Deployment | 6/10 |
| Error Handling | 6/10 |

---

## What's Been Done

- [x] Tier 1: Live schema verified (16 tables, 60 RLS policies, 5 functions, 3 triggers, 5 extensions)
- [x] Tier 2: Auth config (email-only, 13 users, built-in SMTP), storage (1 public bucket, 0 RLS), edge functions (none), extensions verified
- [x] Tier 3: Rate limits (default Supabase), realtime (available, unused)
- [x] Complete breakdown.md created (24 sections)
- [x] supabase/ documentation directory created
- [x] agent.md created (this file)

---

## Reference Files

| File | Purpose |
|---|---|
| `../breakdown.md` | Full 24-section analysis report |
| `./supabase/README.md` | Supabase quick reference |
| `./supabase/schema/tables.md` | All 16 tables with columns |
| `./supabase/schema/extensions.md` | 5 extensions |
| `./supabase/schema/functions.md` | 5 DB functions with source |
| `./supabase/schema/triggers.md` | 2 triggers |
| `./supabase/rls/policies.md` | All 60 RLS policies |
| `./supabase/rls/vulnerabilities.md` | RLS fixes with SQL |
| `./supabase/auth/config.md` | Auth providers, users, rate limits |
| `./supabase/storage/config.md` | Storage bucket and RLS fixes |
| `./supabase/realtime/config.md` | Realtime setup guide |
| `./supabase/edge-functions.md` | Edge functions status |
| `./supabase/gaps.md` | Schema–code gap analysis |
