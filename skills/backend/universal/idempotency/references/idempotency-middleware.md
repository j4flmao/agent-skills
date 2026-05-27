# Idempotency Middleware Patterns

## Express.js Middleware

### Basic Middleware
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

function idempotencyMiddleware(store: IdempotencyStore) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'] as string;
    if (!key) {
      return res.status(400).json({
        error: 'Idempotency-Key header is required for mutating requests',
      });
    }

    if (!isValidUUID(key)) {
      return res.status(400).json({
        error: 'Idempotency-Key must be a valid UUID v4',
      });
    }

    const requestHash = createRequestHash(req.method, req.path, req.body);

    try {
      const { acquired, existing } = await store.tryAcquire(key, requestHash);

      if (!acquired) {
        if (existing) {
          if (existing.status === 'completed') {
            return res.status(existing.response_status).json(existing.response_body);
          }
          if (existing.status === 'conflict') {
            return res.status(422).json({
              error: 'Idempotency key reused with different request parameters',
            });
          }
          return res.status(409).json({
            error: 'Request with this idempotency key is already being processed',
          });
        }
      }

      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        store.complete(key, res.statusCode, body).catch(console.error);
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Idempotency store error:', error);
      next();
    }
  };
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function createRequestHash(method: string, path: string, body: any): string {
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(`${method}:${path}:${JSON.stringify(body)}`)
    .digest('hex');
}
```

## FastAPI Middleware

```python
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional
import json

class IdempotencyMiddleware:
    def __init__(self, store, ttl_hours: int = 24):
        self.store = store
        self.ttl = timedelta(hours=ttl_hours)

    async def __call__(self, request: Request, call_next):
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)

        key = request.headers.get("Idempotency-Key")
        if not key:
            return JSONResponse(
                status_code=400,
                content={"error": "Idempotency-Key header is required"}
            )

        try:
            uuid.UUID(key, version=4)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"error": "Idempotency-Key must be a valid UUID v4"}
            )

        body = await request.body()
        request_hash = self._create_hash(request.method, request.url.path, body)

        acquired, existing = await self.store.try_acquire(key, request_hash)
        if not acquired:
            if existing and existing.get("status") == "completed":
                return JSONResponse(
                    status_code=existing["response_status"],
                    content=existing["response_body"]
                )
            elif existing and existing.get("status") == "conflict":
                return JSONResponse(
                    status_code=422,
                    content={"error": "Key reused with different parameters"}
                )
            return JSONResponse(
                status_code=409,
                content={"error": "Request already being processed"}
            )

        response = await call_next(request)

        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        await self.store.complete(
            key,
            response.status_code,
            json.loads(response_body)
        )

        return Response(
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )

    def _create_hash(self, method: str, path: str, body: bytes) -> str:
        return hashlib.sha256(
            f"{method}:{path}:{body}".encode()
        ).hexdigest()
```

## Spring Boot Interceptor

```java
@Component
public class IdempotencyInterceptor implements HandlerInterceptor {
    private final IdempotencyStore store;
    private static final List<String> SAFE_METHODS = Arrays.asList("GET", "HEAD", "OPTIONS");

    @Override
    public boolean preHandle(HttpServletRequest request,
                            HttpServletResponse response,
                            Object handler) throws IOException {
        if (SAFE_METHODS.contains(request.getMethod())) {
            return true;
        }

        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isEmpty()) {
            sendError(response, 400, "Idempotency-Key header is required");
            return false;
        }

        String requestHash = createHash(request);

        IdempotencyResult result = store.tryAcquire(key, requestHash);
        if (!result.isAcquired()) {
            IdempotencyRecord existing = result.getExisting();
            if (existing != null && "completed".equals(existing.getStatus())) {
                sendResponse(response, existing.getResponseStatus(), existing.getResponseBody());
                return false;
            }
            if (existing != null && "conflict".equals(existing.getStatus())) {
                sendError(response, 422, "Key reused with different parameters");
                return false;
            }
            sendError(response, 409, "Request already being processed");
            return false;
        }

        request.setAttribute("idempotencyKey", key);
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) {
        String key = (String) request.getAttribute("idempotencyKey");
        if (key != null) {
            store.complete(key, response.getStatus(), response);
        }
    }
}
```

## GraphQL Idempotency

```typescript
function idempotentMutation(store: IdempotencyStore) {
  return async (resolve, parent, args, context, info) => {
    const key = context.req?.headers['idempotency-key'];
    if (!key) {
      throw new Error('Idempotency-Key header required for mutations');
    }

    const operationName = info.operation.name?.value;
    const input = args.input;
    const requestHash = createRequestHash(operationName, input);

    const { acquired, existing } = await store.tryAcquire(key, requestHash);

    if (!acquired) {
      if (existing?.status === 'completed') {
        return existing.response_body;
      }
      if (existing?.status === 'conflict') {
        throw new Error('Idempotency key reused with different mutation');
      }
      throw new Error('Mutation already in progress');
    }

    try {
      const result = await resolve(parent, args, context, info);
      await store.complete(key, 200, result);
      return result;
    } catch (error) {
      await store.complete(key, 500, { error: error.message });
      throw error;
    }
  };
}
```

## Idempotency Key Generation

### Client-Side
```typescript
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

async function makeIdempotentRequest(url: string, body: any) {
  const key = generateIdempotencyKey();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 409) {
    await new Promise(r => setTimeout(r, 1000));
    return makeIdempotentRequest(url, body);
  }

  return response.json();
}
```

### Retry Logic
```typescript
async function retryWithIdempotency(
  fn: () => Promise<any>,
  options: { maxRetries?: number; baseDelay?: number } = {}
) {
  const { maxRetries = 3, baseDelay = 200 } = options;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.status === 429 || error.status >= 500) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
```

## Key Points
- Idempotency middleware intercepts all mutating HTTP methods (POST, PUT, PATCH, DELETE)
- Validate UUID format before processing to prevent injection
- Store request hash alongside key to detect body reuse violations
- Return 409 for concurrent requests with the same key
- Intercept the response to store it atomically with the key
- Handle store errors gracefully by allowing the request to proceed without idempotency
- Set appropriate TTL to balance storage cost with retry window requirements
- Log all idempotency key hits for debugging and observability
- Use distributed stores (Redis/DynamoDB) for multi-instance deployments
- Include idempotency key in audit logs for traceability
