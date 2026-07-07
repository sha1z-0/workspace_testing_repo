# Files

## Overview
File management is split across three subsystems: (1) **Task submissions** — file uploads attached to task completion, stored in the `uploads` bucket; (2) **Vault** — secure file/text storage for CEO/C_LEVEL only, stored in the `vault` bucket; (3) **Workspace Files page** (`/files`) — a mock/stub page using hardcoded fake data with dead Firebase code, not connected to Supabase Storage. There is no unified file metadata table — each subsystem tracks its own metadata (in `tasks`, `vault_items`, or mock state). Chat file attachments are typed but not implemented.

---

## Data Model

### Storage Buckets (Supabase Storage)

Two buckets are defined, both must be manually set to PRIVATE in the Supabase Dashboard:

**Bucket 1: `uploads`** — defined/configured in `components/migrations/002-storage-fixes.sql`
- Purpose: General file storage for task submissions
- Privacy: Must be set to PRIVATE in Supabase Dashboard (line 7-8)
- MIME restrictions (recommended in SQL comments, lines 58-61): PDF, DOC, DOCX, PNG, JPEG, GIF
- Max file size (recommended): 10MB

**Bucket 2: `vault`** — defined/configured in `components/migrations/003-vault-module.sql`
- Purpose: Secure storage for CEO/C_LEVEL documents
- Privacy: Must be set to PRIVATE in Supabase Dashboard (line 7-8)
- MIME restrictions (recommended in SQL comments, lines 13-15): PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG, GIF
- Max file size (recommended): 10MB

### Storage RLS Policies

#### `uploads` bucket — `components/migrations/002-storage-fixes.sql` lines 16-56

**Read (SELECT)** — lines 16-29:
```sql
CREATE POLICY "storage_read_own" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.submission_file_url IS NOT NULL
      AND auth.uid()::text = ANY(tasks.assignee_ids)
      AND storage.objects.name = tasks.submission_file_url
    )
  )
);
```
Allows: file owner OR any assignee of the task the file was submitted to.

**Insert (INSERT)** — lines 32-37:
```sql
CREATE POLICY "storage_insert" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND owner_id = auth.uid()::text
);
```

**Update (UPDATE)** — lines 40-42:
```sql
CREATE POLICY "storage_update_own" ON storage.objects
FOR UPDATE USING (owner_id = auth.uid()::text);
```

**Delete (DELETE)** — lines 45-47:
```sql
CREATE POLICY "storage_delete_own" ON storage.objects
FOR DELETE USING (owner_id = auth.uid()::text);
```

#### `vault` bucket — `components/migrations/003-vault-module.sql` lines 68-94

**Read (SELECT)** — lines 68-73:
```sql
CREATE POLICY "vault_storage_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);
```

**Insert (INSERT)** — lines 76-81:
```sql
CREATE POLICY "vault_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);
```

**Delete (DELETE)** — lines 84-89:
```sql
CREATE POLICY "vault_storage_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);
```
⚠️ No UPDATE policy for vault bucket. Files cannot be replaced once uploaded.

### Task submission file metadata — in `tasks` table

Columns added by `components/migrations/001-task-module-overhaul.sql` lines 15-17:
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_name TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_size INTEGER;
```
Also: `submission_status TEXT DEFAULT 'pending'` — tracks submission lifecycle. `submission_open BOOLEAN DEFAULT true` — controls whether assignee can submit.

File upload path in storage: `submissions/{userId}/{taskId}/{timestamp}_{safeName}` — `lib/api.ts` line 960.

### Vault file metadata — `vault_items` table

Created by `components/migrations/003-vault-module.sql` lines 24-31. Typed in `lib/types.ts` lines 580-633.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `title` | TEXT | NOT NULL | — | |
| `category` | TEXT | NOT NULL | — | CHECK: `IN ('document','api_key','password','other')` |
| `description` | TEXT | NULL | — | |
| `text_value` | TEXT | NULL | — | For non-document items |
| `file_url` | TEXT | NULL | — | Storage URL for documents |
| `file_name` | TEXT | NULL | — | |
| `file_size` | INTEGER | NULL | — | |
| `created_by` | TEXT | NOT NULL | — | |
| `created_by_name` | TEXT | NULL | — | |
| `created_at` | TIMESTAMPTZ | — | `now()` | |
| `updated_at` | TIMESTAMPTZ | — | `now()` | |

File upload path in storage: `vault/{userId}/{timestamp}_{safeName}` — `lib/api.ts` line 2533.

### Vault RLS Policies — `components/migrations/003-vault-module.sql` lines 37-65

```sql
-- Read (lines 41-43): CEO/C_LEVEL only
CREATE POLICY "vault_read" ON vault_items FOR SELECT USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Insert (lines 46-48): CEO/C_LEVEL only
CREATE POLICY "vault_insert" ON vault_items FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Update (lines 52-56): CEO/C_LEVEL AND created_by = self
CREATE POLICY "vault_update" ON vault_items FOR UPDATE USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
  AND created_by = auth.uid()::text
);

-- Delete (lines 60-64): CEO/C_LEVEL AND created_by = self
CREATE POLICY "vault_delete" ON vault_items FOR DELETE USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
  AND created_by = auth.uid()::text
);
```

### File types ONLY in types, NOT in SQL

- `chat_messages.attachments: Json | null` exists in `lib/types.ts` lines 285, 298, 311 but is absent from ALL SQL schema files. The chat UI has no file attachment code.

### No dedicated file metadata table for workspace files

The `/files` page uses hardcoded mock data (`app/(workspace)/files/page.tsx` lines 43-79). There is no `files` table in the database schema.

---

## Backend Logic

All file operations are in `lib/api.ts`. There are no Edge Functions or API routes for file management (task submissions go through client-side Supabase SDK, vault file URLs are generated client-side).

### Task submission upload — `lib/api.ts` lines 938-984 (`tasksAPI.uploadSubmissionFile`)

```typescript
uploadSubmissionFile: async (taskId: string, file: File, userId: string) => {
  // 1. Validate file type (lines 942-948):
  const ALLOWED_TYPES = ["application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png", "image/jpeg", "image/gif"]
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error(...)

  // 2. Validate file size (lines 949-951):
  const MAX_SIZE = 10 * 1024 * 1024  // 10MB
  if (file.size > MAX_SIZE) throw new Error(...)

  // 3. Upload to 'uploads' bucket (lines 958-965):
  const filePath = `submissions/${userId}/${taskId}/${timestamp}_${safeName}`
  supabase.storage.from("uploads").upload(filePath, file, { cacheControl: "3600" })

  // 4. Get public URL (lines 968-974):
  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath)

  // 5. Save metadata via submitTask (line 976):
  await tasksAPI.submitTask(taskId, fileUrl, fileName, fileSize)
}
```

### Task submission — `lib/api.ts` lines 846-861 (`tasksAPI.submitTask`)
Sets `submission_file_url`, `submission_file_name`, `submission_file_size`, `submission_status = 'submitted'`. All three file params are required.

### Submission toggle — `lib/api.ts` lines 863-877 (`tasksAPI.toggleSubmission`)
Sets `submission_open` to true/false — used by assignor to open/close the submission window.

### Approve task — `lib/api.ts` lines 879-896 (`tasksAPI.approveTask`)
Sets `submission_status = 'approved'`, `approved_at`, `approved_by`, and `submission_open = false`.

### Reject task — `lib/api.ts` lines 898-912 (`tasksAPI.rejectTask`)
Sets `submission_status = 'rejected'`, `submission_open = true` (reopens for resubmission).

### Vault API — `lib/api.ts` lines 2453-2633 (`vaultAPI`)

#### `getAll()` — line 2458
Returns all `vault_items` ordered by `created_at` DESC. RLS restricts to CEO/C_LEVEL.

#### `create()` — lines 2464-2487
Creates text-only vault item (API keys, passwords, other). Does NOT handle file uploads.

#### `uploadFile()` — lines 2489-2563
1. Validates file type (PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG, GIF) — lines 2515-2520
2. Validates size (10MB max) — lines 2522-2524
3. Uploads to `vault` bucket — line 2534
4. Gets public URL — line 2542
5. Creates `vault_items` row with file metadata — lines 2544-2557

⚠️ **Note:** Uses `getPublicUrl()` on a PRIVATE bucket. The public URL only works because Supabase RLS on `storage.objects` intercepts the request. If the bucket RLS were disabled, all vault files would be publicly accessible. The vault page uses signed URLs for download (60-second expiry) as a safer alternative.

#### `update()` — lines 2565-2588
Updates title, category, description, text_value. Cannot update file.

#### `delete()` — lines 2590-2618
Deletes file from `vault` storage (if `fileUrl` provided), then deletes `vault_items` row.

#### `getSignedUrl()` — lines 2620-2633
Generates a 60-second signed URL via `supabase.storage.from("vault").createSignedUrl(filePath, 60)`.

---

## Real-Time / Notification Behavior

**No realtime subscriptions for files.** File uploads are one-shot operations with no broadcast. No polling for file changes. The workspace files page has no refresh mechanism at all (uses static mock data).

**No file change notifications.** Uploading a file does not create a notification in the `notifications` table (except task submission which implicitly changes task state, but the file itself does not trigger a notification).

---

## Frontend Logic

### Workspace Files page — `app/(workspace)/files/page.tsx` (525 lines)

**Status: MOCK/STUB — NOT connected to Supabase.** The page has a TODO comment at line 101: `// TODO: Implement file listing with Supabase Storage`.

- **Mock data:** 5 hardcoded files at lines 43-79 (Project Proposal.docx, Financial Report.xlsx, etc.)
- **Upload dialog:** Has file input + description field (lines 303-340). The `handleFileUpload` function (lines 118-213) references **Firebase Storage** (`getStorage()`, `ref()`, `uploadBytesResumable()`) — ALL of this is dead Firebase code that will throw runtime errors if triggered. The actual upload just logs: `"File upload requires Supabase Storage setup"`.
- **Download:** `handleFileDownload()` (lines 215-233) tries to use `file.url` from mock data. Falls back to error toast.
- **Delete:** `handleFileDelete()` (lines 235-258) also references Firebase Storage — dead code.
- **Filter tabs:** "All Files", "Recent", "Shared" — "Recent" and "Shared" show empty states (lines 511-527).
- **No search on server-side.** Client-side text filter on file names (line 261).
- **No sort.** Cards displayed in array order.
- **No real upload possible.** The upload function references `getStorage()` which is not defined/imported in the Supabase context.

### Task submission file UI — `app/(workspace)/tasks/page.tsx`

- **Submit dialog:** Opens via "Submit Task" or "Resubmit" button — lines ~755-770
- File input with accept attribute: `.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif` — line ~787
- Shows filename + size after selection — lines ~790-795
- Submit button calls `handleSubmitTask()` (lines ~255-270) which calls `tasksAPI.uploadSubmissionFile()`
- Submit button disabled when `!submissionFile` — line ~805
- Submitted file shown as inline badge with filename + FileText icon — lines ~457-461

### Vault page — `app/(workspace)/vault/page.tsx` (475 lines)

- **Access guard:** Redirects non-CEO/C_LEVEL to `/dashboard` — lines 60-63. Returns `null` if not C-Level.
- **Categories:** All Items, Documents, API Keys, Passwords, Other — tabs with animated indicator
- **Document items:** Download button using `vaultAPI.getSignedUrl()` (60-second signed URL) — `handleDownload()` at lines ~152-164
- **Text items (API keys/passwords):** "Click to Reveal" toggle with eye icon — lines ~198-214. Revealed text shown in a `<code>` block with copy-to-clipboard button.
- **Add dialog:** Category-specific inputs — file upload for documents, text input for keys/passwords
- **Edit dialog:** Updates title, category, description, text_value — can reopen add dialog in edit mode via `handleOpenEdit()` at lines ~88-94
- **Delete:** With confirmation dialog (`AlertDialog`) at lines ~399-416
- **Can-manage check:** `canManage = item.created_by === user?.id` — only creator can edit/delete (line ~169)
- All vault items are visible to all CEO/C_LEVEL users (RLS allows read for all CEO/C_LEVEL), but only the creator can edit/delete specific items

---

## Permissions Matrix

| Action | CEO | C_LEVEL | LEAD | EMPLOYEE | Enforcement |
|---|---|---|---|---|---|
| View workspace files page | ✅ | ✅ | ✅ | ✅ | No restrictions |
| Upload to workspace files | ❌ | ❌ | ❌ | ❌ | Stub page — upload buttons use dead Firebase code |
| Upload task submission | ✅ | ✅ | ✅ | ✅ | RLS: assignee of task, `submission_open = true` |
| View own task submission file | ✅ | ✅ | ✅ | ✅ | RLS: file owner OR task assignee |
| View others' task submission files | ✅ (assignor) | ✅ (assignor) | ✅ (assignor) | ✅ (assignee) | RLS: `storage_read_own` — task assignees |
| Approve/reject submission | ✅ (assignor) | ✅ (assignor) | ✅ (assignor) | ❌ | RLS: `task_update` assigner-only |
| View vault page | ✅ | ✅ | ❌ | ❌ | Frontend: redirect to /dashboard. RLS: CEO/C_LEVEL |
| Upload to vault | ✅ | ✅ | ❌ | ❌ | RLS: `vault_storage_insert` — CEO/C_LEVEL |
| View vault items | ✅ | ✅ | ❌ | ❌ | RLS: `vault_read` — CEO/C_LEVEL |
| Download vault file | ✅ | ✅ | ❌ | ❌ | RLS: `vault_storage_read` — CEO/C_LEVEL + signed URL |
| Edit vault item | ✅ (own) | ✅ (own) | ❌ | ❌ | RLS: `vault_update` — CEO/C_LEVEL + `created_by = self` |
| Delete vault item | ✅ (own) | ✅ (own) | ❌ | ❌ | RLS: `vault_delete` — CEO/C_LEVEL + `created_by = self` |
| Share file externally | ❌ | ❌ | ❌ | ❌ | Not implemented |
| Move/rename file | ❌ | ❌ | ❌ | ❌ | Not implemented |
| File version history | ❌ | ❌ | ❌ | ❌ | Not implemented |

---

## Edge Cases & Known Gaps

1. **Workspace Files page is entirely non-functional.** The upload, download, and delete functions reference Firebase Storage (`getStorage()`, `ref()`, `uploadBytesResumable()`) which is removed from the project. Running any file operation from this page will throw runtime errors. The page needs a full rewrite to use Supabase Storage APIs.

2. **Vault uses public URLs on a private bucket.** `vaultAPI.uploadFile()` at `lib/api.ts` line 2542 calls `getPublicUrl()`. The vault page downloads via signed URLs (`getSignedUrl`), but the stored `file_url` is a public URL. If bucket RLS were ever disabled or misconfigured, all vault files would be publicly exposed.

3. **No vault file UPDATE/replace.** Once a vault file is uploaded, it cannot be replaced or updated. The `vaultAPI.update()` only updates metadata (title, description, etc.). There is no `vault_storage_update` RLS policy, and no API method for replacing a vault file.

4. **chat_messages.attachments is typed but NOT implemented.** `lib/types.ts` lines 285, 298, 311 defines `attachments: Json | null` on chat_messages. No SQL schema file has this column. The chat UI has no file upload button or attachment handling. This is a type-only artifact.

5. **Submission file requirement is frontend-only.** The "Submit Task" button is disabled without a file, but `tasksAPI.submitTask()` does not check that `fileUrl` is non-null at the API level. A direct Supabase call could set `submission_status = 'submitted'` without any file. No database CHECK constraint enforces this.

6. **No storage quotas.** Max file size is 10MB (hardcoded in two places: `lib/api.ts` lines 949-951 for task submissions and lines 2522-2524 for vault). No per-user, per-team, or total storage quotas are enforced. Supabase free tier limits apply at the project level.

7. **No file type validation at the storage bucket level.** MIME restrictions are documented in SQL comments (`002-storage-fixes.sql` lines 58-61, `003-vault-module.sql` lines 13-15) as manual dashboard configuration steps. If the founder hasn't configured these in the Supabase Dashboard, any file type can be uploaded.

8. **Duplicate file handling.** Each upload creates a timestamped path (`{timestamp}_{safeName}`), so uploading the same file twice creates two copies. No deduplication. No overwrite protection (though `upsert: false` prevents accidental replacement at the same exact path).

9. **No file metadata table for workspace files.** Unlike vault and task submissions which have proper database tables (`vault_items`, `tasks.submission_file_*`), workspace files would need a new table if the stub page is implemented.

10. **No search or filter on server side.** All file filtering is client-side on whatever data is loaded (mock data for workspace files, full vault_items list for vault).

11. **Storage RLS visibility gap.** The `storage_read_own` policy for `uploads` bucket only handles the `submission_file_url` matching `storage.objects.name` — but the URL stored in `tasks` is a full public URL (e.g., `https://xxx.supabase.co/storage/v1/object/public/uploads/submissions/...`), whereas `storage.objects.name` is just the path (`submissions/...`). These might not match, which could break the assignee read-access policy.

12. **No integration between chat and files.** Chat messages cannot carry file attachments despite the type definition existing. There is no "attach from vault" or "attach from workspace files" feature.

---

## Open Questions

- **ASSUMPTION — VERIFY:** Has the founder manually configured the `uploads` and `vault` buckets as PRIVATE in the Supabase Dashboard, with the recommended MIME type restrictions? The migration SQL documents these as manual steps.
- **ASSUMPTION — VERIFY:** Does `storage.objects.name` match the full URL stored in `tasks.submission_file_url`? If not, the `storage_read_own` policy's EXISTS subquery will never match and task file access via RLS is broken.
- Should the workspace files page be implemented to use Supabase Storage, or should it be removed/replaced with links to the Vault and task submission areas?
- Should `chat_messages.attachments` be implemented as an actual column, or removed from the TypeScript types to avoid confusion?
