-- ============================================================
-- FINOVA WORKSPACE — VAULT MODULE
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hudqmaxudupvxpfkmfna/sql/new
-- ============================================================

-- NOTE: Before running, create a PRIVATE bucket named 'vault' in:
-- Supabase Dashboard → Storage → New Bucket
-- Name: vault
-- Public: false (PRIVATE)
-- Then set: Allowed MIME types = application/pdf, application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--   application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--   image/png, image/jpeg, image/gif
-- Max file size: 10 MB

-- ============================================================
-- 1. CREATE vault_items TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('document', 'api_key', 'password', 'other')),
  description TEXT,
  text_value TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_by TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES for vault_items
-- ============================================================

-- Read: Only CEO/C_LEVEL can see vault items
CREATE POLICY "vault_read" ON vault_items
FOR SELECT USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Insert: Only CEO/C_LEVEL can add vault items
CREATE POLICY "vault_insert" ON vault_items
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Update: Only CEO/C_LEVEL can update their own items
CREATE POLICY "vault_update" ON vault_items
FOR UPDATE USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
  AND created_by = auth.uid()::text
);

-- Delete: Only CEO/C_LEVEL can delete their own items
CREATE POLICY "vault_delete" ON vault_items
FOR DELETE USING (
  public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
  AND created_by = auth.uid()::text
);

-- ============================================================
-- 4. STORAGE RLS POLICIES for vault bucket
-- ============================================================

-- Read files from vault bucket
DROP POLICY IF EXISTS "vault_storage_read" ON storage.objects;
CREATE POLICY "vault_storage_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Upload files to vault bucket
DROP POLICY IF EXISTS "vault_storage_insert" ON storage.objects;
CREATE POLICY "vault_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- Delete files from vault bucket
DROP POLICY IF EXISTS "vault_storage_delete" ON storage.objects;
CREATE POLICY "vault_storage_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'vault'
  AND public.get_user_role(auth.uid()::text) IN ('CEO', 'C_LEVEL')
);

-- ============================================================
-- DONE
-- ============================================================
