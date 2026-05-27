# Supabase Realtime

Supabase Realtime provides WebSocket-based real-time subscriptions for database changes, presence, and broadcast.

## Channel Types

| Type | Purpose | Use Case |
|------|---------|----------|
| `postgres_changes` | Database change events | Live feed of inserts/updates/deletes |
| `presence` | Track online users | Who's currently viewing, typing indicators |
| `broadcast` | Custom messages | Chat messages, cursor positions |

## Database Change Subscriptions

```typescript
const channel = supabase
  .channel('schema-db-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      console.log('New message:', payload.new);
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to realtime');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('Realtime connection failed');
    }
  });
```

## Realtime with RLS

Realtime subscriptions respect Row Level Security:

```sql
-- Messages table with RLS
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only see messages in rooms they belong to
CREATE POLICY "messages_realtime_select" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.room_members
      WHERE room_members.room_id = messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );
```

## Presence Tracking

```typescript
// Track online status
const presenceChannel = supabase.channel('room:online-users');

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    const onlineUsers = Object.entries(state).map(([key, value]) => ({
      userId: key,
      ...value[0] as object,
    }));
    updateOnlineUsersList(onlineUsers);
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log(`${key} joined`);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log(`${key} left`);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        userId: currentUser.id,
        userName: currentUser.name,
        onlineAt: new Date().toISOString(),
      });
    }
  });
```

## Broadcast Messages

```typescript
// Send a broadcast
await supabase.channel('room:general').send({
  type: 'broadcast',
  event: 'cursor_position',
  payload: { x: 100, y: 200, userId: currentUser.id },
});

// Receive broadcasts
supabase
  .channel('room:general')
  .on('broadcast', { event: 'cursor_position' }, (payload) => {
    updateCursor(payload.userId, payload.x, payload.y);
  })
  .subscribe();
```

## Enable Replication

Realtime requires publication to be enabled:

```sql
-- Enable replication on specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Remove a table from replication
ALTER PUBLICATION supabase_realtime DROP TABLE messages;

-- View current replication set
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## Channel Management

```typescript
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribe(channelName: string, config: ChannelConfig): RealtimeChannel {
    // Unsubscribe existing if reconnecting
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)!.unsubscribe();
    }

    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);
    return channel;
  }

  unsubscribeAll(): void {
    for (const [name, channel] of this.channels) {
      supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }
}
```

## Key Points
- RLS policies apply to realtime subscriptions — users only see allowed data
- Enable replication on specific tables via `ALTER PUBLICATION supabase_realtime ADD TABLE`
- Use `postgres_changes` for database-driven real-time
- Use `presence` for tracking online users
- Use `broadcast` for custom messages between clients
- Filter subscriptions with `filter` parameter to reduce data transfer
- Manage channels to avoid memory leaks from orphaned subscriptions
- Monitor channel status for connection errors and reconnection
