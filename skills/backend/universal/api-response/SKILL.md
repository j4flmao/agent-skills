---
name: backend-api-response
description: >
  Use this skill when designing API response contracts — Response<T>, exception handling, error codes, pagination envelopes, standardized payload contracts. This skill enforces: uniform ApiResponse<T> envelope, UPPER_SNAKE_CASE error codes, pagination for list endpoints, ISO 8601 UTC timestamps. Do NOT use for: endpoint routing design, database schema, authentication flows.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, api, response, phase-2, universal]
---

# API Response Design

## Purpose
Define and enforce a universal API response contract with standardized envelopes, error codes, and pagination. Every response must be predictable regardless of success or failure.

## Agent Protocol

### Trigger
User request includes: `api response`, `response envelope`, `response<T>`, `api error`, `exception handling`, `error code`, `api contract`, `pagination response`, `api standard`.

### Input Context
- Current API response format (if refactoring)
- Technology stack (language/framework)
- Error handling strategy (exceptions, result types, error codes)
- Pagination requirements

### Output Artifact
A markdown document containing:
- Response envelope structure (Response<T> with status, data, error, metadata)
- Error response format (error code, message, details, trace ID)
- Exception handling strategy (global handler, middleware, filter)
- Pagination envelope (page, pageSize, totalCount, totalPages)
- Validation error format (field-level errors)
- Success response rules (HTTP status codes per operation)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output. If response format already standardized, output `API response standard already defined at: [path].` and stop.

### Completion Criteria
- [ ] Envelope structure defined for success, error, validation, pagination
- [ ] Exception-to-response mapping defined for all common exception types
- [ ] HTTP status code mapping defined per operation type
- [ ] Pagination contract defined with required/optional fields

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Response Envelope Style
```
What is the primary client type?
├── Browser SPA / Mobile app
│   ├── Need minimal payload overhead?
│   │   ├── Yes → Wrapper envelope (success+data+error+meta)
│   │   └── No → Standard envelope with full metadata
│   └── Need GraphQL-style flexibility?
│       ├── Yes → Single endpoint with error array pattern
│       └── No → RESTful per-endpoint envelope
├── Service-to-service (internal)
│   ├── Use OpenAPI-generated clients?
│   │   ├── Yes → Full envelope with requestId for tracing
│   │   └── No → Result type pattern (monads/railway)
└── Third-party / Public API
    ├── Use standard envelope with domain-prefixed error codes
    └── Include rate limit headers in every response
```

### Pagination Strategy
```
Will the list have new items inserted while users browse?
├── Yes → Cursor-based pagination (stable, no duplicates/skips)
│   └── Encode cursor as base64 opaque string, not raw DB value
├── No → Do users need random page access?
│   ├── Yes → Offset-based pagination (page N access)
│   │   └── Warn: performance degrades with large offset
│   └── No → Keyset pagination (best performance, O(1))
└── Is this a real-time feed?
    └── Cursor-based with live updates via WebSocket/SSE
```

### Error Response Granularity
```
Who is the consumer?
├── External developer (public API)
│   ├── Generic messages for 5xx, specific for 4xx
│   ├── Include details array for field-level validation
│   └── Never expose stack traces or internal IDs
├── Internal service
│   ├── Include error codes for automated handling
│   ├── Optionally include correlation ID for debugging
│   └── Structured machine-parseable error codes
└── End-user facing (BFF)
    ├── User-friendly messages (not error codes)
    ├── Include actionable remediation hints
    └── Log full details server-side only
```

## Workflow

### Step 1: Define Response Envelope

**Standard `ApiResponse<T>`** — Every API response MUST follow this envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "metadata": {
    "requestId": "req_abc123",
    "timestamp": "2026-05-14T10:30:00Z",
    "version": "1.0"
  }
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order with ID '123' not found",
    "details": [
      { "field": "orderId", "reason": "Resource does not exist" }
    ],
    "traceId": "trace_xyz789"
  },
  "metadata": {
    "requestId": "req_abc123",
    "timestamp": "2026-05-14T10:30:00Z",
    "version": "1.0"
  }
}
```

### Step 2: Define Generic Type Definitions

**TypeScript**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  metadata: ResponseMetadata;
}

interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  traceId: string;
}

interface ErrorDetail {
  field: string;
  reason: string;
}

interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  version: string;
}
```

**C#**
```csharp
public class ApiResponse<T>
{
  public bool Success { get; init; }
  public T? Data { get; init; }
  public ApiError? Error { get; init; }
  public ResponseMetadata Metadata { get; init; } = new();

  public static ApiResponse<T> Ok(T data) => new() {
    Success = true, Data = data, Metadata = new()
  };
  public static ApiResponse<T> Fail(string code, string message, string traceId) => new() {
    Success = false,
    Error = new ApiError { Code = code, Message = message, TraceId = traceId },
    Metadata = new()
  };
}
```

**Go**
```go
type ApiResponse[T any] struct {
  Success  bool             `json:"success"`
  Data     *T               `json:"data"`
  Error    *ApiError        `json:"error"`
  Metadata ResponseMetadata `json:"metadata"`
}
```

**Python**
```python
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")

class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[list[dict]] = None
    traceId: str

class ResponseMetadata(BaseModel):
    requestId: str
    timestamp: str
    version: str = "1.0"

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None
    metadata: ResponseMetadata

    @classmethod
    def ok(cls, data: T, request_id: str) -> "ApiResponse[T]":
        return cls(
            success=True,
            data=data,
            metadata=ResponseMetadata(
                requestId=request_id,
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
        )

    @classmethod
    def fail(cls, code: str, message: str, trace_id: str) -> "ApiResponse":
        return cls(
            success=False,
            error=ApiError(code=code, message=message, traceId=trace_id),
            metadata=ResponseMetadata(
                requestId=trace_id,
                timestamp=datetime.utcnow().isoformat() + "Z"
            )
        )
```

**Java (Spring)**
```java
public record ApiResponse<T>(
    boolean success,
    T data,
    ApiError error,
    ResponseMetadata metadata
) {
    public static <T> ApiResponse<T> ok(T data, String requestId) {
        return new ApiResponse<>(true, data, null,
            new ResponseMetadata(requestId, Instant.now().toString(), "1.0"));
    }

    public static <T> ApiResponse<T> fail(String code, String message, String traceId) {
        return new ApiResponse<>(false, null,
            new ApiError(code, message, null, traceId),
            new ResponseMetadata(traceId, Instant.now().toString(), "1.0"));
    }
}
```

### Step 3: Define Pagination Envelope

Offset-based:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "metadata": { ... }
}
```

Cursor-based:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6ICJhYmMxMjMifQ==",
    "nextCursor": "eyJpZCI6ICJkZWY0NTYifQ==",
    "prevCursor": null,
    "hasMore": true
  },
  "metadata": { ... }
}
```

### Step 4: Map HTTP Status Codes

| Operation | Success | Validation Error | Not Found | Conflict | Server Error |
|---|---|---|---|---|---|---|
| GET (single) | 200 | — | 404 | — | 500 |
| GET (list) | 200 | — | 200 (empty array) | — | 500 |
| POST (create) | 201 | 422 | 404 (parent ref) | 409 | 500 |
| PUT (update) | 200 | 422 | 404 | 409 | 500 |
| PATCH (partial) | 200 | 422 | 404 | 409 | 500 |
| DELETE | 204 | — | 404 | 409 | 500 |
| ASYNC (accepted) | 202 | 422 | — | — | 500 |

### Step 5: Map Exceptions to Responses

| Exception | Status | Error Code |
|---|---|---|
| `ValidationException` | 422 | `VALIDATION_ERROR` |
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` |
| `ForbiddenException` | 403 | `FORBIDDEN` |
| `RateLimitException` | 429 | `RATE_LIMITED` |
| `InternalException` | 500 | `INTERNAL_ERROR` |
| `TimeoutException` | 504 | `GATEWAY_TIMEOUT` |
| `BusinessRuleException` | 400 | `BUSINESS_RULE_VIOLATION` |
| `ServiceUnavailableException` | 503 | `SERVICE_UNAVAILABLE` |

### Step 6: Apply Error Code Naming Convention
`{DOMAIN}_{ERROR}` in UPPER_SNAKE_CASE:
- `ORDER_NOT_FOUND` — specific resource
- `PAYMENT_DECLINED` — business logic failure
- `VALIDATION_ERROR` — general validation
- `INSUFFICIENT_FUNDS` — business validation
- `DUPLICATE_ENTRY` — uniqueness violation
- `AUTH_TOKEN_EXPIRED` — token lifecycle
- `RATE_LIMIT_EXCEEDED` — quota exhaustion

### Step 7: Implement Global Exception Handler

**Node.js/Express middleware**
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

class ExceptionHandler {
  handle(err: Error, req: Request, res: Response, _next: NextFunction): void {
    const requestId = req.headers['x-request-id'] as string || uuid();
    const traceId = uuid();

    if (err instanceof ValidationException) {
      res.status(422).json(ApiResponse.fail('VALIDATION_ERROR', err.message, traceId));
    } else if (err instanceof NotFoundException) {
      res.status(404).json(ApiResponse.fail('NOT_FOUND', err.message, traceId));
    } else if (err instanceof ConflictException) {
      res.status(409).json(ApiResponse.fail('CONFLICT', err.message, traceId));
    } else if (err instanceof UnauthorizedException) {
      res.status(401).json(ApiResponse.fail('UNAUTHORIZED', err.message, traceId));
    } else if (err instanceof ForbiddenException) {
      res.status(403).json(ApiResponse.fail('FORBIDDEN', err.message, traceId));
    } else {
      console.error('Unhandled error:', err);
      res.status(500).json(ApiResponse.fail('INTERNAL_ERROR', 'An unexpected error occurred', traceId));
    }
  }
}
```

**.NET global exception filter/middleware**
```csharp
public class GlobalExceptionHandler : IMiddleware
{
  public async Task InvokeAsync(HttpContext context, RequestDelegate next)
  {
    try { await next(context); }
    catch (NotFoundException ex) { await WriteResponse(context, 404, "NOT_FOUND", ex); }
    catch (ValidationException ex) { await WriteResponse(context, 422, "VALIDATION_ERROR", ex); }
    catch (ConflictException ex) { await WriteResponse(context, 409, "CONFLICT", ex); }
    catch (Exception ex) { await WriteResponse(context, 500, "INTERNAL_ERROR", ex); }
  }

  private static async Task WriteResponse(HttpContext ctx, int status, string code, Exception ex)
  {
    ctx.Response.StatusCode = status;
    ctx.Response.ContentType = "application/json";
    var response = ApiResponse<object>.Fail(code, ex.Message, Activity.Current?.Id ?? ctx.TraceIdentifier);
    await ctx.Response.WriteAsJsonAsync(response);
  }
}
```

**FastAPI exception handler**
```python
from fastapi import Request, JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(
        status_code=404,
        content=ApiResponse.fail("NOT_FOUND", str(exc), request.headers.get("x-request-id", "")).model_dump()
    )

@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    details = [
        {"field": ".".join(err["loc"]), "reason": err["type"], "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": details},
            "metadata": {"requestId": request.headers.get("x-request-id", ""), "timestamp": datetime.utcnow().isoformat() + "Z"}
        }
    )
```

### Step 8: Implement Response Builder Pattern

```typescript
class ResponseBuilder<T> {
  private statusCode = 200;
  private headers: Record<string, string> = {};
  private pagination?: PaginationMeta;
  private rateLimit?: RateLimitInfo;

  constructor(
    private data: T | null,
    private requestId: string
  ) {}

  withStatus(code: number): this {
    this.statusCode = code;
    return this;
  }

  withHeader(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  withPagination(meta: PaginationMeta): this {
    this.pagination = meta;
    return this;
  }

  withRateLimit(info: RateLimitInfo): this {
    this.rateLimit = info;
    return this;
  }

  build(): { statusCode: number; body: ApiResponse<T>; headers: Record<string, string> } {
    const body: ApiResponse<T> = {
      success: true,
      data: this.data,
      error: null,
      metadata: {
        requestId: this.requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    };

    if (this.pagination) {
      (body as any).pagination = this.pagination;
    }

    const headers = { ...this.headers };
    if (this.rateLimit) {
      headers['X-RateLimit-Limit'] = String(this.rateLimit.limit);
      headers['X-RateLimit-Remaining'] = String(this.rateLimit.remaining);
      headers['X-RateLimit-Reset'] = String(this.rateLimit.reset);
    }

    return { statusCode: this.statusCode, body, headers };
  }
}
```

## Production Considerations

### Envelope Consistency
- Every response MUST use the same envelope — no exceptions for error or edge cases
- The `data` field is null when `error` is present, and vice versa
- Never return raw arrays at the top level — always wrap in `{ data: [...] }`
- Include `requestId` in every response for debugging correlation

### Error Response Guidelines
- 4xx errors: include actionable details for the client to fix the request
- 5xx errors: generic message, log full details server-side
- Never expose stack traces, internal IPs, or implementation details
- Rate limit errors (429): always include Retry-After header
- Validation errors: include field-level details array

### Pagination Performance
- Default page size: 20, max: 100
- Reject requests with page size > max with 422
- Cursor-based pagination is O(1) with indexed cursor
- Offset-based pagination degrades with large offsets (OFFSET 100000 is slow)
- Always return totalCount for offset, hasMore for cursor
- Consider keyset pagination for very large datasets (>1M rows)

### Response Size Optimization
- Compress responses (Brotli preferred for JSON, Gzip fallback)
- Support sparse fieldsets (`?fields=id,name,email`)
- Remove null fields from responses (omitempty/null json tags)
- Avoid deeply nested responses (>3 levels)
- Use integer enums instead of string enums where possible

## Anti-Patterns

### Anti-Pattern 1: Inconsistent Envelope
Bad: Some endpoints return `{ data: ... }`, others return raw array
Problem: Clients must handle multiple response shapes
Fix: Always use the standard envelope

### Anti-Pattern 2: HTTP 200 for Errors
Bad: `{ "success": false, "error": "Not found" }` with HTTP 200
Problem: Clients cannot use HTTP status-based error handling. Proxies treat it as success.
Fix: Always use appropriate HTTP status codes

### Anti-Pattern 3: Exposing Stack Traces
Bad: Returning `{ "error": { "stack": "Error at line 42..." } }`
Problem: Information disclosure. Attackers learn about your infrastructure.
Fix: Log stack traces server-side, return generic messages

### Anti-Pattern 4: Missing Pagination on Lists
Bad: `GET /users` returns all 1M users without pagination
Problem: Server memory exhaustion, network timeouts
Fix: Always paginate. Default limit=20, max limit=100.

### Anti-Pattern 5: Inconsistent Error Code Format
Bad: Mix of `NOT_FOUND`, `NotFound`, `not_found`, `404`
Problem: Clients cannot reliably parse error codes programmatically
Fix: Always UPPER_SNAKE_CASE: `RESOURCE_NOT_FOUND`

### Anti-Pattern 6: Sensitive Data in Error Details
Bad: `{ "details": [{ "field": "password", "reason": "Wrong password for user john@example.com" }] }`
Problem: Exposes user identity and sensitive field names
Fix: Mask sensitive fields, never reveal user existence

### Anti-Pattern 7: Pagination Without Total Count
Bad: `{ "data": [...], "pagination": { "page": 1, "limit": 20 } }`
Problem: Clients cannot render total pages or progress indicators
Fix: Always include totalCount (or hasMore for cursor-based)

## Security Considerations

### Information Disclosure Prevention
- Never include internal hostnames, IPs, or IP addresses in responses
- Sanitize error messages: "User not found" instead of "User with email x@y.com not found"
- Use consistent error messages for auth failures (don't distinguish "user not found" from "wrong password")
- Strip internal headers before responding
- Validate error message templates don't include user input

### Response Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cache-Control: no-store (for authenticated responses)
Content-Security-Policy: default-src 'none'
```

### Rate Limiting Headers
Every response should include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1700000000
Retry-After: 30  (on 429 responses only)
```

## Comparative Analysis

### Envelope vs No-Envelope
| Aspect | Envelope (wrapped) | No Envelope (raw) |
|--------|-------------------|-------------------|
| Predictability | Always predictable shape | Varies |
| Error handling | Structured | Ad-hoc |
| Client code | Uniform parsing | Per-endpoint logic |
| Over-fetching | Metadata overhead | Minimal |
| Cache efficiency | Lower (different keys) | Higher |
| Streaming | Harder | Easier |

### Offset vs Cursor vs Keyset Pagination
| Aspect | Offset | Cursor | Keyset |
|--------|--------|--------|--------|
| Stability | Unstable with inserts | Stable | Stable |
| Performance | Degrades with large offset | O(1) with index | O(1) with index |
| Random access | Supported | Not supported | Not supported |
| Implementation | Simple | Moderate | Moderate |
| Real-time feeds | Poor | Excellent | Good |
| Total count | Included | Not available | Not available |

### Problem Details (RFC 7807) vs Custom Envelope
| Aspect | RFC 7807 | Custom Envelope |
|--------|----------|-----------------|
| Standardization | RFC standard | Proprietary |
| Extensibility | Via extension members | Fully controlled |
| Tooling support | Growing | Custom |
| Simplicity | Moderate | Simple |
| Machine readability | Standard fields | Consistent shape |

## Performance Considerations

### Serialization Overhead
- JSON serialization of envelope adds ~5-10% overhead
- Use `omitempty`/`JsonIgnore(Condition.WhenWritingNull)` to skip null fields
- Pre-allocate response buffers for predictable sizes
- Use streaming serialization for large payloads

### Caching Responses
- Set appropriate `Cache-Control` headers for GET responses
- Use `ETag` and `Last-Modified` for conditional requests
- Never cache error responses or authenticated data
- Consider response caching at CDN/gateway level

### Compression
- Enable Brotli compression at API gateway for JSON responses
- Compress responses > 1KB
- Accept-Encoding: gzip, br
- Compress paginated lists (best compression ratio)

## Rules
- Every endpoint MUST return the `ApiResponse<T>` envelope. No exceptions.
- Error codes are UPPER_SNAKE_CASE, domain-prefixed.
- Never expose stack traces or internal details in error responses.
- Pagination is REQUIRED for all list endpoints returning >100 potential results.
- Request ID is generated at ingress and propagated through all logs.
- Timestamps are always ISO 8601 UTC.
- HTTP status codes must be semantically correct (201 for create, 204 for delete, etc.).
- Rate limit headers on every response.
- Validation errors return 422, not 400.
- Consistent error code format across all endpoints.
- Never return raw arrays — always wrap in envelope.
- Cache-Control: no-store for authenticated endpoints.
- Default deny: if an exception is unhandled, return 500, not a raw error.

## References
  - references/api-response-formats.md — API Response Formats
  - references/api-response-testing.md — API Response Testing
  - references/api-response-validation.md — API Response Validation
  - references/client-api-calls.md — Client API Call Patterns
  - references/error-handling-patterns.md — Error Handling Patterns Reference
  - references/response-envelope.md — Response Envelope Reference
  - references/api-response-fundamentals.md — API Response Fundamentals
  - references/api-response-advanced.md — API Response Advanced Patterns
  - references/response-compression.md — Response Compression and Optimization

## Handoff
Hand off to `backend/universal/api-design/SKILL.md` for endpoint routing and resource design. Hand off to `backend/universal/oop-principles/SKILL.md` for exception class hierarchy design.
