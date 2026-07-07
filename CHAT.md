# Chat

## Overview
The Chat module provides direct messaging (1:1) and group messaging. Messages are stored in Supabase and fetched via 10-second HTTP polling — there are no Supabase Realtime subscriptions. The entire chat UI lives in a single monolithic component with no extracted sub-components. Message editing, file attachments, reactions, typing indicators, threading, and message search are not implemented.

---

## Data Model

### `chat_messages` table
Defined in `supabase-schema.sql` lines 86-96 and `reset-and-create-schema.sql` lines 127-141.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Primary key |
| `text` | TEXT | NOT NULL | — | Message body |
| `sender_id` | TEXT | NOT NULL | — | Auth UID of sender. No FK constraint. |
| `sender_name` | TEXT | NULL | — | Denormalized display name |
| `sender_avatar` | TEXT | NULL | — | Denormalized avatar URL |
| `recipient_id` | TEXT | NULL | — | For direct messages; NULL for group messages |
| `group_id` | TEXT | NULL | — | For group messages; NULL for direct messages |
| `is_read` | BOOLEAN | false | `false` | Read receipt flag |
| `created_at` | TIMESTAMPTZ | — | `NOW()` | No `updated_at` column |

**TypeScript types** (`lib/types.ts` lines 282-318) additionally define `attachments: Json | null` in Row/Insert/Update — but this column does NOT exist in any SQL schema file. It is a type-only artifact, likely from a Supabase-generated type that was never implemented in the actual database.

**Indexes** (`supabase-schema.sql` lines 196-198; `reset-and-create-schema.sql` lines 234-236):
```sql
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient_id ON chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_group_id ON chat_messages(group_id);
```

**Foreign keys:** None. All ID columns are unconstrained TEXT. Deleting a user leaves orphaned `sender_id`/`recipient_id` values in `chat_messages`. Deleting a group leaves orphaned `group_id` values.

### `chat_groups` table
Defined in `supabase-schema.sql` lines 99-107 and `reset-and-create-schema.sql` lines 144-156.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | Primary key |
| `name` | TEXT | NOT NULL | — | Group display name |
| `description` | TEXT | NULL | — | Optional description |
| `members` | TEXT[] | NOT NULL | `ARRAY[]::TEXT[]` | Array of auth UIDs |
| `created_by` | TEXT | NOT NULL | — | Creator's auth UID |
| `avatar` | TEXT | NULL | — | Avatar URL |
| `created_at` | TIMESTAMPTZ | — | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | — | `NOW()` | |

**No indexes on chat_groups.** No FK constraints. Membership is stored as a PostgreSQL array of user UIDs — there is no join table.

### RLS Policies

**chat_messages SELECT** — Two conflicting policies exist. The tight version comes from `supabase-schema.sql` lines 244-248 / `reset-and-create-schema.sql` lines 263-267:

```sql
-- Tight version (reset-and-create-schema.sql line 263-267):
CREATE POLICY "Users see their chat messages" ON chat_messages FOR SELECT USING (
  auth.uid()::text = sender_id OR 
  auth.uid()::text = recipient_id OR 
  (group_id IS NOT NULL AND auth.uid()::text = ANY(
    SELECT unnest(members) FROM chat_groups WHERE id::text = group_id
  ))
);
```

The weak version from `add-select-policies.sql` lines 26-30:
```sql
-- Weak version (add-select-policies.sql line 26-30):
CREATE POLICY "Users can read their messages" ON chat_messages FOR SELECT USING (
  auth.uid()::text = sender_id OR 
  auth.uid()::text = recipient_id OR 
  group_id IS NOT NULL
);
```

⚠️ **CRITICAL:** The `add-select-policies.sql` version grants read access to ANY group message for ANY authenticated user if `group_id IS NOT NULL` — no membership check. By Supabase convention, permissive policies are OR'd together. If `add-select-policies.sql` was applied after the main schema, ALL users can read ALL group messages regardless of group membership.

**chat_messages INSERT** — `add-rls-policies.sql` lines 29-30:
```sql
CREATE POLICY "Authenticated users can send messages" ON chat_messages 
FOR INSERT WITH CHECK (auth.uid()::text = sender_id);
```

**chat_messages UPDATE** — `add-rls-policies.sql` lines 32-33:
```sql
CREATE POLICY "Users can update their messages" ON chat_messages 
FOR UPDATE USING (auth.uid()::text = sender_id);
```

**chat_messages DELETE** — `add-rls-policies.sql` lines 35-37:
```sql
CREATE POLICY "Users can delete their messages" ON chat_messages 
FOR DELETE USING (auth.uid()::text = sender_id);
```

**chat_groups SELECT** — `add-rls-policies.sql` line 39:
```sql
CREATE POLICY "Authenticated users can read groups" ON chat_groups 
FOR SELECT USING (auth.uid() IS NOT NULL);
```
⚠️ Any authenticated user can see ALL groups, including their member lists.

**chat_groups INSERT** — `add-rls-policies.sql` line 42:
```sql
CREATE POLICY "Authenticated users can create groups" ON chat_groups 
FOR INSERT WITH CHECK (auth.uid()::text = created_by);
```

**chat_groups UPDATE** — `add-rls-policies.sql` line 45:
```sql
CREATE POLICY "Group creators can update groups" ON chat_groups 
FOR UPDATE USING (auth.uid()::text = created_by);
```

**chat_groups DELETE** — `add-rls-policies.sql` line 48:
```sql
CREATE POLICY "Group creators can delete groups" ON chat_groups 
FOR DELETE USING (auth.uid()::text = created_by);
```

**Summary:** Any authenticated user can:
- Read all groups and their member lists
- Create groups (as themselves)
- Read all group messages (if the weaker SELECT policy is active)
- Update/delete only groups they created
- Edit/delete only their own messages

No database functions, triggers, or views relate to chat.

---

## Backend Logic

All chat logic is in `lib/api.ts` lines 1544-1692 (`chatAPI` object). There are no API routes or Edge Functions for chat.

### `sendDirectMessage()` — `lib/api.ts` lines 1544-1560
Inserts one row into `chat_messages` with `group_id` NULL. Returns the inserted row.
```typescript
supabase.from("chat_messages").insert({
  text, sender_id, recipient_id, sender_name, sender_avatar, is_read: false
}).select().single()
```

### `sendGroupMessage()` — `lib/api.ts` lines 1562-1578
Same as above but sets `group_id` and leaves `recipient_id` NULL.

### `getDirectMessageHistory()` — `lib/api.ts` lines 1580-1600
Retrieves bidirectional direct messages between two users, limited to 50, ordered oldest-first.
```typescript
supabase.from("chat_messages").select("*")
  .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
  .order("created_at", { ascending: true }).limit(50)
```

### `getGroupMessageHistory()` — `lib/api.ts` lines 1602-1616
Retrieves messages for a group, limited to 50, ordered oldest-first.

### `getUserChatGroups()` — `lib/api.ts` lines 1618-1632
Uses PostgreSQL array `@>` (contains) operator:
```typescript
supabase.from("chat_groups").select("*").contains("members", [userId])
```

### `createChatGroup()` — `lib/api.ts` lines 1634-1657
Creates a group with a hardcoded default avatar `"https://github.com/shadcn.png"`. Creator is passed as `createdBy` — the current user is added to the `members` array before calling this function.

### `markMessagesAsRead()` — `lib/api.ts` lines 1659-1676
Batch UPDATE of `is_read = true` for an array of message IDs. No-ops if empty array.

---

## Real-Time / Notification Behavior

**No Supabase Realtime subscriptions.** A grep for `supabase.channel`, `.subscribe()`, `.on(`, or `realtime` across all `.ts`/`.tsx` files returned zero chat-related hits. The chat uses **10-second HTTP polling** instead:

- Direct messages: `setInterval(fetchMessages, 10000)` — `app/(workspace)/chat/page.tsx` line ~214
- Group messages: `setInterval(fetchGroupMessages, 10000)` — `app/(workspace)/chat/page.tsx` line ~244
- After sending a message, an immediate fetch is triggered (not waiting for the poll interval) — `app/(workspace)/chat/page.tsx` lines ~277, ~287

**No chat-triggered notifications.** The `notifications` table and `notification-bell.tsx` system are completely separate from chat. No database trigger, Edge Function, or application code creates a notification row when a chat message is sent. The settings page has a `settings.notifications.chat` toggle (`app/(workspace)/settings/page.tsx` line 49) but nothing reads or acts on it.

**No read receipt indicators in UI.** The `is_read` boolean is set on the backend and marked as read when a conversation is opened (`app/(workspace)/chat/page.tsx` lines ~196-203), but the UI does not display any "seen by" or read indicator to other users.

**Hardcoded badge count.** The sidebar nav entry at `components/admin-layout.tsx` line 153 shows `badge: 3` — this is a hardcoded integer, not dynamically computed from unread counts.

---

## Frontend Logic

### Main component: `app/(workspace)/chat/page.tsx` (936 lines, single monolithic file)
- **Client component** (`"use client"`)
- No sub-components — all logic is inline in this one file

### State management — `app/(workspace)/chat/page.tsx`
- `users` — all users except current, fetched via `usersAPI.getAll()` (line ~68)
- `groups` — user's chat groups, fetched via `chatAPI.getUserChatGroups()` (line ~108)
- `messages` — chat history array (line ~60)
- `selectedUser` / `selectedGroup` — current conversation target
- `searchQuery` — client-side contact filter (line ~57)
- `message` — text input value (line ~59)

### localStorage persistence — `app/(workspace)/chat/page.tsx` lines ~91-115, ~131-149
- Key: `finova-last-chat`
- Stores `{ type: 'direct' | 'group', id: string }`
- Restored after users/groups load

### Sidebar — `app/(workspace)/chat/page.tsx` lines ~330-475
- Desktop: fixed 320px sidebar with search, Direct/Groups tabs, scrollable contact list
- Mobile: dialog-based contact picker, back button in chat header
- Group list shows member count per group
- "New Group" button opens creation dialog

### Message list — `app/(workspace)/chat/page.tsx` lines ~540-695
- Self messages: right-aligned, blue gradient bubble, rounded-br-none
- Others' messages: left-aligned, white bubble with border, rounded-bl-none
- Date separators: "Today", "Yesterday", or full date between day boundaries (line ~27-41)
- Group messages: show sender avatar + name for first message in a sequence (lines ~650-660)
- Consecutive messages from same sender within 5 minutes are visually grouped (lines ~662-666)
- Timestamps shown in `hh:mm` format below each bubble
- No message editing or deletion UI
- No file/reaction/thread features

### Message input — `app/(workspace)/chat/page.tsx` lines ~700-725
- Text input with "Type a message..." placeholder
- Send on Enter (without Shift), or click Send button
- Send button disabled when input is empty
- Input auto-focuses when conversation loads

### New Group dialog — `app/(workspace)/chat/page.tsx` lines ~295-328
- Group name (required), description (optional), member selector (dropdown)
- Creator is automatically added to members (line ~298: `[user.id, ...groupMembers]`)
- Calls `chatAPI.createChatGroup()`
- On success: selects the new group, toast notification, resets form

### Read receipt handling — `app/(workspace)/chat/page.tsx` lines ~196-203
- On conversation open, finds unread messages FROM the other user
- Calls `chatAPI.markMessagesAsRead(unreadMessages)` to batch-update
- Only marks messages where `senderId === otherUser.uid && isRead === false`

---

## Permissions Matrix

| Action | CEO | C_LEVEL | LEAD | EMPLOYEE | Enforcement |
|---|---|---|---|---|---|
| Create group | ✅ | ✅ | ✅ | ✅ | RLS: `auth.uid()::text = created_by` |
| Send direct message | ✅ | ✅ | ✅ | ✅ | RLS: `auth.uid()::text = sender_id` |
| Send group message | ✅ | ✅ | ✅ | ✅ | RLS: `auth.uid()::text = sender_id` |
| Edit own message | ✅ | ✅ | ✅ | ✅ | RLS: `auth.uid()::text = sender_id` (no UI) |
| Delete own message | ✅ | ✅ | ✅ | ✅ | RLS: `auth.uid()::text = sender_id` (no UI) |
| Edit others' messages | ❌ | ❌ | ❌ | ❌ | RLS: sender-only |
| Delete others' messages | ❌ | ❌ | ❌ | ❌ | RLS: sender-only |
| View groups (list) | ✅ | ✅ | ✅ | ✅ | RLS: any auth user |
| View group messages | ✅ | ✅ | ✅ | ✅ | RLS: member of group (or everyone if weak policy active) |
| View DMs not addressed to you | ❌ | ❌ | ❌ | ❌ | RLS: sender or recipient only |
| Update group (name/desc) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | RLS: `auth.uid()::text = created_by` |
| Delete group | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | RLS: `auth.uid()::text = created_by` |
| Add members to group | ❌ | ❌ | ❌ | ❌ | API does not expose this |
| Remove members from group | ❌ | ❌ | ❌ | ❌ | API does not expose this |
| Leave group | ❌ | ❌ | ❌ | ❌ | Not implemented |
| Upload file attachment | ❌ | ❌ | ❌ | ❌ | Not implemented |
| Mute/block user | ❌ | ❌ | ❌ | ❌ | Not implemented |
| Export chat history | ❌ | ❌ | ❌ | ❌ | Not implemented |

---

## Edge Cases & Known Gaps

1. **Weak SELECT policy clash.** `add-select-policies.sql` has a `chat_messages` SELECT policy (`group_id IS NOT NULL` grants any auth user read access). If applied after `supabase-schema.sql`, this overrides the group-membership check. **Flag:** Confirm which policy is active in production Supabase.

2. **No FK constraints anywhere.** Deleting a user from the `users` table leaves their messages in `chat_messages` with orphaned `sender_id`/`recipient_id` values. Deleting a group leaves orphaned `group_id` values in `chat_messages`. The UI will crash or show "Unknown user" for orphaned sender names.

3. **No pagination. Hard 50-message limit.** Both `getDirectMessageHistory()` and `getGroupMessageHistory()` use `.limit(50)` with no offset/page parameter. Messages beyond 50 are inaccessible.

4. **No realtime.** 10-second polling means up to 10 seconds of latency for new messages. In a conversation, this is a poor UX for real-time chat.

5. **Hardcoded group avatar.** `createChatGroup()` at `lib/api.ts` line 1646 sets `avatar: "https://github.com/shadcn.png"` — there is no UI to change the group avatar.

6. **`chat_messages.attachments` column exists only in TypeScript types** — `lib/types.ts` lines 285, 298, 311 but is absent from ALL SQL schema files. If Supabase realtime is ever enabled for INSERT, the TypeScript types would suggest an `attachments` field that doesn't exist.

7. **No notification on new message.** Users must be actively looking at the chat to see new messages. There is no toast, badge count, browser notification, or email for new messages. The hardcoded `badge: 3` in the sidebar at `components/admin-layout.tsx` line 153 never changes.

8. **Settings toggle is dead code.** `app/(workspace)/settings/page.tsx` line 49 defines `chat: false` in notification settings but no code checks this value.

9. **No input sanitization or rate limiting.** Messages are sent directly to the database with no server-side validation, length limits, or spam prevention beyond Supabase's built-in row limits.

10. **Timestamp fragility.** `app/(workspace)/chat/page.tsx` lines ~640-643 attempt to call `msg.createdAt?.toDate()` (Firebase Timestamp API) on what are now Supabase ISO string timestamps. Supabase returns `created_at` as a string, not a Firebase Timestamp. This may cause runtime errors or incorrect display.

11. **No "X is typing" or online presence.** No broadcast channels, no presence tracking.

12. **Group membership never changes after creation.** The API has no methods for adding/removing members from an existing group. The `members` array is static.

---

## Open Questions

- **ASSUMPTION — VERIFY:** Which chat_messages SELECT policy is active in production — the tight one from `supabase-schema.sql` or the weak one from `add-select-policies.sql`? This has major security implications for group message privacy.
- **ASSUMPTION — VERIFY:** Are the `chat_messages` `created_at` values stored as ISO 8601 strings or as some other format? The frontend code at `app/(workspace)/chat/page.tsx` line ~640 calls `.toDate()` suggesting it expects Firebase Timestamps, which could be a bug.
- Should the hardcoded GitHub avatar (`"https://github.com/shadcn.png"`) be replaced with a proper group avatar upload or a default Finova icon?
