# Authentication Configuration

> Verified from Supabase Dashboard — Auth settings, users, providers, rate limits
> Date: 2026-06-28

---

## Auth Providers

| Provider | Status |
|---|---|
| **Email** | ✅ Enabled |
| Phone | ❌ Disabled |
| Apple | ❌ Disabled |
| Azure | ❌ Disabled |
| Bitbucket | ❌ Disabled |
| Discord | ❌ Disabled |
| Facebook | ❌ Disabled |
| GitHub | ❌ Disabled |
| Google | ❌ Disabled |
| Keycloak | ❌ Disabled |
| LinkedIn | ❌ Disabled |
| Notion | ❌ Disabled |
| Slack | ❌ Disabled |
| Spotify | ❌ Disabled |
| Twitch | ❌ Disabled |
| Twitter | ❌ Disabled |
| WorkOS | ❌ Disabled |
| Zoom | ❌ Disabled |
| SAML 2.0 | ❌ Disabled |
| Web3 Wallet | ❌ Disabled |

**Email-only authentication.** No social login, no MFA, no SSO.

---

## User Inventory (13 users)

All @finovasolutions.tech domain. Role-based executive accounts confirmed.

| User | Email | Notes |
|---|---|---|
| Muhammad Mehlab | cto@finovasolutions.tech | CTO |
| Astafa Ali | ceo@finovasolutions.tech | CEO |
| Umer Saleem | coo@finovasolutions.tech | COO |
| Shamir Malik | cso@finovasolutions.tech | CSO |
| Muhammad Ehsan | ehsan@finovasolutions.tech | |
| Ali Abbasi | ali@finovasolutions.tech | |
| Almas | almas@finovasolutions.tech | |
| Habiba | habiba@finovasolutions.tech | |
| Hassaan Raheel | hassaan@finovasolutions.tech | |
| Hassan | hassan@finovasolutions.tech | |
| Huzaifa Nadeem | huzaifa@finovasolutions.tech | |
| +2 more | | (beyond screenshot) |

All users authenticate via email provider. No phone numbers configured.

---

## Email Service

| Setting | Value | Risk |
|---|---|---|
| SMTP Provider | **Built-in Supabase service** | NOT production-grade |
| Custom SMTP | Not configured | SendGrid exists but only for meeting invites |
| Warning shown | "This service has rate limits and is not meant for production apps" | ⚠️ |
| Templates configured | 5 (Confirm signup, Invite user, Magic link/OTP, Change email, Reset password) | Standard set |

**Fix:**
1. Go to Authentication → Emails → SMTP Settings
2. Enable Custom SMTP
3. Use SendGrid credentials (already have `@sendgrid/mail` in package.json)
4. This also fixes auth emails (password reset, verification) going through rate-limited service

---

## Rate Limits

| Limit | Value | Per-Hour Effective |
|---|---|---|
| Sending emails | (default/empty) | Not explicitly set |
| Sending SMS | 30 sms/h | 30 |
| Token refreshes | 360 requests / 5 min | 1,800 |
| Token verifications (OTP) | 30 requests / 5 min | 360 |
| Anonymous users | 30 requests/h | 30 |
| Sign-ups and sign-ins | 30 requests / 5 min | 360 |
| Web3 sign-ups | 30 requests / 5 min | 360 |

**IP Address Forwarding:** Disabled (Auth determines source IP directly)

**Assessment:** Default Supabase rate limits only. No custom brute-force protection. 360 sign-in attempts per 5 minutes is generous.

---

## Auth Flow (Application Level)

```
1. User enters email + password on /login
2. authProvider.login() → authAPI.login()
3. supabase.auth.signInWithPassword({ email, password })
4. Supabase validates → returns JWT session
5. Fetch user from users table WHERE uid = authData.user.id
6. INSERT into activity_logs (trigger fires)
7. update_user_last_active trigger → users.last_active = now()
8. Set user state in AuthContext
9. Admin roles: start time tracking session
10. Redirect: CEO→/admin/ceo, C_LEVEL→/admin/c-level, LEAD→/admin/lead, EMPLOYEE→/dashboard
```

Session is persisted via `@supabase/ssr` SSR cookies. Token refresh handled automatically.
