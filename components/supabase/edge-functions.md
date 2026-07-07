# Edge Functions

> Verified from Supabase Dashboard — Edge Functions section
> Date: 2026-06-28

---

## Status: None Deployed

The Edge Functions page shows the onboarding state: "Deploy your first edge function."

**Available deployment methods:**
- Via Editor (browser-based)
- AI Assistant
- Via CLI (Supabase CLI)

**Available templates:**
- Simple Hello World
- Supabase Database Access

---

## Why No Edge Functions

All backend logic is handled by **Next.js API Routes** (6 routes in `app/api/`):

| Route | Purpose |
|---|---|
| `POST /api/users/create` | Create user (Auth + DB) |
| `PUT /api/users/update` | Update user |
| `DELETE /api/users/delete` | Delete user |
| `POST /api/end-session` | End time tracking session |
| `POST /api/send-meeting-invite` | SendGrid email |
| `POST /api/google-calendar/add-event` | Google Calendar API |

These API routes use the `SUPABASE_SERVICE_ROLE_KEY` for admin operations and user session for others.

---

## What Edge Functions COULD Do (Not Currently Implemented)

| Use Case | Implementation |
|---|---|
| **Webhook handlers** | Receive SendGrid delivery events, Google Calendar responses |
| **Scheduled jobs** | Cleanup stale time tracking sessions, daily digest notifications |
| **Realtime triggers** | Send push notifications when chat messages arrive |
| **File processing** | Virus scan uploads, generate thumbnails |
| **Auth hooks** | Custom claims, post-signup role assignment |

---

## Currently Not Needed

The app functions without edge functions because:
- All business logic is in Next.js API routes
- No scheduled jobs exist
- No external webhooks are consumed
- Realtime is unused (polling instead)

Edge functions become necessary only when introducing background processing, webhooks, or scheduled tasks — none of which are currently implemented.
