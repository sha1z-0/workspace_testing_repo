# Supabase Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Click "New Project"
4. Fill in:
   - Name: `finova-workspace`
   - Database Password: (generate strong password)
   - Region: (closest to your users)
5. Wait ~2 minutes for project creation

### 2. Get Your Credentials
1. In Supabase Dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** (starts with `https://xxx.supabase.co`)
   - **anon public** key (long string)

### 3. Configure Environment
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and paste your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 4. Set Up Database
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click **Run**
5. Verify: Go to **Table Editor** - you should see 12 tables

### 5. Configure Authentication
1. Go to **Authentication → Providers**
2. Enable **Email** provider (enabled by default)
3. Optional: Enable Google, GitHub, etc.
4. Go to **Authentication → URL Configuration**
5. Add your site URL: `http://localhost:3000` (for development)

### 6. Run Application
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and test sign up!

---

## 📖 Common Operations

### Check Database Tables
```sql
-- In Supabase SQL Editor
SELECT * FROM users LIMIT 10;
SELECT * FROM projects LIMIT 10;
SELECT * FROM tasks WHERE status = 'in_progress';
```

### View Authentication Users
Go to **Authentication → Users** in Supabase Dashboard

### Monitor Realtime
Go to **Database → Replication** to see live database changes

### View Logs
Go to **Logs** to see database queries, errors, and API calls

---

## 🔧 Common Tasks

### Add a Test User (via SQL)
```sql
-- In Supabase SQL Editor
INSERT INTO users (uid, name, email, role, department, email_verified, status)
VALUES (
  gen_random_uuid()::text,
  'John Doe',
  'john@example.com',
  'EMPLOYEE',
  'Engineering',
  true,
  'active'
);
```

### Check Active Sessions
```sql
SELECT * FROM time_tracking WHERE is_active = true;
```

### View Recent Notifications
```sql
SELECT * FROM notifications 
WHERE user_id = 'your_user_id' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Clear All Data (Reset for Testing)
```sql
-- WARNING: This deletes ALL data
TRUNCATE users, projects, tasks, announcements, notifications, 
         chat_messages, chat_groups, calendar_events, warnings, 
         time_tracking, departments, teams CASCADE;
```

---

## 🛡️ Security Setup

### Row Level Security (RLS)
All tables have RLS enabled. Default policies:
- ✅ Users can read all users
- ✅ Users can update their own profile
- ✅ Projects/tasks readable by all authenticated users
- ✅ Notifications only visible to recipient

### Customize RLS Policies
In Supabase Dashboard → **Authentication → Policies**:

Example: Allow only CEOs to delete projects
```sql
CREATE POLICY "Only CEOs can delete projects"
ON projects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.uid = auth.uid()::text 
    AND users.role = 'CEO'
  )
);
```

---

## 🔍 Debugging

### Check Supabase Connection
```typescript
// In browser console
import { supabase } from '@/lib/supabase'
const { data, error } = await supabase.from('users').select('count')
console.log(data, error)
```

### View Query Logs
1. Supabase Dashboard → **Logs → Postgres**
2. Filter by error/slow queries

### Test API Endpoints
```typescript
// Test user creation
import { usersAPI } from '@/lib/api'
const users = await usersAPI.getAllUsers()
console.log(users)
```

---

## 📊 Performance Tips

1. **Add Indexes** - Already included in schema for common queries
2. **Use `select()` wisely** - Only fetch needed columns:
   ```typescript
   .select('id, name, email') // Good
   .select('*') // Use only when needed
   ```
3. **Limit Results** - Use `.limit(100)` for large tables
4. **Enable Realtime** - Subscribe to changes instead of polling

---

## 🚨 Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists and has correct values
- Restart dev server after adding env vars

### "Invalid API key"
- Verify you copied the **anon public** key, not the service role key
- Check for extra spaces in `.env.local`

### "relation does not exist"
- Run `supabase-schema.sql` in SQL Editor
- Verify tables exist in Table Editor

### Authentication not working
- Check email provider is enabled
- Verify site URL is configured
- Check browser console for errors

### RLS blocking queries
- Go to Authentication → Policies
- Verify policies exist for your use case
- Test with SQL Editor (uses service role, bypasses RLS)

---

## 🔗 Quick Links

- **Your Project**: https://app.supabase.com/project/YOUR_PROJECT_ID
- **Documentation**: https://supabase.com/docs
- **API Reference**: https://supabase.com/docs/reference/javascript
- **Discord Support**: https://discord.supabase.com

---

## 💡 Pro Tips

1. **Use Supabase CLI** for migrations:
   ```bash
   npm install -g supabase
   supabase init
   supabase db diff
   ```

2. **Generate TypeScript Types**:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types.ts
   ```

3. **Enable Realtime**:
   ```typescript
   supabase
     .channel('tasks')
     .on('postgres_changes', 
       { event: '*', schema: 'public', table: 'tasks' },
       (payload) => console.log(payload)
     )
     .subscribe()
   ```

4. **Use Transactions**:
   ```typescript
   await supabase.rpc('create_project_with_tasks', {
     project_data: {...},
     tasks_data: [...]
   })
   ```

5. **Backup Regularly**:
   - Supabase Dashboard → **Settings → Database → Backups**
   - Enable automatic daily backups

---

## 📚 Learning Resources

- **Supabase YouTube**: Video tutorials and courses
- **Example Apps**: https://github.com/supabase/supabase/tree/master/examples
- **Community**: https://github.com/supabase/supabase/discussions

---

**Need Help?** Check `MIGRATION_COMPLETE.md` for detailed information.
