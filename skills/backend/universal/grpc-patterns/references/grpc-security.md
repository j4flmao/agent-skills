# gRPC Security

## Overview
Secure gRPC services: TLS/mTLS authentication, authorization, token validation, rate limiting, input validation, and audit logging.

## TLS Configuration

```typescript
// Server-side TLS
import * as grpc from '@grpc/grpc-js';
import * as fs from 'fs';

function createSecureServer(): grpc.Server {
  const server = new grpc.Server({
    credentials: grpc.ServerCredentials.createSsl(
      fs.readFileSync('./certs/ca.crt'),     // Root CA for client certs
      [{
        cert_chain: fs.readFileSync('./certs/server.crt'),
        private_key: fs.readFileSync('./certs/server.key'),
      }],
      true // Require client cert (mTLS)
    ),
  });
  return server;
}
```

```typescript
// Client-side TLS
function createSecureClient(): UserServiceClient {
  return new UserServiceClient(
    'api.example.com:443',
    grpc.credentials.createSsl(
      fs.readFileSync('./certs/ca.crt'),       // Server CA
      fs.readFileSync('./certs/client.key'),   // Client key (mTLS)
      fs.readFileSync('./certs/client.crt')    // Client cert (mTLS)
    )
  );
}
```

## Authentication Interceptor

```typescript
import { Metadata, ServiceError, status } from '@grpc/grpc-js';

interface AuthInterceptorOptions {
  tokenValidator: (token: string) => Promise<JwtPayload>;
  publicMethods: string[]; // RPCs that don't need auth
}

function authInterceptor(options: AuthInterceptorOptions): grpc.Interceptor {
  return (options: grpc.InterceptorOptions, nextCall: Function) => {
    return new grpc.InterceptingCall(nextCall(options), {
      start: async (metadata, listener, next) => {
        const token = metadata.get('authorization')[0]?.toString()?.replace('Bearer ', '');

        if (options.publicMethods.includes(options.method_definition.path)) {
          next(metadata, listener);
          return;
        }

        if (!token) {
          const error: ServiceError = {
            name: 'Unauthenticated',
            message: 'Missing authentication token',
            code: status.UNAUTHENTICATED,
          } as ServiceError;
          listener.onReceiveStatus!({ code: status.UNAUTHENTICATED, details: error.message });
          return;
        }

        try {
          const payload = await options.tokenValidator(token);
          metadata.set('x-user-id', payload.sub!);
          metadata.set('x-user-roles', payload.roles.join(','));
          next(metadata, listener);
        } catch {
          const error: ServiceError = {
            name: 'Unauthenticated',
            message: 'Invalid or expired token',
            code: status.UNAUTHENTICATED,
          } as ServiceError;
          listener.onReceiveStatus!({ code: status.UNAUTHENTICATED, details: error.message });
        }
      },
    });
  };
}
```

## Authorization Interceptor

```typescript
interface AuthorizationOptions {
  rolePermissions: Map<string, string[]>; // role -> allowed RPC paths
}

function authorizationInterceptor(options: AuthorizationOptions): grpc.Interceptor {
  return (callOptions: grpc.InterceptorOptions, nextCall: Function) => {
    return new grpc.InterceptingCall(nextCall(callOptions), {
      start: (metadata, listener, next) => {
        const roles = metadata.get('x-user-roles')[0]?.toString().split(',') || [];
        const rpcPath = callOptions.method_definition.path;

        const hasPermission = roles.some(role =>
          options.rolePermissions.get(role)?.includes(rpcPath)
        );

        if (!hasPermission) {
          listener.onReceiveStatus!({ code: status.PERMISSION_DENIED, details: 'Insufficient permissions' });
          return;
        }

        next(metadata, listener);
      },
    });
  };
}
```

## Rate Limiting Interceptor

```typescript
class RateLimitingInterceptor {
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  createInterceptor(): grpc.Interceptor {
    return (callOptions: grpc.InterceptorOptions, nextCall: Function) => {
      return new grpc.InterceptingCall(nextCall(callOptions), {
        start: async (metadata, listener, next) => {
          const userId = metadata.get('x-user-id')[0]?.toString() || 'anonymous';
          const key = `${userId}:${callOptions.method_definition.path}`;

          if (!this.checkRateLimit(key)) {
            metadata.set('x-rate-limit', 'true');
            listener.onReceiveStatus!({
              code: status.RESOURCE_EXHAUSTED,
              details: 'Rate limit exceeded. Try again later.',
            });
            return;
          }

          next(metadata, listener);
        },
      });
    };
  }

  private checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = this.rateLimiters.get(key);

    if (!entry || now > entry.resetAt) {
      this.rateLimiters.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }
}
```

## Input Validation Interceptor

```typescript
import { status } from '@grpc/grpc-js';

function validationInterceptor(schema: any): grpc.Interceptor {
  return (callOptions: grpc.InterceptorOptions, nextCall: Function) => {
    return new grpc.InterceptingCall(nextCall(callOptions), {
      start: (metadata, listener, next) => {
        // Validate request before processing
        const originalListener = listener;
        // Wrap listener to intercept messages
        next(metadata, {
          onReceiveMessage: (message, next) => {
            try {
              validateMessage(schema, message);
              next(message);
            } catch (error) {
              (originalListener as any).onReceiveStatus({
                code: status.INVALID_ARGUMENT,
                details: `Validation failed: ${(error as Error).message}`,
              });
            }
          },
        });
      },
    });
  };
}

function validateMessage(schema: any, message: any): void {
  for (const [field, rules] of Object.entries(schema)) {
    const value = message[field];
    if ((rules as any).required && (value === undefined || value === null)) {
      throw new Error(`${field} is required`);
    }
    if (typeof (rules as any).maxLength === 'number' && value?.length > (rules as any).maxLength) {
      throw new Error(`${field} exceeds max length of ${(rules as any).maxLength}`);
    }
  }
}
```

## Audit Logging

```typescript
interface AuditEvent {
  timestamp: Date;
  userId: string;
  rpc: string;
  requestSize: number;
  responseSize: number;
  durationMs: number;
  status: number;
  metadata: Record<string, string>;
}

class GrpcAuditLogger {
  async logCall(call: AuditEvent): Promise<void> {
    await AuditLog.create(call);

    if (call.status !== status.OK) {
      await AlertService.send({
        severity: call.status === status.PERMISSION_DENIED ? 'HIGH' : 'LOW',
        title: `gRPC error: ${call.rpc}`,
        message: `Status: ${call.status}, User: ${call.userId}`,
      });
    }
  }

  async getUserActivityReport(userId: string, days: number): Promise<UserActivityReport> {
    const since = new Date(Date.now() - days * 86400000);
    const logs = await AuditLog.find({ userId, timestamp: { $gte: since } }).lean();

    return {
      userId,
      period: `${days} days`,
      totalCalls: logs.length,
      errorCount: logs.filter(l => l.status !== status.OK).length,
      rpcBreakdown: this.groupBy(logs, 'rpc'),
      averageDurationMs: logs.reduce((s, l) => s + l.durationMs, 0) / logs.length,
    };
  }
}
```

## Key Points
- Use TLS for all gRPC connections; mTLS for mutual authentication
- Implement authentication interceptor to validate JWT tokens on every call
- Apply authorization interceptor with role-permission mapping
- Rate limit per user per RPC path with RESOURCE_EXHAUSTED status
- Validate all request inputs with protobuf schema matching
- Audit every gRPC call: user, RPC, duration, status
- Use interceptors for cross-cutting security concerns
- Log and alert on PERMISSION_DENIED and UNAUTHENTICATED errors
