# Realtime Configuration

> Verified from Supabase Dashboard — Realtime Inspector and Settings
> Date: 2026-06-28

---

## Status: Available but Completely Unused

| Feature | Status |
|---|---|
| **Realtime Server** | Running |
| **Inspector** | Configured (role: postgres) |
| **Broadcast** | Not configured (no channels) |
| **Presence** | Not configured |
| **Postgres Changes** | **No tables enabled for Change Data Capture** |
| **Active Channels** | None |
| **Active Subscriptions** | None |

---

## What Realtime Could Replace

| Current Approach | Realtime Alternative |
|---|---|
| Chat: 10-second polling (`setInterval` on `chat/page.tsx`) | `supabase.channel('chat').on('broadcast', ...)` |
| Notifications: 30-second polling (`notification-bell.tsx`) | `supabase.channel('notifications').on('postgres_changes', ...)` |
| Task updates: Manual page refresh | Real-time task status changes |
| Activity logs: No live view | Real-time activity feed for CEO dashboard |

---

## How to Enable Realtime for Tables

### Step 1: Enable Realtime on tables
```
Supabase Dashboard → Database → Replication → Enable on:
  - chat_messages (for live chat)
  - notifications (for live notifications)
  - activity_logs (for live audit feed)
```

### Step 2: Replace chat polling
```typescript
// Current (polling):
useEffect(() => {
  const interval = setInterval(() => fetchMessages(), 10000)
  return () => clearInterval(interval)
}, [])

// Replacement (realtime):
useEffect(() => {
  const channel = supabase
    .channel('chat-room')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => setMessages(prev => [...prev, payload.new])
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

### Step 3: Replace notification polling
```typescript
// Current: 30s polling
// Replacement: realtime subscription
supabase
  .channel('user-notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
    (payload) => { /* update bell count and toast */ }
  )
  .subscribe()
```

---

## Benefits of Switching to Realtime

| Metric | Polling | Realtime |
|---|---|---|
| Latency | Up to 30 seconds | < 1 second |
| Server load | Constant requests every N seconds | Push-based, only on change |
| Battery (mobile) | High (periodic network) | Low (WebSocket) |
| Scalability | Hits DB every poll cycle | Only queries on actual changes |

Realtime would be the single highest-impact performance improvement available.
