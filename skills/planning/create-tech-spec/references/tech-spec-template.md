# Technical Specification: {Feature Name}

## System Context
```
[External System] ↔ [Our Service] ↔ [Database]
                        ↓
                  [Message Queue] → [Worker]
```

## Data Model
### {Entity}
| Field | Type | Constraints | Default | Notes |
|-------|------|-------------|---------|-------|
| id | UUID | PK, auto | gen | |
| name | string | required, max 255 | — | |
| status | enum | active/inactive | active | |

### {Enum}: {EntityStatus}
| Value | Description |
|-------|-------------|
| active | Entity is active and visible |
| inactive | Entity is soft-deactivated |

## API Contract

### POST /api/v1/{resources}
Create a new {resource}.

**Request**:
```json
{
  "name": "string, required",
  "metadata": "object, optional"
}
```

**Response 201**:
```json
{
  "data": { "id": "uuid", "name": "string", "status": "active", "createdAt": "iso8601" },
  "meta": { "requestId": "uuid" }
}
```

**Errors**: 400 (validation), 401 (unauthorized), 409 (conflict), 422 (unprocessable)

### GET /api/v1/{resources}/{id}
Retrieve a single {resource}.

**Response 200**:
```json
{ "data": { ... }, "meta": { "requestId": "uuid" } }
```

**Errors**: 404 (not found)

### GET /api/v1/{resources}
List {resources} with pagination.

**Query Parameters**: `?page=1&limit=20&sort=-createdAt&filter[status]=active`

**Response 200**:
```json
{
  "data": [ ... ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 },
    "requestId": "uuid"
  }
}
```

## Error Handling
| Error Type | HTTP Status | Error Code | Description |
|------------|-------------|------------|-------------|
| Validation | 400 | VALIDATION_ERROR | Invalid input |
| Unauthorized | 401 | UNAUTHORIZED | Missing/invalid token |
| Forbidden | 403 | FORBIDDEN | Insufficient permissions |
| Not Found | 404 | NOT_FOUND | Resource doesn't exist |
| Conflict | 409 | CONFLICT | Resource state conflict |
| Internal | 500 | INTERNAL_ERROR | Unexpected error |

## Validation Rules
| Field | Rule | Error Message |
|-------|------|---------------|
| name | required, 1-255 chars | "Name is required and must be 1-255 characters" |
| email | valid email format | "Must be a valid email address" |

## Performance Targets
| Metric | Target | Measurement |
|--------|--------|-------------|
| P95 latency | <200ms | Request tracing |
| P99 latency | <500ms | Request tracing |
| Throughput | 1000 req/s | Load testing |
| Availability | 99.95% | Uptime monitoring |

## Testing Plan
| Layer | Scope | Tool |
|-------|-------|------|
| Unit | Domain logic, validation, error mapping | {per stack} |
| Integration | Repository, external API calls | {per stack} |
| E2E | Critical user flow | {per stack} |

## Migration Plan
1. Create new table {table_name}
2. Backfill data (if migrating from old schema)
3. Deploy new code (reads from both old and new)
4. Verify data consistency
5. Cut over writes to new schema
6. Drop old table (after 1 week observation)

**Rollback**: Run reverse migration script.
