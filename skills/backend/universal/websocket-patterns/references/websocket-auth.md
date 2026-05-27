# WebSocket Authentication

Securely authenticate WebSocket connections using various strategies.

## Token-Based Authentication (Query Parameter)

Pass the token as a query parameter during the WebSocket upgrade:

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Authentication required');
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (ws as any).userId = payload.sub;
    (ws as any).roles = payload.roles;
    logger.info({ userId: payload.sub }, 'WebSocket authenticated');
  } catch (err) {
    ws.close(4001, 'Invalid token');
  }
});
```

Client side:

```typescript
const token = await getAuthToken();
const ws = new WebSocket(`wss://api.example.com/ws?token=${token}`);
```

## Token-Based Authentication (First Message)

Send the token as the first message after connection:

```typescript
wss.on('connection', (ws) => {
  let authenticated = false;
  const timeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, 'Authentication timeout');
    }
  }, 5000);

  ws.on('message', (data) => {
    if (!authenticated) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'auth') {
          const payload = jwt.verify(msg.token, process.env.JWT_SECRET!);
          (ws as any).userId = payload.sub;
          authenticated = true;
          clearTimeout(timeout);
          ws.send(JSON.stringify({ type: 'auth_ok' }));
          return;
        }
      } catch {
        ws.close(4001, 'Invalid auth');
      }
    }

    // Handle normal messages after auth
    handleMessage(ws, data);
  });
});
```

## Cookie-Based Authentication

For web applications, reuse the session cookie:

```typescript
import cookie from 'cookie';

wss.on('connection', (ws, req) => {
  const cookies = cookie.parse(req.headers.cookie ?? '');
  const sessionToken = cookies['session_token'];

  if (!sessionToken) {
    ws.close(4001, 'No session cookie');
    return;
  }

  // Validate session
  const session = await sessionStore.get(sessionToken);
  if (!session || session.expiresAt < Date.now()) {
    ws.close(4001, 'Invalid or expired session');
    return;
  }

  (ws as any).userId = session.userId;
});
```

## Reconnection with Token Refresh

Handle token expiration during long-lived connections:

```typescript
class AuthenticatedWebSocket {
  private ws: WebSocket | null = null;
  private token: string;
  private refreshToken: string;
  private reconnectAttempts = 0;

  constructor(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
  }

  async connect(): Promise<void> {
    this.ws = new WebSocket(`wss://api.example.com/ws?token=${this.token}`);

    this.ws.on('close', async (code) => {
      if (code === 4001) {
        // Token invalid — try to refresh
        const newToken = await this.refreshAuthToken();
        if (newToken) {
          this.token = newToken;
          this.reconnect();
        }
      } else {
        this.reconnect();
      }
    });
  }

  private async refreshAuthToken(): Promise<string | null> {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.token;
    } catch {
      return null;
    }
  }

  private reconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
}
```

## Authorization for Rooms

Check permissions before allowing room subscription:

```typescript
class RoomAuthorizer {
  async canJoinRoom(userId: string, roomId: string): Promise<boolean> {
    // Check if user is a member of the room
    const membership = await db.roomMembers.findOne({
      where: { roomId, userId },
    });
    return !!membership;
  }

  async canModerate(userId: string, roomId: string): Promise<boolean> {
    const role = await db.roomMembers.findOne({
      where: { roomId, userId, role: ['admin', 'moderator'] },
    });
    return !!role;
  }
}

// Usage in WebSocket handler
ws.on('message', async (data) => {
  const msg = JSON.parse(data.toString());

  if (msg.event === 'join_room') {
    const canJoin = await authorizer.canJoinRoom(ws.userId, msg.data.roomId);
    if (!canJoin) {
      ws.send(JSON.stringify({
        event: 'error',
        data: { code: 'FORBIDDEN', message: 'Not authorized to join room' },
      }));
      return;
    }
    rooms.join(ws, msg.data.roomId);
  }
});
```

## Key Points
- Use WSS (TLS) for all WebSocket connections
- Pass tokens via query parameter or first message
- Use cookie-based auth for browser applications
- Handle token refresh on reconnection
- Set authentication timeout (5s default) for first-message auth
- Authorize room subscriptions individually
- Close connection with appropriate close code on auth failure (4001)
- Log authentication events for security auditing
