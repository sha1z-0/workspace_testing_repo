-- Drop all tables and policies to start fresh
-- Run this FIRST in Supabase SQL Editor, then run supabase-schema.sql

-- Drop all tables in reverse order of dependencies
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS time_tracking CASCADE;
DROP TABLE IF EXISTS warnings CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS chat_groups CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Confirm tables are dropped
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
