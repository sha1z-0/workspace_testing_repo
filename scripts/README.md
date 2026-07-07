# Initial User Seeding

This script creates test users for all role types in your Supabase database.

## What it creates

Creates **4 test users**, one for each role:

| Role     | Email                | Password          | Department  |
|----------|---------------------|-------------------|-------------|
| CEO      | ceo@finova.com      | CEO@pass123       | Executive   |
| C_LEVEL  | clevel@finova.com   | CLevel@pass123    | Executive   |
| LEAD     | lead@finova.com     | Lead@pass123      | Engineering |
| EMPLOYEE | employee@finova.com | Employee@pass123  | Engineering |

## Prerequisites

1. ✅ Supabase project created
2. ✅ `.env.local` file configured with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ Database schema deployed (run `supabase-schema.sql`)

## How to run

```powershell
pnpm run seed-users
```

Or directly:
```powershell
npx tsx scripts/seed-initial-users.ts
```

## What the script does

1. Creates auth users in Supabase Auth
2. Inserts corresponding user records in the `users` table
3. Sets `email_verified: true` for immediate login
4. Displays credentials at the end

## After running

You can login at `http://localhost:3000/login` with any of the credentials above.

## Notes

- Script uses **service role key** to bypass Row Level Security
- If a user already exists, the script will show an error and continue
- Auth user and database record are created atomically (if one fails, both are rolled back)
