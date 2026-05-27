# WebSocket Patterns with Elysia

## WebSocket Server Setup

### Basic WebSocket Server
```typescript
import { Elysia, t } from "elysia";
import { ws } from "@elysiajs/ws";

const app = new Elysia()
  .use(ws())
  .ws("/ws", {
    open(ws) {
      console.log("Client connected");
      ws.subscribe("broadcast");
      ws.send({ type: "welcome", message: "Connected" });
    },
    message(ws, message) {
      console.log("Received:", message);
      ws.publish("broadcast", {
        type: "message",
        data: message,
        sender: ws.data.userId,
        timestamp: new Date().toISOString(),
      });
    },
    close(ws) {
      console.log("Client disconnected");
      ws.unsubscribe("broadcast");
    },
  })
  .listen(3000);
```

### Type-Safe Messages
```typescript
import { WebSocketHandler } from "@elysiajs/ws";

interface ChatMessage {
  type: "chat";
  content: string;
  roomId: string;
}

interface JoinRoom {
  type: "join";
  roomId: string;
}

interface Typing {
  type: "typing";
  roomId: string;
  isTyping: boolean;
}

type WSMessage = ChatMessage | JoinRoom | Typing;

export const chatHandler: WebSocketHandler<WSMessage> = {
  open(ws) {},
  message(ws, message) {
    switch (message.type) {
      case "chat":
        handleChat(ws, message);
        break;
      case "join":
        ws.subscribe(`room:${message.roomId}`);
        break;
      case "typing":
        ws.publish(`room:${message.roomId}`, message);
        break;
    }
  },
};
```

## Room Management

### Dynamic Room Subscription
```typescript
import { Elysia } from "elysia";

const roomStore = new Map<string, Set<string>>();

const app = new Elysia()
  .use(ws())
  .ws("/ws", {
    message(ws, message: any) {
      switch (message.action) {
        case "join_room":
          ws.subscribe(`room:${message.roomId}`);
          trackRoom(ws.id, message.roomId);
          ws.publish(`room:${message.roomId}`, {
            type: "user_joined",
            userId: ws.data.userId,
          });
          break;

        case "leave_room":
          ws.unsubscribe(`room:${message.roomId}`);
          untrackRoom(ws.id, message.roomId);
          ws.publish(`room:${message.roomId}`, {
            type: "user_left",
            userId: ws.data.userId,
          });
          break;

        case "room_message":
          ws.publish(`room:${message.roomId}`, {
            type: "room_message",
            userId: ws.data.userId,
            content: message.content,
            timestamp: new Date().toISOString(),
          });
          break;
      }
    },
  });

function trackRoom(wsId: string, roomId: string) {
  if (!roomStore.has(roomId)) {
    roomStore.set(roomId, new Set());
  }
  roomStore.get(roomId)!.add(wsId);
}

function untrackRoom(wsId: string, roomId: string) {
  roomStore.get(roomId)?.delete(wsId);
  if (roomStore.get(roomId)?.size === 0) {
    roomStore.delete(roomId);
  }
}
```

### Room Stats
```typescript
app.get("/rooms", () => {
  const stats: Record<string, number> = {};
  for (const [room, members] of roomStore) {
    stats[room] = members.size;
  }
  return stats;
});

app.get("/rooms/:id", ({ params }) => ({
  roomId: params.id,
  connections: roomStore.get(params.id)?.size ?? 0,
}));
```

## Authentication

### WebSocket Auth via Query
```typescript
import { jwt } from "@elysiajs/jwt";

const app = new Elysia()
  .use(jwt({ secret: "secret" }))
  .use(ws())
  .ws("/ws", {
    async open(ws) {
      const token = ws.data.query?.token;
      if (!token) {
        ws.close(4001, "Authentication required");
        return;
      }

      const payload = await ws.data.jwt.verify(token);
      if (!payload) {
        ws.close(4001, "Invalid token");
        return;
      }

      ws.data.userId = payload.sub;
      ws.send({ type: "authenticated", userId: payload.sub });
    },
  });
```

### Auth via Upgrade Header
```typescript
import { Elysia } from "elysia";

const app = new Elysia()
  .use(ws())
  .ws("/ws", {
    // Validate during upgrade
    beforeHandle({ headers, set }) {
      const token = headers["sec-websocket-protocol"];
      if (!validateToken(token)) {
        set.status = 401;
        return "Unauthorized";
      }
    },
  });
```

## Connection Management

### Heartbeat / Ping-Pong
```typescript
const app = new Elysia()
  .use(ws())
  .ws("/ws", {
    open(ws) {
      ws.data.lastPong = Date.now();
      ws.data.heartbeatTimer = setInterval(() => {
        if (Date.now() - ws.data.lastPong > 30000) {
          console.log("Client timeout, closing");
          ws.close(4000, "Heartbeat timeout");
          return;
        }
        ws.ping();
      }, 10000);
    },
    message(ws, message) {
      if (message === "pong") {
        ws.data.lastPong = Date.now();
        return;
      }
    },
    close(ws) {
      clearInterval(ws.data.heartbeatTimer);
    },
  });
```

### Reconnection Strategy
```typescript
// Client side
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxAttempts = 10;

  connect() {
    this.ws = new WebSocket("ws://localhost:3000/ws");

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }
}
```

### Connection Limits
```typescript
const CONNECTION_LIMITS = {
  perUser: 5,
  perRoom: 100,
  total: 10000,
};

const connectionCount = {
  total: 0,
  perUser: new Map<string, number>(),
};

app.ws("/ws", {
  open(ws) {
    if (connectionCount.total >= CONNECTION_LIMITS.total) {
      ws.close(4000, "Server full");
      return;
    }

    const userId = ws.data.userId;
    const userConns = connectionCount.perUser.get(userId) ?? 0;
    if (userConns >= CONNECTION_LIMITS.perUser) {
      ws.close(4000, "Too many connections");
      return;
    }

    connectionCount.total++;
    connectionCount.perUser.set(userId, userConns + 1);
  },
  close(ws) {
    connectionCount.total--;
    const userId = ws.data.userId;
    const userConns = connectionCount.perUser.get(userId) ?? 1;
    connectionCount.perUser.set(userId, userConns - 1);
  },
});
```

## Broadcasting Patterns

### Room-Only Broadcast
```typescript
// Message to specific room
ws.publish(`room:${roomId}`, message);

// Message to all except sender
ws.publish(`room:${roomId}`, message, { exclude: ws });

// Direct message to specific user
ws.publish(`user:${targetUserId}`, message);
```

### Fan-Out Pattern
```typescript
class FanOutManager {
  private userChannels = new Map<string, Set<string>>();

  subscribe(userId: string, channel: string) {
    if (!this.userChannels.has(userId)) {
      this.userChannels.set(userId, new Set());
    }
    this.userChannels.get(userId)!.add(channel);
  }

  unsubscribe(userId: string, channel: string) {
    this.userChannels.get(userId)?.delete(channel);
  }

  publish(channel: string, message: any) {
    for (const [userId, channels] of this.userChannels) {
      if (channels.has(channel)) {
        this.sendToUser(userId, message);
      }
    }
  }

  private sendToUser(userId: string, message: any) {
    // Send via user's WebSocket connections
  }
}
```

## Error Handling

### WebSocket Error Handler
```typescript
app.ws("/ws", {
  message(ws, message) {
    try {
      processMessage(ws, message);
    } catch (error) {
      ws.send({
        type: "error",
        code: "MESSAGE_ERROR",
        detail: error.message,
        originalMessage: message,
      });
    }
  },
  drain(ws) {
    // Backpressure - client is not consuming fast enough
    console.warn("Backpressure detected");
  },
});
```

### Graceful Shutdown
```typescript
import { Elysia } from "elysia";

const app = new Elysia()
  .use(ws())
  .ws("/ws", { /* ... */ })
  .listen(3000);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");

  // Notify all clients
  app.server?.publish(null, {
    type: "shutdown",
    message: "Server shutting down",
    reconnectUrl: "ws://backup.example.com/ws",
  });

  // Wait for drain
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Close server
  app.server?.stop();
  process.exit(0);
});
```

## Key Points
- Elysia WebSocket handler provides `open`, `message`, `close`, `drain`, and `error` lifecycle
- Room-based pub/sub enables targeted message broadcasting
- Authenticate WebSocket connections via token in query params or upgrade headers
- Heartbeat/ping-pong detects and cleans up stale connections
- Enforce connection limits per user, per room, and globally
- Fan-out patterns deliver messages across user connections
- Graceful shutdown notifies clients before server termination
- Handle backpressure with the `drain` event to prevent memory issues
