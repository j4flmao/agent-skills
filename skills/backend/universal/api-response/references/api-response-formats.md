# API Response Formats

## Standard Envelope

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-03-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Email must contain @ symbol"
      }
    ]
  },
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2025-03-15T10:30:00Z"
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "totalPages": 5,
    "totalItems": 98,
    "nextCursor": "eyJpZCI6IDQyfQ==",
    "prevCursor": null
  }
}
```

## Format Variants

### RESTful JSON
- Most common for web APIs
- Clear separation of success/error
- Metadata in envelope, not response body
- Standard HTTP status codes

### JSON:API
```json
{
  "data": {
    "type": "users",
    "id": "123",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "relationships": {
      "orders": {
        "links": {
          "related": "/users/123/orders"
        }
      }
    }
  },
  "included": [ ... ]
}
```

### GraphQL
- Single endpoint with flexible queries
- Errors array alongside data
- Extensions for custom metadata
- No envelope — response shape matches query

## Error Code Categories

### HTTP Status Mapping
| Code Range | Type | Example |
|------------|------|---------|
| 4xx | Client error | VALIDATION_ERROR, NOT_FOUND |
| 5xx | Server error | INTERNAL_ERROR, TIMEOUT |
| 429 | Rate limit | RATE_LIMIT_EXCEEDED |

### Domain Error Codes
- Prefixed by domain: `AUTH_INVALID_TOKEN`, `ORDER_NOT_FOUND`
- Consistent naming: `{DOMAIN}_{ERROR_TYPE}`
- Documented in OpenAPI specification
- Include remediation hints in development

## Versioning

### URL Versioning
```
/api/v1/users
/api/v2/users
```

### Header Versioning
```
Accept: application/vnd.api+json;version=2
```

### Query Parameter Versioning
```
/api/users?version=2
```

## Compliance Patterns

### Idempotency
- Mutation endpoints support idempotency keys
- Return existing response on duplicate requests
- Key expires after configurable TTL
- Include in response for client reference
