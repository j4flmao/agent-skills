# Tech Spec Advanced Topics

## API Contract Best Practices

### Request Validation
Document validation rules for every field:
- Type (string, number, boolean, date, enum)
- Format (email, UUID, URL, date-time)
- Constraints (min, max, minLength, maxLength, pattern)
- Required/optional
- Nullable
- Default value
- Example value

### Response Envelope
Standardize response structure:
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "page": 1,
    "pageSize": 20,
    "total": 100
  },
  "errors": []
}
```

### Error Response Structure
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      {
        "field": "email",
        "code": "INVALID_FORMAT",
        "message": "Must be a valid email address"
      }
    ],
    "requestId": "uuid"
  }
}
```

### Pagination
- Page-based: `?page=1&pageSize=20` — simple, widely supported
- Cursor-based: `?cursor=abc123&limit=20` — better for real-time data
- Offset-based: `?offset=0&limit=20` — avoid for large datasets

## Data Model Considerations

### Migration Safety
- Never modify a column in a way that breaks existing readers
- Add columns as nullable, backfill, then make NOT NULL
- Use database transactions for atomic migrations
- Test migrations on a copy of production data
- Run migrations during low-traffic periods

### Index Strategy
- Index columns used in WHERE clauses
- Index columns used in ORDER BY
- Covering indexes for common queries (include all selected columns)
- Avoid over-indexing — each index slows writes
- Monitor unused indexes and remove them
- Use partial indexes for filtered queries

### Audit Fields
Every table should have:
- `created_at`: When the record was created
- `updated_at`: When the record was last modified
- `created_by`: Who created the record
- `updated_by`: Who last modified the record

### Soft Deletes
Instead of hard DELETE, use `deleted_at` timestamp. Include `WHERE deleted_at IS NULL` in all queries. Add a partial index for active records: `CREATE INDEX ... WHERE deleted_at IS NULL`.

## Performance by Pattern

### Read-Heavy Features
- Optimize queries with covering indexes
- Implement caching (application cache, Redis, CDN)
- Use read replicas for reporting queries
- Denormalize for read performance

### Write-Heavy Features
- Batch writes where possible
- Use async processing for non-critical writes
- Implement write-ahead logging
- Consider append-only data structures

### Real-Time Features
- Use WebSocket or SSE for push-based updates
- Implement polling with exponential backoff
- Consider server-sent events for one-way data flow
- Use message queues for event broadcasting

## Security Considerations by Endpoint

### Endpoint Security Checklist
- [ ] Authentication required? (public vs private endpoint)
- [ ] Authorization — which roles have access?
- [ ] Input validation — type, length, format, range
- [ ] Rate limiting — requests per minute per user/IP
- [ ] Idempotency — can the same request be safely retried?
- [ ] Data exposure — does the response leak sensitive fields?
- [ ] Injection prevention — SQL, NoSQL, command injection
- [ ] CORS — is the endpoint accessible from browsers?

## Spec Review Checklist

### Design Review
- [ ] Solution meets the requirements from PRD
- [ ] System context diagram is accurate and complete
- [ ] API contracts follow team conventions
- [ ] Data model is normalized and indexed appropriately
- [ ] Error handling covers all failure modes
- [ ] Performance targets are realistic and measurable
- [ ] Security considerations are addressed

### Migration Review
- [ ] Migration is backward-compatible
- [ ] Rollback plan exists and is tested
- [ ] Data backfill strategy is defined
- [ ] Migration can be run incrementally
- [ ] No data loss during migration

### Operations Review
- [ ] Logging and monitoring are instrumented
- [ ] Alert thresholds are defined
- [ ] Deployment order is specified
- [ ] Feature flag is available for toggling
- [ ] Rollback procedure is documented and tested

## Multi-Service Specs
When a feature spans multiple services, the spec should include:
- A sequence diagram showing service interactions
- API contracts for each service's endpoints
- Data consistency strategy (eventual vs strong consistency)
- Error propagation strategy (what happens when a downstream service fails)
- Monitoring strategy (distributed tracing, service-level metrics)
