# Extensions — `pg_extension`

> Verified from `SELECT * FROM pg_extension` on 2026-06-28

---

| oid | Extension | Version | Used by Codebase? | Purpose |
|---|---|---|---|---|
| 13569 | `plpgsql` | 1.0 | ✅ Yes | Procedural language — all 4 DB functions + 2 triggers require this |
| 16389 | `pg_stat_statements` | 1.11 | ❌ No | Query performance monitoring — collects execution stats, never queried |
| 16432 | `uuid-ossp` | 1.1 | ✅ Yes | UUID generation — 13 of 16 tables use `uuid_generate_v4()` for defaults |
| 16443 | `pgcrypto` | 1.3 | ⚠️ Indirect | Cryptographic functions — used internally by Supabase Auth for password hashing; no direct calls in app code |
| 16604 | `supabase_vault` | 0.3.1 | ❌ No | Encrypted secrets storage — can store API keys, SendGrid tokens, Google credentials securely; completely unused |

---

## Extension Details

### plpgsql (1.0)
- **Type:** Procedural language
- **Relocatable:** No
- **Critical for:** `calculate_milestone_progress()`, `is_user_assigned_to_task()`, `update_task_milestone_count()`, `update_user_last_active()`
- **Risk if removed:** All server-side logic breaks

### pg_stat_statements (1.11)
- **Type:** Performance monitoring
- **Relocatable:** Yes
- **Status:** Idle — tracks query execution statistics but no tooling reads them
- **Value:** Could identify slow queries if connected to a monitoring tool or queried manually

### uuid-ossp (1.1)
- **Type:** UUID utility
- **Relocatable:** Yes
- **Critical for:** Default ID generation on 13 tables via `uuid_generate_v4()`
- **Risk if removed:** All INSERTs fail unless IDs are provided explicitly

### pgcrypto (1.3)
- **Type:** Cryptographic functions
- **Relocatable:** Yes
- **Usage:** Likely used internally by Supabase Auth for `crypt()` and `gen_salt()` for password hashing
- **App code:** No direct calls from application code

### supabase_vault (0.3.1)
- **Type:** Secrets management
- **Relocatable:** No
- **Has config:** Yes (extconfig = [16608])
- **Status:** Installed but completely unused
- **Missed opportunity:** SendGrid API key and Google Calendar credentials are stored in `.env.local` plaintext; Vault could encrypt them at rest with row-level security

---

## What's NOT Installed

| Extension | Would Enable |
|---|---|
| PostGIS | Geospatial queries |
| pgvector | AI/embedding vectors |
| pg_cron | Scheduled jobs |
| pg_net | HTTP requests from DB |
| wrappers | External data sources |
| PostgREST | (Built into Supabase, no separate extension) |

**Conclusion:** No specialized extensions. This is a pure business workflow app with no geospatial, AI, or external integration requirements.
