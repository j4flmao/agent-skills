---
name: api-response
description: >
  Use this skill when designing API response contracts — Response<T>, exception handling, error codes, pagination envelopes, standardized payload contracts. This skill enforces: uniform ApiResponse<T> envelope, UPPER_SNAKE_CASE error codes, pagination for list endpoints, ISO 8601 UTC timestamps. Do NOT use for: endpoint routing design, database schema, authentication flows.
version: "1.0.0"
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
Define and enforce a universal API response contract with standardized envelopes, error codes, and pagination.

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
- Response envelope structure (`Response<T>` with status, data, error, metadata)
- Error response format (error code, message, details, trace ID)
- Exception handling strategy (global handler, middleware, filter)
- Pagination envelope (page, pageSize, totalCount, totalPages)
- Validation error format (field-level errors)
- Success response rules (HTTP status codes per operation)

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick. If response format already standardized, output `API response standard already defined at: [path].` and stop.

### Completion Criteria
- Envelope structure defined for success, error, validation, pagination
- Exception-to-response mapping defined for all common exception types
- HTTP status code mapping defined per operation type
- Pagination contract defined with required/optional fields

### Max Response Length
4096 tokens

## Workflow

### Step 1: Define Response Envelope

**Standard `Response<T>`** — Every API response MUST follow this envelope:

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

### Step 3: Define Pagination Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
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

### Step 4: Map HTTP Status Codes

| Operation | Success | Validation Error | Not Found | Conflict | Server Error |
|---|---|---|---|---|---|
| GET (single) | 200 | — | 404 | — | 500 |
| GET (list) | 200 | — | 200 (empty array) | — | 500 |
| POST (create) | 201 | 422 | 404 (parent ref) | 409 | 500 |
| PUT (update) | 200 | 422 | 404 | 409 | 500 |
| PATCH (partial) | 200 | 422 | 404 | 409 | 500 |
| DELETE | 204 | — | 404 | 409 | 500 |

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

### Step 6: Apply Error Code Naming Convention
`{DOMAIN}_{ERROR}` in UPPER_SNAKE_CASE:
- `ORDER_NOT_FOUND` — specific resource
- `PAYMENT_DECLINED` — business logic failure
- `VALIDATION_ERROR` — general validation
- `INSUFFICIENT_FUNDS` — business validation
- `DUPLICATE_ENTRY` — uniqueness violation

### Step 7: Implement Global Exception Handler

**.NET global exception filter/middleware**
```csharp
public class GlobalExceptionHandler : IMiddleware
{
  public async Task InvokeAsync(HttpContext context, RequestDelegate next)
  {
    try { await next(context); }
    catch (NotFoundException ex) { await WriteResponse(context, 404, "NOT_FOUND", ex); }
    catch (ValidationException ex) { await WriteResponse(context, 422, "VALIDATION_ERROR", ex); }
    catch (Exception ex) { await WriteResponse(context, 500, "INTERNAL_ERROR", ex); }
  }
}
```

**FastAPI exception handler**
```python
@app.exception_handler(NotFoundException)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "data": None, "error": {"code": "NOT_FOUND", "message": str(exc)}}
    )
```

## Rules
- Every endpoint MUST return the `ApiResponse<T>` envelope. No exceptions.
- Error codes are UPPER_SNAKE_CASE, domain-prefixed.
- Never expose stack traces or internal details in error responses.
- Pagination is REQUIRED for all list endpoints returning >100 potential results.
- Request ID is generated at ingress and propagated through all logs.
- Timestamps are always ISO 8601 UTC.

## References
  - references/api-response-formats.md — API Response Formats
  - references/api-response-testing.md — API Response Testing
  - references/api-response-validation.md — API Response Validation
  - references/client-api-calls.md — Client API Call Patterns
  - references/error-handling-patterns.md — Error Handling Patterns Reference
  - references/response-envelope.md — Response Envelope Reference
## Handoff
Hand off to `backend/universal/api-design/SKILL.md` for endpoint routing and resource design. Hand off to `backend/universal/oop-principles/SKILL.md` for exception class hierarchy design.
