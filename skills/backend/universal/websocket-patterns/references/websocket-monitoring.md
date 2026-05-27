# WebSocket Monitoring

Monitor WebSocket connections for health, performance, and reliability.

## Connection Metrics

Track connection lifecycle and state:

```typescript
class WebSocketMetrics {
  private connections = new Gauge({
    name: 'websocket_connections_active',
    help: 'Currently active WebSocket connections',
    labelNames: ['node'] as const,
  });

  private messagesIn = new Counter({
    name: 'websocket_messages_received_total',
    help: 'Total messages received',
    labelNames: ['event'] as const,
  });

  private messagesOut = new Counter({
    name: 'websocket_messages_sent_total',
    help: 'Total messages sent',
    labelNames: ['event'] as const,
  });

  private disconnections = new Counter({
    name: 'websocket_disconnections_total',
    help: 'WebSocket disconnections by reason',
    labelNames: ['code', 'reason'] as const,
  });

  private latency = new Histogram({
    name: 'websocket_message_latency_seconds',
    help: 'Message processing latency',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  });

  private messageSize = new Histogram({
    name: 'websocket_message_size_bytes',
    help: 'Message size distribution',
    buckets: [64, 256, 1024, 4096, 16384, 65536],
  });
}
```

## Heartbeat Monitoring

Track missed heartbeats and stale connections:

```typescript
class HeartbeatMonitor {
  private lastPong = new Map<string, number>();
  private readonly heartbeatInterval = 30000;
  private readonly missedPongLimit = 3;

  startHeartbeat(ws: WebSocket): void {
    const id = (ws as any).id;

    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }

      ws.ping();

      // Check if we missed too many pongs
      const lastPong = this.lastPong.get(id) ?? Date.now();
      const missed = Math.floor((Date.now() - lastPong) / this.heartbeatInterval);

      if (missed >= this.missedPongLimit) {
        logger.warn({ connectionId: id, missedPongs: missed }, 'Closing unresponsive connection');
        ws.close(1001, 'Heartbeat timeout');
        clearInterval(interval);
      }
    }, this.heartbeatInterval);

    ws.on('pong', () => {
      this.lastPong.set(id, Date.now());
    });

    ws.on('close', () => {
      clearInterval(interval);
      this.lastPong.delete(id);
    });
  }
}
```

## Connection Health Dashboard

```yaml
Panels:
  Active connections:
    - Gauge of websocket_connections_active per node
    - Alert on sudden drop (>= 50% in 1 minute)

  Connection rate:
    - Rate of websocket_connections_created_total
    - Compare with disconnection rate

  Message throughput:
    - Rate of websocket_messages_received_total + websocket_messages_sent_total
    - Split by event type

  Message latency p99:
    - Histogram of websocket_message_latency_seconds
    - Alert when p99 > 500ms

  Disconnection reasons:
    - Top-N disconnection codes (1000=normal, 1001=going away, 1006=abnormal, etc.)
    - Alert on abnormal disconnection spike

  Top rooms by connections:
    - Gauge of active connections per room

  Message size:
    - Histogram of websocket_message_size_bytes
    - Alert on messages > 100KB
```

## Health Check Endpoint

Expose WebSocket server health:

```typescript
async function websocketHealth(): Promise<HealthStatus> {
  const activeConnections = await getActiveConnectionCount();
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const status: HealthStatus = {
    status: activeConnections > 0 ? 'healthy' : 'degraded',
    connections: activeConnections,
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    uptime: Math.round(uptime),
    rooms: await getRoomCount(),
    rateLimit: {
      current: rateLimiter.getCurrentRate(),
      limit: rateLimiter.getMaxRate(),
    },
  };

  // Health check endpoint
  return status;
}

// Express endpoint
app.get('/health/ws', async (req, res) => {
  const health = await websocketHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Logging WebSocket Events

```typescript
function logWebSocketEvent(event: string, connection: WebSocket, data: Record<string, unknown>): void {
  logger.info({
    event: `websocket.${event}`,
    connectionId: (connection as any).id,
    userId: (connection as any).userId,
    ...data,
    timestamp: new Date().toISOString(),
  });
}

// Usage
logWebSocketEvent('connected', ws, { ip: req.socket.remoteAddress });
logWebSocketEvent('disconnected', ws, { code, reason, durationMs: Date.now() - startTime });
logWebSocketEvent('message', ws, { event: msg.event, size: rawData.length });
```

## Key Points
- Track active connections, message rates, latency, and disconnection codes
- Monitor heartbeats and close unresponsive connections after 3 missed pongs
- Alert on sudden connection drops, high latency, or abnormal disconnections
- Expose health check endpoint with connection and memory metrics
- Log all WebSocket lifecycle events (connect, disconnect, message)
- Monitor message size and alert on oversized messages
- Track per-room connection counts for capacity planning
- Use Prometheus histograms for latency and size distributions
