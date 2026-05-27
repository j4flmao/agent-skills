# WebSocket Implementation Patterns

## Connection Management

### WebSocket Server
```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<string, WebSocket> = new Map();

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = this.authenticateConnection(req);
      if (!connectionId) {
        ws.close(4001, 'Authentication failed');
        return;
      }

      this.connections.set(connectionId, ws);
      console.log(`Client connected: ${connectionId}`);

      ws.on('message', (data: Buffer) => {
        this.handleMessage(connectionId, data.toString());
      });

      ws.on('close', () => {
        this.connections.delete(connectionId);
        console.log(`Client disconnected: ${connectionId}`);
        this.handleDisconnect(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date().toISOString(),
      }));
    });
  }

  private authenticateConnection(req: IncomingMessage): string | null {
    const token = this.extractToken(req);
    if (!token) return null;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return payload.userId;
    } catch {
      return null;
    }
  }

  private extractToken(req: IncomingMessage): string | null {
    const url = new URL(req.url, 'http://localhost');
    const tokenQuery = url.searchParams.get('token');
    if (tokenQuery) return tokenQuery;

    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  sendToUser(userId: string, message: any): boolean {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  broadcast(message: any, filter?: (userId: string) => boolean): void {
    const payload = JSON.stringify(message);
    for (const [userId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN && (!filter || filter(userId))) {
        ws.send(payload);
      }
    }
  }
}
```

## Pub/Sub Integration

### Redis Pub/Sub for Multi-Instance
```typescript
import Redis from 'ioredis';

class DistributedWebSocketManager {
  private localConnections: Map<string, WebSocket> = new Map();
  private pubClient: Redis;
  private subClient: Redis;

  constructor(server: http.Server, redisUrl: string) {
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl);

    this.setupRedisSubscription();
    this.setupWebSocket(server);
  }

  private setupRedisSubscription(): void {
    this.subClient.subscribe('ws:messages', 'ws:events');

    this.subClient.on('message', (channel, message) => {
      const parsed = JSON.parse(message);

      switch (channel) {
        case 'ws:messages':
          this.handleRemoteMessage(parsed);
          break;
        case 'ws:events':
          this.handleRemoteEvent(parsed);
          break;
      }
    });
  }

  async sendToUser(userId: string, message: any): Promise<void> {
    // Try local first
    const ws = this.localConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return;
    }

    // Publish to other instances
    await this.pubClient.publish('ws:messages', JSON.stringify({
      targetUserId: userId,
      message,
    }));
  }

  async broadcastToRoom(room: string, message: any): Promise<void> {
    await this.pubClient.publish('ws:events', JSON.stringify({
      room,
      message,
    }));
  }
}
```

## Reconnection Strategy

```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseDelay: number = 1000;

  async connect(url: string, token: string): Promise<void> {
    this.ws = new WebSocket(`${url}?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.sendHeartbeat();
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000) {
        this.reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect(this.url, this.token);
    }, delay);
  }

  private sendHeartbeat(): void {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
}
```

## Key Points
- Authenticate WebSocket connections during the upgrade handshake
- Use Redis pub/sub for broadcasting across multiple server instances
- Implement heartbeat/ping-pong for connection health monitoring
- Support reconnection with exponential backoff on the client side
- Handle backpressure by monitoring client send buffers
- Implement per-user rate limiting on message publishing
- Close connections gracefully with proper close codes
- Use rooms/channels for targeted message delivery
- Monitor connection count and message throughput
- Implement connection draining during graceful shutdown
