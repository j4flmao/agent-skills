# API Response Fundamentals

## Response Structure

Every API response needs consistent structure, status codes, and error representation.

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE, or PUT with no body |
| 301 | Moved Permanently | Resource relocated |
| 400 | Bad Request | Malformed request, validation failure |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource state conflict (duplicate, stale version) |
| 422 | Unprocessable Entity | Semantic validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service failure |
| 503 | Service Unavailable | Temporary overload or maintenance |
| 504 | Gateway Timeout | Upstream service timeout |

## Response Envelope

### JSON:API Envelope
```json
{
  "data": { ... },
  "meta": {
    "requestId": "req-abc-123",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request was malformed",
    "details": [
      { "field": "email", "reason": "must be a valid email address" }
    ],
    "requestId": "req-abc-123"
  }
}
```

## Pagination

### Cursor-Based (preferred for lists)
```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6MX0=",
    "hasMore": true
  }
}
```

### Offset-Based
```json
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 142
  }
}
```

## Field Selection

Let clients request specific fields:
```
GET /users/123?fields=id,name,email
```

Response: only requested fields returned.

## Response Headers

```
Content-Type: application/json
Cache-Control: max-age=300, private
X-Request-Id: req-abc-123
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
```

## Common Anti-Patterns

- Returning 200 with error body (should use appropriate 4xx/5xx)
- Mixing envelope styles across endpoints
- Returning raw database errors to clients
- No request tracking ID in responses
- Inconsistent date/time formats
