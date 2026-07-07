# RLS Vulnerabilities — Prioritized Fix List

> Each vulnerability includes the exact SQL fix to apply

---

## 🔴 CRITICAL #1: Chat Group Messages Leaked

**Table:** `chat_messages`
**Policy:** "Users can read their messages" (SELECT)
**Severity:** Critical — breaks confidentiality of ALL group chats

**The Bug:**

Two PERMISSIVE SELECT policies exist. PERMISSIVE = OR logic. Policy 2 cancels Policy 1's group membership check.

Policy 1 (correct):
```sql
sender_id = auth.uid() OR recipient_id = auth.uid()
OR (group_id IS NOT NULL
    AND auth.uid() IN (SELECT unnest(members) FROM chat_groups WHERE id::text = chat_messages.group_id))
```

Policy 2 (BROKEN):
```sql
sender_id = auth.uid() OR recipient_id = auth.uid() OR group_id IS NOT NULL
```

**Impact:** Any authenticated user can `SELECT * FROM chat_messages WHERE group_id IS NOT NULL` and read every group message from every group.

**Fix:**
```sql
DROP POLICY "Users can read their messages" ON chat_messages;
```
Policy 1 already handles all valid cases correctly.

---

## 🔴 CRITICAL #2: Storage Bucket Public with Zero RLS

**Bucket:** `uploads`
**Severity:** Critical — all uploaded files are publicly downloadable

**The Bug:**
- Bucket is marked PUBLIC
- Zero storage policies configured
- Anyone with a file URL can download any file without authentication

**Impact:** File URLs are guessable if storage paths follow a pattern. Task attachments, department files, employee uploads — all accessible.

**Fix (2 steps):**

Step 1 — Make bucket private:
```
Supabase Dashboard → Storage → uploads bucket → Settings → Make private
```

Step 2 — Add storage policies (at minimum):
```sql
-- Allow authenticated users to read files they uploaded or are shared with them
CREATE POLICY "Users can access their files"
ON storage.objects
FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM files
            WHERE files.storage_path = storage.objects.name
            AND (files.uploaded_by = auth.uid()::text OR auth.uid()::text = ANY(files.shared_with))
        )
    )
);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 🟡 HIGH #1: User Table Readable by Unauthenticated Visitors

**Table:** `users`
**Policy:** "Users can read all users" (SELECT)
**Severity:** High — exposes all user data (names, emails, roles, departments)

**The Bug:**
```sql
-- Policy: Users can read all users
-- Roles: public
-- Qual: true  <-- anyone, even without login
```

**Impact:** `supabase.from('users').select('*')` returns all 13 users' names, emails, roles, departments without any authentication.

**Fix:**
```sql
DROP POLICY "Users can read all users" ON users;
```
The "Authenticated users can read users" policy already exists:
```sql
CREATE POLICY "Authenticated users can read users" ON users
FOR SELECT USING (auth.uid() IS NOT NULL);
```

---

## 🟡 HIGH #2: Write Operations Have No Role Checks (6 Tables)

**Tables:** `projects`, `tasks`, `announcements`, `warnings`, `departments`, `teams`
**Severity:** High — any employee can delete all data via direct API calls

**The Bug:**
All INSERT/UPDATE/DELETE policies on these 6 tables only check:
```sql
auth.uid() IS NOT NULL
```

**Impact:** An employee opens browser dev tools, runs:
```javascript
supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
```
All projects are deleted. The frontend TypeScript restricts who sees the delete button, but the database enforces nothing.

**Fix — add role checks:**

```sql
-- projects: Only CEO and C_LEVEL can create/update/delete
DROP POLICY "Authenticated users can create projects" ON projects;
DROP POLICY "Authenticated users can update projects" ON projects;
DROP POLICY "Authenticated users can delete projects" ON projects;

CREATE POLICY "admins_can_manage_projects" ON projects
FOR ALL
USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role IN ('CEO', 'C_LEVEL'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role IN ('CEO', 'C_LEVEL'))
);

-- tasks: CEO, C_LEVEL, LEAD can create; creators can update/delete own
CREATE POLICY "managers_can_create_tasks" ON tasks
FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role IN ('CEO', 'C_LEVEL', 'LEAD'))
);

CREATE POLICY "owners_can_manage_own_tasks" ON tasks
FOR UPDATE
USING (created_by = auth.uid()::text);

CREATE POLICY "owners_can_delete_own_tasks" ON tasks
FOR DELETE
USING (created_by = auth.uid()::text);

-- announcements: CEO, C_LEVEL only
-- warnings: CEO, C_LEVEL only
-- departments: CEO only
-- teams: CEO, C_LEVEL, LEAD only
-- (Apply similar patterns)
```

---

## 🟡 MEDIUM: Calendar Events Visible to All

**Table:** `calendar_events`
**Policy:** "Users can read all events" (SELECT)
**Severity:** Medium — private executive meetings visible to all employees

**The Bug:**
```sql
-- Policy: Users can read all events
-- Roles: authenticated
-- Qual: true
```

**Impact:** Any logged-in employee sees every meeting including CEO private meetings.

**Fix:**
```sql
DROP POLICY "Users can read all events" ON calendar_events;

CREATE POLICY "Users see own and invited events" ON calendar_events
FOR SELECT
USING (
    organizer_id = auth.uid()::text
    OR auth.uid()::text = ANY(invited_member_ids)
);
```

---

## Fix Priority Summary

| # | Vulnerability | Effort | Risk if Unfixed |
|---|---|---|---|
| 1 | Chat messages leaked | 1 SQL line | Full group chat exposure |
| 2 | Storage bucket public | 2 dashboard clicks + SQL | All files downloadable |
| 3 | User table public | 1 SQL line | Full user data dump |
| 4 | No write role checks | ~30 SQL lines | Data destruction |
| 5 | Calendar events visible all | 6 SQL lines | Privacy leak |
