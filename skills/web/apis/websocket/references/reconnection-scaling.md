# WebSocket Reconnection and Scaling

## Overview
WebSocket connections require robust reconnection strategies and horizontal scaling. This reference covers reconnection backoff, connection pooling, sticky sessions, pub/sub integration, and health monitoring.

## Reconnection Strategies

### Exponential Backoff
```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 30000;
  private url: string;
  private shouldReconnect = true;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code);
      this.stopPingInterval();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts) +
        Math.random() * 1000,
      this.maxDelay
    );

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
    );

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopPingInterval();
    this.ws?.close(1000, 'Client disconnecting');
  }
}
```

### Reconnection with State Recovery
```typescript
class ResilientWebSocket extends WebSocketClient {
  private pendingMessages: any[] = [];
  private subscriptions: Set<string> = new Set();
  private lastMessageId: string | null = null;

  subscribe(channel: string) {
    this.subscriptions.add(channel);
    this.send({ type: 'subscribe', channel });
  }

  unsubscribe(channel: string) {
    this.subscriptions.delete(channel);
    this.send({ type: 'unsubscribe', channel });
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.pendingMessages.push(data);
    }
  }

  protected handleOpen() {
    super.handleOpen();

    // Resubscribe to channels
    this.subscriptions.forEach((channel) => {
      this.send({ type: 'subscribe', channel });
    });

    // Request missed messages
    if (this.lastMessageId) {
      this.send({
        type: 'catch-up',
        lastMessageId: this.lastMessageId,
      });
    }

    // Send pending messages
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      this.send(msg);
    }
  }
}
```

## Scaling WebSockets

### Redis Pub/Sub
```typescript
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>;
}

class ScalableWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;

  constructor(port: number) {
    this.pubClient = createClient();
    this.subClient = createClient();

    const server = createServer();
    this.wss = new WebSocketServer({ server });

    server.listen(port);
    this.setupRedis();
    this.setupWebSocket();
  }

  private async setupRedis() {
    await this.pubClient.connect();
    await this.subClient.connect();

    // Subscribe to broadcast channel
    await this.subClient.subscribe('ws:broadcast', (message) => {
      const { userIds, data } = JSON.parse(message);
      this.broadcastToClients(userIds, data);
    });

    await this.subClient.subscribe('ws:global', (message) => {
      const data = JSON.parse(message);
      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify(data));
        }
      });
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      const client: ConnectedClient = {
        ws,
        userId: '',
        subscriptions: new Set(),
      };

      this.clients.set(clientId, client);

      ws.on('message', (raw) => {
        const message = JSON.parse(raw.toString());

        switch (message.type) {
          case 'auth':
            client.userId = message.userId;
            break;

          case 'subscribe':
            client.subscriptions.add(message.channel);
            break;

          case 'publish':
            // Publish to Redis for cross-instance delivery
            this.pubClient.publish(
              'ws:broadcast',
              JSON.stringify({
                userIds: message.userIds || [],
                data: message.data,
              })
            );
            break;
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });
    });
  }

  private broadcastToClients(userIds: string[], data: any) {
    this.clients.forEach((client) => {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        userIds.includes(client.userId)
      ) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }
}
```

### Sticky Sessions with Load Balancer
```typescript
// Instance-based routing
class WebSocketRouter {
  private instances: Map<string, string> = new Map(); // userId -> instanceId

  getInstanceForUser(userId: string): string {
    if (!this.instances.has(userId)) {
      // Consistent hashing or round-robin
      const instance = selectInstance(userId);
      this.instances.set(userId, instance);
    }
    return this.instances.get(userId)!;
  }

  removeUser(userId: string) {
    this.instances.delete(userId);
  }
}

// API route to establish WebSocket connection
app.post('/ws/connect', (req, res) => {
  const { userId } = req.body;
  const instance = router.getInstanceForUser(userId);

  res.json({
    url: `wss://${instance}/ws`,
    userId,
    reconnectStrategy: {
      baseDelay: 1000,
      maxDelay: 30000,
      maxAttempts: 10,
    },
  });
});
```

## Health Monitoring

### Connection Health Checks
```typescript
class HealthMonitor {
  private client: WebSocketClient;
  private latencyHistory: number[] = [];
  private unhealthyThreshold = 5;

  startMonitoring() {
    setInterval(() => {
      this.checkLatency();
    }, 10000);
  }

  private async checkLatency() {
    const start = Date.now();
    this.client.send({ type: 'ping' });

    // Listen for pong response
    this.client.onMessage((message) => {
      if (message.type === 'pong') {
        const latency = Date.now() - start;
        this.latencyHistory.push(latency);

        if (this.latencyHistory.length > 100) {
          this.latencyHistory.shift();
        }

        const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) /
          this.latencyHistory.length;

        if (avgLatency > 5000) {
          console.warn('WebSocket latency high:', avgLatency);
        }
      }
    });
  }

  getMetrics() {
    return {
      latency: {
        current: this.latencyHistory[this.latencyHistory.length - 1],
        average: this.latencyHistory.reduce((a, b) => a + b, 0) /
          this.latencyHistory.length,
        max: Math.max(...this.latencyHistory),
      },
      isHealthy: this.latencyHistory.length > 0 &&
        this.latencyHistory[this.latencyHistory.length - 1] < 5000,
    };
  }
}
```

## Key Points
- Exponential backoff prevents reconnection storms
- Jitter avoids synchronized reconnection attempts
- State recovery resubscribes and catches up on missed messages
- Pending message queue ensures delivery during reconnection
- Redis Pub/Sub broadcasts messages across server instances
- Sticky sessions route users to the same instance
- Consistent hashing distributes connections evenly
- Ping/pong keepalive detects stale connections
- Connection health monitoring tracks latency
- Graceful disconnection with close code 1000
- Reconnection limits prevent infinite retry loops
- Authentication state persists across reconnection
- Message ID tracking enables at-least-once delivery
- Channel-based subscriptions organize message routing
- Connection pooling manages server-side resources
- Rate limiting prevents connection abuse
- WebSocket load balancers (HAProxy, NGINX) support sticky sessions
- Server-sent events (SSE) as alternative for one-way communication
- WebSocket over TLS (WSS) for encrypted connections
- Fallback to long-polling when WebSocket unavailable
- Connection draining during deployment ensures zero-downtime
- Client-side reconnect with configurable settings
- Backend instance discovery via service registry
- Metrics expose active connections, throughput, and latency
- Circuit breaker pattern prevents reconnection to unhealthy instances
- Binary messages (ArrayBuffer) for performance-critical data
- Subprotocol negotiation for version compatibility
- Origin validation prevents cross-site WebSocket hijacking
- Authentication via token query parameter or during connection
