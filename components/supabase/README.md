# Supabase Infrastructure — Complete Breakdown

> Finova Workspace — Finova Solutions
> Verified: 2026-06-28 (Tier 1, 2, 3)
> Database: PostgreSQL via Supabase

---

## Quick Reference

| Category | Count |
|---|---|
| Tables | 16 (4 without API coverage) |
| RLS Policies | 60 (2 critical vulnerabilities) |
| Functions | 5 (4 DB functions + 1 overloaded) |
| Triggers | 2 |
| Extensions | 5 |
| Auth Users | 13 (@finovasolutions.tech) |
| Storage Buckets | 1 (`uploads`, PUBLIC, 0 policies) |
| Edge Functions | 0 deployed |
| API Routes | 6 (Next.js, not Edge Functions) |
| Realtime | Available but unused |

---

## Documentation Index

Detailed files:

- [01 — Schema (All 16 Tables)](./schema/tables.md)
- [02 — Extensions](./schema/extensions.md)
- [03 — Database Functions](./schema/functions.md)
- [04 — Database Triggers](./schema/triggers.md)
- [05 — RLS Policies (All 60)](./rls/policies.md)
- [06 — RLS Vulnerabilities](./rls/vulnerabilities.md)
- [07 — Authentication Configuration](./auth/config.md)
- [08 — Storage Configuration](./storage/config.md)
- [09 — Realtime Configuration](./realtime/config.md)
- [10 — Edge Functions](./edge-functions.md)
- [11 — Schema–Code Gaps](./gaps.md)

---

## Health Overview

| Layer | Assessment |
|---|---|
| Schema | Well-designed, but 4 tables have no API code |
| RLS | Enabled but flawed — 2 critical + 1 high + 1 medium vulnerability |
| Auth | Email-only, built-in SMTP (not production-grade) |
| Storage | PUBLIC bucket, no RLS — critical exposure |
| Realtime | Available but unused (polling instead) |
| Secrets | Plaintext in .env.local despite supabase_vault existing |
| Edge Functions | Not used — all backend in Next.js API routes |

**Overall Supabase Health: 45/100** — Infrastructure is in place but severely underutilized and security is critically weak at the storage and RLS layers.
