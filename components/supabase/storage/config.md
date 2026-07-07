# Storage Configuration

> Verified from Supabase Dashboard — Storage bucket and contents
> Date: 2026-06-28

---

## Bucket: `uploads`

| Setting | Value |
|---|---|
| **Visibility** | **PUBLIC** ❌ |
| **File Size Limit** | 50 MB |
| **Allowed MIME Types** | Any (no restriction) |
| **RLS Policies** | **0** ❌ |
| **Created** | Pre-existing (not newly created) |

---

## Folder Structure (5 folders)

| Folder | Likely Purpose |
|---|---|
| `department-files/` | Department-scoped file storage |
| `files/` | General file uploads |
| `task completions/` | Task completion attachments |
| `uploads by employee/` | Employee file uploads |
| `uploads/` | General uploads (root level) |

The folder structure suggests the app was designed for organized file management across departments, tasks, and employees — but the underlying `files` and `files_department_shares` tables have no API modules.

---

## Security Assessment

| Layer | Protection? | Status |
|---|---|---|
| Bucket level | RLS policies | **0 policies — PUBLIC bucket** |
| Database level | `files` table RLS | ✅ 5 policies (owner + shared-with logic) |
| Database level | `files_department_shares` RLS | ✅ 7 policies (granular role-based) |
| URL level | Signed URLs? | ❌ No — direct public URLs |

**The Gap:** The `files` table has proper RLS, but the storage bucket has none. RLS on the database table doesn't protect the actual file bytes in storage. Anyone with a direct URL to a stored file can download it.

---

## Required Fixes

### 1. Make bucket private
```
Supabase Dashboard → Storage → uploads → Settings → Toggle to Private
```

### 2. Add storage RLS policies
```sql
-- Read: Users access only their own files or files shared with them
CREATE POLICY "Users access own files"
ON storage.objects FOR SELECT
USING (
    auth.role() = 'authenticated'
    AND (
        owner = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM files
            WHERE files.storage_path = storage.objects.name
            AND (files.uploaded_by = auth.uid()::text OR auth.uid()::text = ANY(files.shared_with))
        )
    )
);

-- Insert: Only authenticated users
CREATE POLICY "Users upload files"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Update/Delete: Owner only
CREATE POLICY "Owners update files"
ON storage.objects FOR UPDATE
USING (owner = auth.uid()::text);

CREATE POLICY "Owners delete files"
ON storage.objects FOR DELETE
USING (owner = auth.uid()::text);
```

### 3. Restrict MIME types
Limit to common office document types instead of accepting any file:
```
image/*, application/pdf, application/msword,
application/vnd.openxmlformats-officedocument.*,
text/plain, text/csv, application/zip
```
