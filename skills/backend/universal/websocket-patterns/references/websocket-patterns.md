# WebSocket Message Protocol

## Message Envelope
```typescript
interface WSMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  ack?: boolean;
  error?: {
    code: string;
    message: string;
  };
}
```

## Room Management
```typescript
class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();

  join(roomId: string, userId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);
  }

  leave(roomId: string, userId: string): void {
    this.rooms.get(roomId)?.delete(userId);
    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  broadcast(roomId: string, message: WSMessage, excludeUserId?: string): void {
    const members = this.rooms.get(roomId);
    if (!members) return;

    for (const userId of members) {
      if (userId !== excludeUserId) {
        this.wsManager.sendToUser(userId, message);
      }
    }
  }
}
```

## Key Points
- Use consistent JSON envelope for all messages with id, type, payload, timestamp
- Implement room-based subscriptions for targeted message delivery
- Support ack/nack for critical messages
- Rate limit messages per connection to prevent abuse
- Buffer messages for disconnected clients with configurable TTL
- Use message serialization for binary payload efficiency
- Implement message validation before processing
- Track message delivery with acknowledgement timeouts
- Support selective message filtering on the server side
- Log message throughput per connection for monitoring
