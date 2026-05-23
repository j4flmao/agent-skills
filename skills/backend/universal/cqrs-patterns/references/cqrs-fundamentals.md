# CQRS Fundamentals

## Core Concept

CQRS (Command Query Responsibility Segregation) separates read and write operations into distinct models. Commands change state. Queries return state. A single model should never do both.

## When to Apply CQRS

| Apply CQRS | Do NOT Apply CQRS |
|------------|-------------------|
| Read/write shapes differ significantly | Simple CRUD (create, read, update, delete) |
| Complex business logic on write side | Single model serves both read and write well |
| Multiple different read representations | Low query complexity |
| High read-to-write ratio | Fewer than 3 distinct query types |
| Need to optimize read/write independently | Team unfamiliar with eventual consistency |

## Common Pitfalls

1. **Over-engineering**: CQRS adds complexity. Use it only when the read and write shapes are genuinely different.
2. **Shared models**: Using the same DTO for both command input and query output. They are separate concerns.
3. **Not separating storage**: If using separate models but the same table, you get none of the optimization benefits.
4. **Ignoring eventual consistency**: Read models lag behind write models. Design UI to handle stale data.
5. **CQRS without event sourcing**: CQRS works perfectly with traditional persistence. Event sourcing is optional.

## Implementation Patterns

### Same Database, Different Models
```
Write: domain entities with behavior, validation, invariants
Read: flat DTOs, joins, aggregations, denormalized views
DB: same database, different tables/views for read models
```

### Separate Databases
```
Write DB: normalized, transactional (PostgreSQL, MySQL)
Read DB: denormalized, indexed for query patterns (Elasticsearch, Redis, DynamoDB)
Sync: event-driven projection updates (see transactional-outbox skill)
```

## Query Optimization Techniques

- Materialized views refreshed on write.
- Elasticsearch indexes for full-text search.
- Redis/Memcached for hot query results.
- Read-only replicas for reporting queries.
- Database views for simple denormalization.

## Testing Strategy

- Command tests: verify state changes, invariant enforcement, event emission.
- Query tests: verify correct data returned, proper filtering/sorting/pagination.
- Projection tests: verify read model updates correctly when events arrive.
