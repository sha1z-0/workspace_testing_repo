# RLS Policies — All 60 Row-Level Security Policies

> Verified from `pg_policies` on 2026-06-28

---

## Summary by Table

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|---|---|---|---|---|---|
| users | 2 | 1 | 1 | 1 | 5 |
| projects | 2 | 1 | 1 | 1 | 5 |
| tasks | 2 | 1 | 1 | 1 | 5 |
| announcements | 2 | 1 | 1 | 1 | 5 |
| chat_messages | 2 ⚠️ | 1 | 1 | 1 | 5 |
| chat_groups | 1 | 1 | 1 | 1 | 4 |
| calendar_events | 1 | 1 | 1 | 1 | 4 |
| notifications | 1 | 1 | 1 | 1 | 4 |
| warnings | 1 | 1 | 1 | 1 | 4 |
| time_tracking | 1 | 1 | 1 | 1 | 4 |
| departments | 1 | 1 | 1 | 1 | 4 |
| teams | 1 | 1 | 1 | 1 | 4 |
| activity_logs | 3 | 1 | 0 | 0 | 4 |
| files | 2 | 1 | 1 | 1 | 5 |
| files_department_shares | 3 | 1 | 1 | 1 | 6 |
| task_milestones | 1 | 1 (ALL) | 0 | 0 | 2 |
| **Total** | **24** | **15** | **13** | **12** | **60** |

⚠️ = contains critical vulnerability

---

## Full Policy Listing

### users (5 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users can read all users | SELECT | public | **true** ← CRITICAL: unauthenticated access |
| Authenticated users can read users | SELECT | public | auth.uid() IS NOT NULL |
| Users can update own profile | UPDATE | public | auth.uid()::text = uid |
| Users can insert own profile | INSERT | public | WITH CHECK: auth.uid()::text = uid |
| Users can delete own profile | DELETE | public | auth.uid()::text = uid |

**Issue:** First policy allows anyone (including unauthenticated) to dump the entire user table.

### projects (5 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read projects | SELECT | public | auth.uid() IS NOT NULL |
| Projects readable by all | SELECT | public | true |
| Authenticated users can create projects | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update projects | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete projects | DELETE | public | auth.uid() IS NOT NULL |

**Issue:** Write policies only check authentication, not role. Any employee can delete all projects.

### tasks (5 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read tasks | SELECT | public | auth.uid() IS NOT NULL |
| Tasks readable by all | SELECT | public | true |
| Authenticated users can create tasks | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update tasks | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete tasks | DELETE | public | auth.uid() IS NOT NULL |

**Issue:** Same as projects — no role checks on writes.

### announcements (5 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read announcements | SELECT | public | auth.uid() IS NOT NULL |
| Announcements readable by all | SELECT | public | true |
| Authenticated users can create announcements | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update announcements | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete announcements | DELETE | public | auth.uid() IS NOT NULL |

### chat_messages (5 policies — 1 CRITICAL BUG)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users see their chat messages | SELECT | public | `sender_id = auth.uid() OR recipient_id = auth.uid() OR (group_id IS NOT NULL AND auth.uid() IN (SELECT unnest(members) FROM chat_groups WHERE id::text = chat_messages.group_id))` |
| **Users can read their messages** | SELECT | public | `sender_id = auth.uid() OR recipient_id = auth.uid() OR group_id IS NOT NULL` ← **BROKEN** |
| Authenticated users can send messages | INSERT | public | WITH CHECK: auth.uid()::text = sender_id |
| Users can update their messages | UPDATE | public | auth.uid()::text = sender_id |
| Users can delete their messages | DELETE | public | auth.uid()::text = sender_id |

**Critical Bug:** Two PERMISSIVE SELECT policies. PERMISSIVE policies are OR'd together. Policy 2's `group_id IS NOT NULL` overrides Policy 1's group membership check. Any authenticated user can read ALL group messages from ALL groups.

**Fix:** Drop Policy 2 ("Users can read their messages"). Policy 1 is already correct.

### chat_groups (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read groups | SELECT | public | auth.uid() IS NOT NULL |
| Authenticated users can create groups | INSERT | public | WITH CHECK: auth.uid()::text = created_by |
| Group creators can update groups | UPDATE | public | auth.uid()::text = created_by |
| Group creators can delete groups | DELETE | public | auth.uid()::text = created_by |

### calendar_events (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users can read all events | SELECT | authenticated | true |
| Users can create own events | INSERT | authenticated | WITH CHECK: auth.uid()::text = organizer_id |
| Users can update own events | UPDATE | authenticated | auth.uid()::text = organizer_id |
| Users can delete own events | DELETE | authenticated | auth.uid()::text = organizer_id |

**Issue:** All authenticated users see all events including private executive meetings.

### notifications (4 policies — well-designed)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users can read own notifications | SELECT | authenticated | auth.uid()::text = user_id |
| Authenticated users can create any notification | INSERT | authenticated | WITH CHECK: true |
| Users can update own notifications | UPDATE | authenticated | auth.uid()::text = user_id |
| Users can delete own notifications | DELETE | authenticated | auth.uid()::text = user_id |

### warnings (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read warnings | SELECT | public | auth.uid() IS NOT NULL |
| Authenticated users can create warnings | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update warnings | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete warnings | DELETE | public | auth.uid() IS NOT NULL |

### time_tracking (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read time tracking | SELECT | public | auth.uid() IS NOT NULL |
| Users can create own time entries | INSERT | public | WITH CHECK: auth.uid()::text = user_id |
| Users can update own time entries | UPDATE | public | auth.uid()::text = user_id |
| Users can delete own time entries | DELETE | public | auth.uid()::text = user_id |

### departments (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read departments | SELECT | public | auth.uid() IS NOT NULL |
| Authenticated users can create departments | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update departments | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete departments | DELETE | public | auth.uid() IS NOT NULL |

### teams (4 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Authenticated users can read teams | SELECT | public | auth.uid() IS NOT NULL |
| Authenticated users can create teams | INSERT | public | WITH CHECK: auth.uid() IS NOT NULL |
| Authenticated users can update teams | UPDATE | public | auth.uid() IS NOT NULL |
| Authenticated users can delete teams | DELETE | public | auth.uid() IS NOT NULL |

### activity_logs (4 policies — well-designed)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| ceo_can_view_all_activity_logs | SELECT | public | EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'CEO') |
| clevel_can_view_non_ceo_activity_logs | SELECT | public | EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'C_LEVEL') AND user_role <> 'CEO' |
| users_can_view_own_activity_logs | SELECT | public | user_id = auth.uid()::text |
| service_can_insert_activity_logs | INSERT | public | WITH CHECK: true |

### files (5 policies)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users can view own uploaded files | SELECT | public | uploaded_by = auth.jwt() ->> 'sub' |
| Users can view files shared with them | SELECT | public | uploaded_by = ANY(shared_with) OR auth.jwt() ->> 'sub' = ANY(shared_with) |
| Users can upload files | INSERT | public | WITH CHECK: uploaded_by = auth.jwt() ->> 'sub' |
| Users can update own files | UPDATE | public | uploaded_by = auth.jwt() ->> 'sub' |
| Users can delete own files | DELETE | public | uploaded_by = auth.jwt() ->> 'sub' |

**Note:** These protect the `files` table, but the `uploads` storage bucket itself has **zero RLS policies** and is **PUBLIC**.

### files_department_shares (6 policies — well-designed)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| CEO and C_LEVEL can view all department files | SELECT | public | EXISTS (SELECT 1 FROM users WHERE uid = current_setting('app.current_user_id', true) AND role = ANY(ARRAY['CEO','C_LEVEL'])) |
| Department heads can view their department files | SELECT | public | EXISTS (SELECT 1 FROM departments d JOIN users u ON u.uid = current_setting(...) WHERE d.id = files_department_shares.department_id AND d.head_id = u.uid) |
| Department members can view their department files | SELECT | public | EXISTS (SELECT 1 FROM users u WHERE u.uid = current_setting(...) AND u.department = (SELECT name FROM departments WHERE id = files_department_shares.department_id)) |
| Only CEO and C_LEVEL can share files to departments | INSERT | public | WITH CHECK: EXISTS (SELECT 1 FROM users WHERE uid = current_setting(...) AND role = ANY(ARRAY['CEO','C_LEVEL'])) |
| Only CEO and C_LEVEL can update department shares | UPDATE | public | EXISTS (SELECT 1 FROM users WHERE uid = current_setting(...) AND role = ANY(ARRAY['CEO','C_LEVEL'])) |
| Only CEO and C_LEVEL can delete department shares | DELETE | public | EXISTS (SELECT 1 FROM users WHERE uid = current_setting(...) AND role = ANY(ARRAY['CEO','C_LEVEL'])) |

### task_milestones (2 policies — well-designed)

| Policy Name | Command | Roles | Condition |
|---|---|---|---|
| Users can view milestones for accessible tasks | SELECT | public | EXISTS (SELECT 1 FROM tasks t LEFT JOIN users u ON u.uid = current_setting(...) WHERE t.id = task_milestones.task_id AND (u.role = ANY(ARRAY['CEO','C_LEVEL','LEAD']) OR t.created_by = u.uid OR u.uid = ANY(t.assignee_ids) OR u.uid = ANY(t.viewer_ids))) |
| Task assignees can manage milestones | ALL | public | EXISTS (SELECT 1 FROM tasks t LEFT JOIN users u ON u.uid = current_setting(...) WHERE t.id = task_milestones.task_id AND (u.role = ANY(ARRAY['CEO','C_LEVEL','LEAD']) OR t.created_by = u.uid OR u.uid = ANY(t.assignee_ids))) |

---

## RLS Quality Assessment

| Table | Quality | Issue |
|---|---|---|
| activity_logs | ✅ Excellent | Role-based read, service-only insert |
| files_department_shares | ✅ Excellent | Granular role + department hierarchy |
| task_milestones | ✅ Good | Role + assignee/viewer checks |
| notifications | ✅ Good | Own data only, intentional insert openness |
| files | ✅ Good | Owner + shared-with logic |
| calendar_events | ⚠️ Medium | All events visible to all authenticated |
| chat_messages | 🔴 Critical | Duplicate PERMISSIVE policy leaks all group messages |
| users | 🟡 High | Unauthenticated read via `qual: true` |
| projects | 🟡 High | No role check on writes |
| tasks | 🟡 High | No role check on writes |
| announcements | 🟡 High | No role check on writes |
| warnings | 🟡 High | No role check on writes |
| departments | 🟡 High | No role check on writes |
| teams | 🟡 High | No role check on writes |
| time_tracking | ⚠️ Medium | All authenticated users can see all sessions |
| chat_groups | ⚠️ Medium | All authenticated users see all groups |
