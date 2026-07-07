# Seed Users

## Script Location
`scripts/seed-initial-users.ts`

## How to Run
```
npm run seed-users
```

Add `--force` to delete and recreate if they already exist:
```
npx tsx scripts/seed-initial-users.ts --force
```

## Active Seed Accounts

| Role | Email | Password | Department |
|---|---|---|---|
| LEAD | `lead@finovasolutions.tech` | `TestPass123!` | Engineering |
| EMPLOYEE | `employee@finovasolutions.tech` | `TestPass123!` | Engineering |

## How It Works
- Reads `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`
- Uses Supabase Admin API to create auth users (email confirmed)
- Inserts matching rows into the `users` table
- Idempotent — skips on re-run unless `--force` is used
