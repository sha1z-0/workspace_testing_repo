# Team Management & Creation

## Overview
Team Management encompasses three distinct concepts that share the word "team" but operate on different data: (1) **Teams** (`teams` table) — named groups with a leader and member list, managed by C-Level/CEO; (2) **Project Teams** (`projects.team_members`) — assignment of users to specific projects via the CEO dashboard; (3) **Team Overview** (`/team` page) — a workload dashboard showing ALL users' task stats, not filtered by any team. Access control is primarily frontend-only — RLS allows any authenticated user to perform any CRUD operation on teams.

---

## Data Model

### `teams` table
Two conflicting SQL definitions exist:

**Version A** — `supabase-schema.sql` lines 172-188 (has `leader_id` FK):
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Primary key |
| `name` | TEXT | NOT NULL | — | Team name |
| `description` | TEXT | NULLABLE | — | |
| `department` | TEXT | NOT NULL | — | Denormalized — no FK to `departments` |
| `leader_id` | TEXT | NULLABLE | — | FK: `REFERENCES users(uid) ON DELETE SET NULL` |
| `leader_name` | TEXT | NULLABLE | — | Denormalized display name |
| `members` | TEXT[] | NULLABLE | `ARRAY[]::TEXT[]` | Array of user UIDs |
| `created_at` | TIMESTAMPTZ | — | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | — | `NOW()` | |

**Version B** — `reset-and-create-schema.sql` lines 213-223 (no `leader_id` column):
Missing both `leader_id` and `leader_name`. The migration file `add-leader-to-teams.sql` adds them:
```sql
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE teams ADD CONSTRAINT fk_teams_leader FOREIGN KEY (leader_id) 
  REFERENCES users(uid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
```

**TypeScript types:** `lib/types.ts` lines 543-578 define both `leader_id: string | null` and `leader_name` plus `members: string[]` — matching Version A.

### `departments` table
Defined in `supabase-schema.sql` lines 160-170.
| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | UUID | NOT NULL PK | `uuid_generate_v4()` |
| `name` | TEXT | NOT NULL (UNIQUE) | — |
| `description` | TEXT | NULLABLE | — |
| `head_id` | TEXT | NULLABLE | — |
| `head_name` | TEXT | NULLABLE | — |
| `member_count` | INTEGER | NULLABLE | `0` |
| `created_at` | TIMESTAMPTZ | — | `NOW()` |

**No FK relationships** from departments to any other table. `head_id` is plain TEXT (not a FK to `users`).

Seeded with 8 departments in `seed-departments.sql`: Executive, Engineering, Sales, Marketing, Human Resources, Finance, Operations, Customer Support.

### `users.role` column
Defined in `supabase-schema.sql` line 10:
```sql
role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'LEAD', 'C_LEVEL', 'CEO'))
```
TypeScript: `lib/types.ts` lines 21, 34, 47 — `'EMPLOYEE' | 'LEAD' | 'C_LEVEL' | 'CEO'`

There is **no separate enum type** in PostgreSQL — it's a TEXT CHECK constraint. There is **no 'ADMIN' role** despite `teamsAPI.getAvailableUsers()` at `lib/api.ts` line 2433 filtering for `user.role !== 'ADMIN'` (dead code — 'ADMIN' would fail the CHECK constraint).

### Project team members — `projects.team_members`
Defined in `supabase-schema.sql` line 118: `team_members TEXT[] DEFAULT ARRAY[]::TEXT[]`

This is a separate concept from `teams.members`. Project team members are assigned via `projectsAPI.updateProject()` and managed on the CEO Team Page, NOT through the teams API.

### RLS Policies on `teams`
All from `add-rls-policies.sql` lines 44-47 (INSERT/UPDATE/DELETE) and `add-select-policies.sql` lines 37-38 (SELECT):

| Operation | Policy Name | Rule |
|---|---|---|
| SELECT | `"Authenticated users can read teams"` | `auth.uid() IS NOT NULL` |
| INSERT | `"Authenticated users can create teams"` | `auth.uid() IS NOT NULL` |
| UPDATE | `"Authenticated users can update teams"` | `auth.uid() IS NOT NULL` |
| DELETE | `"Authenticated users can delete teams"` | `auth.uid() IS NOT NULL` |

⚠️ **CRITICAL:** RLS allows ANY authenticated user (including EMPLOYEE) to create, update, and delete ANY team. There are NO role-based restrictions at the database level. All access control is frontend-only — buttons are hidden in the UI based on role checks in `admin-layout.tsx`.

### RLS Policies on `departments`
Same pattern — `add-rls-policies.sql` lines 58-61 and `add-select-policies.sql` lines 32-35. Any authenticated user can CRUD departments.

---

## Backend Logic

### `teamsAPI` — `lib/api.ts` lines 2154-2443 (12 functions)

#### `getAll()` — `lib/api.ts` line 2158
Returns all teams. No filtering by department, role, or membership.

#### `getDepartments()` — `lib/api.ts` lines 2172-2187
Extracts unique department names from the `teams` table (NOT from the `departments` table). **These can diverge** from the actual departments table.

#### `getTeamByLeadId(leadId)` — `lib/api.ts` lines 2189-2205
Uses `.maybeSingle()` to find the team where `leader_id = leadId`.

#### `create(data)` — `lib/api.ts` lines 2207-2224
```typescript
supabase.from("teams").insert({
  name, description, department, members: []
}).select().single()
```
What gets auto-generated: `id`, `members` (empty array), `created_at`, `updated_at`. `leader_id` and `leader_name` remain NULL — leader must be assigned separately via `update()` or `EditTeamDialog`.

#### `update(id, data)` — `lib/api.ts` lines 2226-2258
Accepts `{ name?, description?, department?, leaderId? }` — converts `leaderId` to `leader_id` for the DB. **Does not accept `members` or `leader_name` in its TypeScript interface** (line 2230-2234), but `EditTeamDialog` passes them anyway. If Supabase ignores unknown keys, this is fine; if not, the members update could silently fail.

#### `delete(id)` — `lib/api.ts` lines 2260-2269
Simple DELETE — no cascade. Members are TEXT[] UIDs, not FK-linked, so deleting a team does not affect users.

#### `getTeamWithMembers(teamId)` — `lib/api.ts` lines 2289-2314
Fetches team + resolves member UIDs to `{ uid, name, email, avatar }` objects from the `users` table via `.in("uid", team.members)`.

#### `getTeamByLeadIdWithMembers(leadId)` — `lib/api.ts` lines 2319-2349
Same as above but looked up by `leader_id`.

#### `addMember(teamId, userId)` — `lib/api.ts` lines 2353-2386
1. Fetches current `members` array
2. Checks for duplicates (throws if already member)
3. Appends `userId` via array spread: `members: [...currentMembers, userId]`
⚠️ No validation that the user exists in the `users` table.

#### `removeMember(teamId, userId)` — `lib/api.ts` lines 2389-2415
Filters out `userId` from `members` array and updates.

#### `getAvailableUsers(teamId)` — `lib/api.ts` lines 2418-2443
1. Gets team's `department`, current `members`, and `leader_id`
2. Queries `users` WHERE `department = team.department`
3. Filters out: current members, team leader, and `role !== 'ADMIN'` (dead code — 'ADMIN' is not a valid role)

### `departmentsAPI` — `lib/api.ts` lines 2069-2140
Full CRUD on the `departments` table. No integration with teams — updating a department name does NOT cascade to `teams.department`.

---

## Frontend Logic

### Sidebar navigation — `components/admin-layout.tsx` lines 144-147
"Team Management" link appears under Administration section for CEO, C_LEVEL, and LEAD roles:
```typescript
{ title: "Team Management", url: `${basePath}/team`, icon: UserPlus, section: "admin" }
```

### Team Overview page — `app/(workspace)/team/page.tsx` (212 lines)
**Route:** `/team` — accessible to ALL authenticated users.

This page does NOT use `teamsAPI` at all. It:
1. Fetches ALL users via `usersAPI.getAll()` — filters out current user (`line 29-30`)
2. Fetches ALL tasks for each user via `tasksAPI.getUserTasks(member.uid)` — (`line 33`)
3. Shows per-member cards with task count, completion rate, overdue count, progress bar
4. Shows "Recent Team Activity" with last 5 tasks
5. Treats the entire organization as one big team — no filtering by actual `teams` table

### CEO Team Management — `app/(workspace)/admin/ceo/team/page.tsx` (603 lines)
**Route:** `/admin/ceo/team`

Three tabs:
- **Overview** — 4 stat cards (Total Employees, Leadership Team, Departments, Active Projects), Department Distribution (horizontal bar charts), Organization Structure (role distribution cards + visual hierarchy flow)
- **Departments** — per-department cards showing leadership (LEAD/C_LEVEL users) and employee list
- **Project Teams** — per-project cards showing project lead + team members, "Add Member" dialog that updates `projects.team_members` (NOT the `teams` table)

### C-Level Team Management — `app/(workspace)/admin/c-level/team/page.tsx` (183 lines)
**Route:** `/admin/c-level/team`

- 3 stat cards: Total Teams, Active Members (sum of all `members` array lengths), Team Leads
- Search bar filtering by name or description
- "New Team" button opens `CreateTeamDialog`
- Wraps `TeamsList` component for display (table on desktop, cards on mobile)
- Delete/Edit actions per team

### Lead Team Page — `app/(workspace)/admin/lead/team/page.tsx` (412 lines)
**Route:** `/admin/lead/team`

The most feature-rich team page. Fetches the **one team** where the current LEAD is `leader_id`:
- `teamsAPI.getTeamByLeadIdWithMembers(user.id)` — `line 62`
- Shows team name, description, department with member count badge
- "Add Member" dialog — dropdown of available users (same department, not already members) — `line 107`
- Members grid with avatars, names, emails, remove buttons (X)
- Confirmation dialog (`AlertDialog`) before member removal — `lines 361-391`
- Leader filtered OUT of displayed member list: `team.members.filter(m => m.uid !== team.leader_id)` — `line 287`
- Empty state: "No team assigned — Contact an administrator" — `lines 328-338`

### CreateTeamDialog — `components/create-team-dialog.tsx` (154 lines)
- Form: Name (required), Description (required), Department (select from `departmentsAPI.getAll()`)
- Fetches departments `departmentsAPI.getAll()` on dialog open — `line 57`
- Creates team via `teamsAPI.create(formData)` — `line 68`
- No leader or member assignment during creation

### EditTeamDialog — `components/edit-team-dialog.tsx` (315 lines)
- Form: Team Name, Description, Department, Team Leader (select), Team Members (multi-select)
- Leader selection: filters `users` to `CEO | C_LEVEL | LEAD` — `line 93`
- Members: dropdown to add, displays badges with avatars + X remove buttons
- Submits via `teamsAPI.update(team.id, { name, description, department, leader_id, leader_name, members })` — `lines 109-115`
- ⚠️ `teamsAPI.update` TypeScript interface does NOT accept `leader_name` or `members` — `lib/api.ts` lines 2230-2234. May silently fail or rely on Supabase accepting extra keys.

### TeamsList — `components/teams-list.tsx` (146 lines)
- Responsive: mobile cards + desktop table view
- Columns: Name, Description, Department (badge), Members (count), Actions (Edit)
- Delete with `confirm()` dialog — `line 38`
- Opens `EditTeamDialog` on edit — `line 128`

---

## Permissions Matrix

| Action | CEO | C_LEVEL | LEAD | EMPLOYEE | Enforcement |
|---|---|---|---|---|---|
| Create team | ✅ | ✅ | ❌ | ❌ | Frontend: nav hidden for LEAD/EMPLOYEE. RLS allows anyone. |
| Edit team (name/desc/dept) | ✅ | ✅ | ❌ | ❌ | Frontend: UI hidden. RLS allows anyone. |
| Delete team | ✅ | ✅ | ❌ | ❌ | Frontend: UI hidden. RLS allows anyone. |
| Assign team leader | ✅ | ✅ | ❌ | ❌ | Via EditTeamDialog |
| Add team member | ✅ (C-Level) | ✅ | ✅ (own team) | ❌ | RLS allows anyone |
| Remove team member | ✅ (C-Level) | ✅ | ✅ (own team) | ❌ | RLS allows anyone |
| View team member list | ✅ | ✅ | ✅ (own team) | ✅ | Via Team Overview page |
| View all teams list | ✅ | ✅ | ✅ | ✅ | RLS: any auth user |
| Create department | ✅ | ✅ | ❌ | ❌ | Via departmentsAPI (separate admin pages) |
| Edit department | ✅ | ✅ | ❌ | ❌ | Via departmentsAPI |
| Delete department | ✅ | ✅ | ❌ | ❌ | Via departmentsAPI |
| Invite user to team | ❌ | ❌ | ❌ | ❌ | Not implemented |
| Transfer team ownership | ❌ | ❌ | ❌ | ❌ | Not implemented |

---

## Edge Cases & Known Gaps

1. **No team invitation system.** Members are added directly without their consent. There is no invite token, email notification, or approval flow for team membership.

2. **RLS is permissive — frontend-only security.** Any authenticated user can CREATE, UPDATE, or DELETE any team via direct API calls. The UI hides buttons from EMPLOYEE and LEAD roles, but these users could use Supabase client directly.

3. **Denormalized department.** `teams.department` is TEXT with no FK to `departments`. Renaming a department in the `departments` table leaves stale values in `teams.department`. `teamsAPI.getDepartments()` extracts department names from teams (not from the departments table), so the two can diverge.

4. **Missing `leader_name` update on user deletion.** `leader_id` has `ON DELETE SET NULL` via FK, but `leader_name` is NOT automatically cleaned up. A deleted leader leaves a stale `leader_name` with NULL `leader_id`.

5. **API interface mismatch.** `teamsAPI.update()` accepts `{ name?, description?, department?, leaderId? }` but `EditTeamDialog` passes `{ leader_id, leader_name, members }` — `leader_name` and `members` are NOT in the TypeScript interface at `lib/api.ts` lines 2230-2234.

6. **No cascade on team deletion.** Deleting a team leaves `leader_id` references orphaned in any other table that may reference it. Team members' data is unaffected (they're TEXT[] UIDs).

7. **`A == 'ADMIN'` is dead code.** `teamsAPI.getAvailableUsers()` at `lib/api.ts` line 2433 filters `user.role !== 'ADMIN'` but 'ADMIN' is not in the CHECK constraint. This will never match.

8. **Team Overview page ignores actual teams.** `app/(workspace)/team/page.tsx` shows ALL users' tasks — it's a company-wide workload dashboard, not a team-scoped view. The name "Team Overview" is misleading.

9. **No "my teams" view for EMPLOYEE.** An EMPLOYEE cannot see which teams they belong to via any UI. They see everyone's workload in the Team Overview page.

10. **Membership stored as TEXT[] with no referential integrity.** Deleting a user from `users` leaves their UID in `teams.members[]`. The `getTeamWithMembers()` function will silently skip unresolvable UIDs.

11. **Leader is not automatically a member.** The `leader_id` is separate from the `members[]` array. The Lead Team Page explicitly filters the leader out of the displayed member list.

12. **No team-scoped settings.** Team creation does not auto-create chat groups, file folders, or any other resources. Team settings do not cascade to any other module.

13. **Orphaned teams.** A team with no leader (leader_id = NULL) is possible and handled gracefully by the Lead Team Page's empty state.

---

## Open Questions

- **ASSUMPTION — VERIFY:** Does `teamsAPI.update()` actually accept and persist `leader_name` and `members` when passed as extra keys? The TypeScript interface doesn't declare them but Supabase may still accept them via the spread operator.
- **ASSUMPTION — VERIFY:** Is the `add-select-policies.sql` version of the teams SELECT policy active, or only the `add-rls-policies.sql` version? Both create the same policy name, so the one applied last wins.
- Should the Team Overview page (`/team`) be renamed to "Workload Dashboard" to avoid confusion with actual team management?
