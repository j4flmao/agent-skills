# Real-Time Delivery Strategies

## SSE Implementation

### Server-Sent Events
```typescript
import { Request, Response } from 'express';

class SSEManager {
  private clients: Map<string, Response> = new Map();

  addClient(clientId: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    this.clients.set(clientId, res);

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(clientId);
    });
  }

  sendEvent(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  broadcast(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [, client] of this.clients) {
      client.write(payload);
    }
  }
}
```

## Key Points
- Use SSE for simple server-to-client streaming with automatic reconnection
- Use WebSocket for bidirectional communication requirements
- Implement heartbeat to detect dead connections
- Use compression for reducing bandwidth on large payloads
- Implement message buffering for reconnection scenarios
- Monitor connection pool size and event throughput
- Set max connections per client to prevent abuse
- Implement graceful connection drain during shutdown
- Use load balancer sticky sessions for stateful connections
- Fall back to long-polling when WebSocket/SSE not available
