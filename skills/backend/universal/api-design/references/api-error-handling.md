# API Error Handling

## Response Envelope

Every response uses consistent envelope:

```json
{
  "data": { ... } | null,
  "error": null | {
    "code": "ERROR_CODE",
    "message": "Human-readable summary",
    "details": [ ... ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Code Catalog

| HTTP | Code | When | Retryable |
|------|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Input fails schema validation | No |
| 400 | `MALFORMED_REQUEST` | Invalid JSON, bad encoding | No |
| 401 | `UNAUTHORIZED` | Missing/invalid credentials | No |
| 403 | `FORBIDDEN` | Authenticated but no access | No |
| 404 | `NOT_FOUND` | Resource doesn't exist | No |
| 409 | `CONFLICT` | Version mismatch, duplicate | Maybe (with fresh data) |
| 409 | `ALREADY_EXISTS` | Duplicate unique constraint | No |
| 422 | `UNPROCESSABLE_ENTITY` | Semantic validation failure | No |
| 429 | `RATE_LIMITED` | Too many requests | Yes (after backoff) |
| 500 | `INTERNAL_ERROR` | Unexpected server error | Yes |
| 502 | `BAD_GATEWAY` | Upstream failure | Yes |
| 503 | `SERVICE_UNAVAILABLE` | Overloaded, in maintenance | Yes |
| 504 | `GATEWAY_TIMEOUT` | Upstream timeout | Yes |

## Error Details

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "2 validation errors in request body",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Must be a valid email address",
        "value": "not-an-email"
      },
      {
        "field": "age",
        "code": "MINIMUM_EXCEEDED",
        "message": "Must be at least 18",
        "value": 15,
        "constraint": { "min": 18 }
      }
    ]
  }
}
```

## Debugging Headers

| Header | Purpose |
|--------|---------|
| `X-Request-Id` | Correlation ID for log tracing |
| `X-Request-Id` response header | Echo back for client debugging |
| `X-Debug-Info` | Stack trace, internal details (dev only) |
| `Retry-After` | Seconds to wait before retry (429, 503) |
| `Deprecation` | Sunset date for deprecated endpoints |
| `Sunset` | Date when deprecated endpoint removed |

## Deprecation Strategy

```text
// Sunset header for deprecated endpoints
Deprecation: true
Sunset: Sat, 30 Nov 2024 23:59:59 GMT

// Step migration:
// 1. Add Deprecation header, keep endpoint active
// 2. After 6 months, return 410 Gone
// 3. After 12 months, remove endpoint
```

## Validation Error Sources

| Source | Example |
|--------|---------|
| Missing required field | `email` not provided |
| Invalid type | `age: "old"` instead of number |
| Pattern mismatch | `phone: "+123"` too short |
| Enum violation | `status: "superadmin"` not in allowed |
| Range exceeded | `score: 1000` when max is 100 |
| Length violation | `name` > 255 characters |
| Format invalid | `date: "not-a-date"` |

## Production Error Safety

- Never expose stack traces in production responses
- Never expose internal IDs, SQL queries, or config values
- Log full error details server-side, return sanitized client response
- Use structured logging with error correlation ID
