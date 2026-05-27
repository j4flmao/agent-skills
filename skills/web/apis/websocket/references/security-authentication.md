# WebSocket Security and Authentication

## Overview
WebSocket security covers authentication, authorization, input validation, origin checking, and protection against common attacks. WSS (WebSocket Secure) encrypts all traffic, while authentication mechanisms verify client identity.

## Authentication

### Token-Based Authentication
```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { verify } from 'jsonwebtoken';

// Server-side authentication
class AuthenticatedWebSocketServer {
  private wss: WebSocketServer;

  constructor(port: number) {
    this.wss = new WebSocketServer({
      port,
      // Verify token during upgrade
      verifyClient: (info, callback) => {
        const token = this.extractToken(info.req.url);

        if (!token) {
          callback(false, 401, 'Authentication required');
          return;
        }

        try {
          const decoded = verify(token, process.env.JWT_SECRET!);
          (info.req as any).user = decoded;
          callback(true);
        } catch (error) {
          callback(false, 401, 'Invalid token');
        }
      },
    });

    this.wss.on('connection', (ws, req) => {
      const user = (req as any).user;
      console.log(`User ${user.id} connected`);
    });
  }

  private extractToken(url: string): string | null {
    const parsed = new URL(url, 'http://localhost');
    return parsed.searchParams.get('token');
  }
}

// Client-side authentication
const token = await getAuthToken();
const ws = new WebSocket(`wss://api.example.com/ws?token=${token}`);
```

### Authentication During Connection
```typescript
// Alternative: authenticate after connection
class PostConnectAuth {
  private wss: WebSocketServer;
  private unauthenticatedClients: Map<WebSocket, NodeJS.Timeout> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws) => {
      // Set timeout for authentication
      const timeout = setTimeout(() => {
        ws.close(4001, 'Authentication timeout');
        this.unauthenticatedClients.delete(ws);
      }, 10000);

      this.unauthenticatedClients.set(ws, timeout);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          try {
            const decoded = verify(message.token, process.env.JWT_SECRET!);
            (ws as any).user = decoded;
            (ws as any).authenticated = true;

            clearTimeout(timeout);
            this.unauthenticatedClients.delete(ws);

            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: decoded.id,
            }));
          } catch (error) {
            ws.close(4001, 'Authentication failed');
          }
        }
      });
    });
  }
}
```

## Authorization

### Role-Based Access Control
```typescript
class AuthorizedWebSocket {
  private wss: WebSocketServer;
  private permissions: Map<string, Set<string>> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws, req) => {
      const user = (req as any).user;
      this.permissions.set(user.id, new Set(user.permissions));

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (!this.checkPermission(user, message.action)) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          }));
          return;
        }

        this.handleAuthorizedMessage(ws, message);
      });
    });
  }

  private checkPermission(user: any, action: string): boolean {
    const userPerms = this.permissions.get(user.id);
    if (!userPerms) return false;

    // Check roles
    if (user.role === 'admin') return true;

    // Check specific permissions
    const requiredPerms = this.getRequiredPermissions(action);
    return requiredPerms.every((perm) => userPerms.has(perm));
  }

  private getRequiredPermissions(action: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'message:send': ['chat:write'],
      'message:delete': ['chat:admin', 'chat:delete'],
      'user:kick': ['chat:admin'],
      'room:create': ['chat:admin'],
    };

    return permissionMap[action] || [];
  }
}
```

## Input Validation

### Message Validation
```typescript
import { z } from 'zod';

// Define message schemas
const messageSchemas = {
  'message:send': z.object({
    type: z.literal('message:send'),
    channel: z.string().min(1).max(100),
    content: z.string().min(1).max(10000),
    metadata: z.object({
      clientId: z.string().uuid(),
      timestamp: z.number(),
    }),
  }),

  'room:join': z.object({
    type: z.literal('room:join'),
    roomId: z.string().uuid(),
    password: z.string().optional(),
  }),

  'user:typing': z.object({
    type: z.literal('user:typing'),
    channel: z.string().min(1).max(100),
    isTyping: z.boolean(),
  }),
};

// Validation middleware
class MessageValidator {
  validate(data: any): { valid: boolean; error?: string } {
    try {
      const schema = messageSchemas[data.type as keyof typeof messageSchemas];
      if (!schema) {
        return { valid: false, error: 'Unknown message type' };
      }

      schema.parse(data);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: error.errors.map((e) => e.message).join(', '),
        };
      }
      return { valid: false, error: 'Invalid message format' };
    }
  }
}
```

## Rate Limiting

### Connection Rate Limiting
```typescript
class RateLimiter {
  private connections: Map<string, { count: number; resetAt: number }> = new Map();

  checkRateLimit(ip: string, maxConnections: number = 10): boolean {
    const now = Date.now();
    const entry = this.connections.get(ip);

    if (!entry || now > entry.resetAt) {
      this.connections.set(ip, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (entry.count >= maxConnections) {
      return false;
    }

    entry.count++;
    return true;
  }

  // Message rate limiting per connection
  private messageCounts: Map<string, { count: number; windowStart: number }> = new Map();

  checkMessageRate(connectionId: string, maxMessages: number = 60): boolean {
    const now = Date.now();
    const entry = this.messageCounts.get(connectionId);

    if (!entry || now - entry.windowStart > 60000) {
      this.messageCounts.set(connectionId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= maxMessages) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRateLimitInfo(connectionId: string): { remaining: number; resetAt: number } {
    const entry = this.messageCounts.get(connectionId);
    if (!entry) {
      return { remaining: 60, resetAt: Date.now() + 60000 };
    }

    return {
      remaining: Math.max(0, 60 - entry.count),
      resetAt: entry.windowStart + 60000,
    };
  }
}
```

## Origin Validation

### CORS for WebSockets
```typescript
class SecureWebSocketServer {
  private allowedOrigins = [
    'https://app.example.com',
    'https://admin.example.com',
  ];

  constructor(port: number) {
    this.wss = new WebSocketServer({
      port,
      verifyClient: (info, callback) => {
        // Check Origin header
        const origin = info.req.headers['origin'];
        const referer = info.req.headers['referer'];

        if (!origin && !referer) {
          callback(false, 403, 'Origin required');
          return;
        }

        const source = origin || referer || '';

        if (!this.allowedOrigins.some((allowed) => source.startsWith(allowed))) {
          callback(false, 403, 'Origin not allowed');
          return;
        }

        callback(true);
      },
    });
  }
}
```

## Key Points
- WSS (TLS) encrypts all WebSocket traffic
- Token authentication during upgrade or post-connection
- Origin validation prevents cross-site hijacking
- Rate limiting prevents connection and message flooding
- Input validation with schemas prevents injection
- Role-based authorization controls action access
- Connection timeouts prevent hanging connections
- Close codes communicate disconnection reasons
- Subprotocol negotiation specifies protocol version
- Cookie-based auth works with same-origin connections
- Replay attack prevention with timestamps and nonces
- Message size limits prevent resource exhaustion
- Binary vs text message handling
- Cross-Origin WebSocket (CWS) for secure cross-origin
- IP whitelisting for server-to-server connections
- Audit logging tracks connection activity
- Session management with token revocation
- Connection monitoring detects abnormal patterns
- Payload encryption for sensitive data channels
- Server-side ping/pong detects stale connections
- Denial of service protection through resource limits
- Graceful degradation under attack
- WebSocket proxy (NGINX, HAProxy) configuration
- Cloud WAF integration for DDoS protection
- Authentication refresh without reconnection
- Multi-factor authentication for sensitive actions
- Bot detection for protecting public chat systems
- Data validation prevents XSS through WebSocket messages
- Connection metadata for forensic analysis
- Regular security audits of WebSocket endpoints
